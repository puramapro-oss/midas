/**
 * Binance Advanced Data — Futures, Liquidations, Order Book profond
 * APIs GRATUITES que les concurrents n'exploitent pas
 */

const BINANCE_BASE = 'https://api.binance.com'
const BINANCE_FAPI = 'https://fapi.binance.com'

interface OpenInterest {
  symbol: string
  openInterest: number
  time: number
}

interface FundingRate {
  symbol: string
  fundingRate: number
  fundingTime: number
  markPrice: number
}

interface LongShortRatio {
  symbol: string
  longShortRatio: number
  longAccount: number
  shortAccount: number
  timestamp: number
}

interface OrderBookWall {
  price: number
  quantity: number
  total: number
  type: 'bid' | 'ask'
}

interface WhaleTransaction {
  price: number
  quantity: number
  quoteQty: number
  time: number
  isBuyerMaker: boolean
}

interface Ticker24h {
  symbol: string
  priceChange: number
  priceChangePercent: number
  lastPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  count: number
}

export interface BinanceAdvancedData {
  openInterest: OpenInterest | null
  fundingRate: FundingRate | null
  topLongShortRatio: LongShortRatio | null
  takerRatio: LongShortRatio | null
  globalRatio: LongShortRatio | null
  orderBookWalls: { bids: OrderBookWall[]; asks: OrderBookWall[] }
  whaleTransactions: WhaleTransaction[]
  ticker24h: Ticker24h | null
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

function pairToSymbol(pair: string): string {
  return pair.replace('/', '').toUpperCase()
}

/** Open Interest — argent engage sur futures */
export async function getOpenInterest(pair: string): Promise<OpenInterest | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<{ symbol: string; openInterest: string; time: number }>(
    `${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${symbol}`
  )
  if (!data) return null
  return {
    symbol: data.symbol,
    openInterest: parseFloat(data.openInterest),
    time: data.time,
  }
}

/** Funding Rate — sentiment du marche futures */
export async function getFundingRate(pair: string): Promise<FundingRate | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<Array<{ symbol: string; fundingRate: string; fundingTime: number; markPrice: string }>>(
    `${BINANCE_FAPI}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
  )
  if (!data?.[0]) return null
  return {
    symbol: data[0].symbol,
    fundingRate: parseFloat(data[0].fundingRate),
    fundingTime: data[0].fundingTime,
    markPrice: parseFloat(data[0].markPrice),
  }
}

/** Ratio Long/Short des top traders */
export async function getTopLongShortRatio(pair: string): Promise<LongShortRatio | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<Array<{ symbol: string; longShortRatio: string; longAccount: string; shortAccount: string; timestamp: number }>>(
    `${BINANCE_FAPI}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=1`
  )
  if (!data?.[0]) return null
  return {
    symbol: data[0].symbol,
    longShortRatio: parseFloat(data[0].longShortRatio),
    longAccount: parseFloat(data[0].longAccount),
    shortAccount: parseFloat(data[0].shortAccount),
    timestamp: data[0].timestamp,
  }
}

/** Ratio acheteurs/vendeurs agressifs (taker) */
export async function getTakerRatio(pair: string): Promise<LongShortRatio | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<Array<{ buySellRatio: string; buyVol: string; sellVol: string; timestamp: number }>>(
    `${BINANCE_FAPI}/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=1`
  )
  if (!data?.[0]) return null
  return {
    symbol,
    longShortRatio: parseFloat(data[0].buySellRatio),
    longAccount: parseFloat(data[0].buyVol),
    shortAccount: parseFloat(data[0].sellVol),
    timestamp: data[0].timestamp,
  }
}

/** Ratio global long/short retail */
export async function getGlobalRatio(pair: string): Promise<LongShortRatio | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<Array<{ symbol: string; longShortRatio: string; longAccount: string; shortAccount: string; timestamp: number }>>(
    `${BINANCE_FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`
  )
  if (!data?.[0]) return null
  return {
    symbol: data[0].symbol,
    longShortRatio: parseFloat(data[0].longShortRatio),
    longAccount: parseFloat(data[0].longAccount),
    shortAccount: parseFloat(data[0].shortAccount),
    timestamp: data[0].timestamp,
  }
}

/** Order Book profond — detecte les murs d'achat/vente */
export async function getOrderBookWalls(
  pair: string,
  limit = 1000,
  minWallSize = 50,
): Promise<{ bids: OrderBookWall[]; asks: OrderBookWall[] }> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<{ bids: [string, string][]; asks: [string, string][] }>(
    `${BINANCE_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`
  )
  if (!data) return { bids: [], asks: [] }

  const processOrders = (orders: [string, string][], type: 'bid' | 'ask'): OrderBookWall[] => {
    return orders
      .map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
        total: parseFloat(price) * parseFloat(qty),
        type,
      }))
      .filter((o) => o.total >= minWallSize * 1000)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }

  return {
    bids: processOrders(data.bids, 'bid'),
    asks: processOrders(data.asks, 'ask'),
  }
}

/** Trades recents gros volume — mouvements de whales (>$100K) */
export async function getWhaleTransactions(
  pair: string,
  minUsdValue = 100000,
): Promise<WhaleTransaction[]> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<Array<{ p: string; q: string; T: number; m: boolean }>>(
    `${BINANCE_BASE}/api/v3/aggTrades?symbol=${symbol}&limit=500`
  )
  if (!data) return []

  return data
    .map((t) => ({
      price: parseFloat(t.p),
      quantity: parseFloat(t.q),
      quoteQty: parseFloat(t.p) * parseFloat(t.q),
      time: t.T,
      isBuyerMaker: t.m,
    }))
    .filter((t) => t.quoteQty >= minUsdValue)
    .sort((a, b) => b.quoteQty - a.quoteQty)
}

/** Statistiques 24H */
export async function getTicker24h(pair: string): Promise<Ticker24h | null> {
  const symbol = pairToSymbol(pair)
  const data = await safeFetch<{
    symbol: string
    priceChange: string
    priceChangePercent: string
    lastPrice: string
    highPrice: string
    lowPrice: string
    volume: string
    quoteVolume: string
    count: number
  }>(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`)
  if (!data) return null
  return {
    symbol: data.symbol,
    priceChange: parseFloat(data.priceChange),
    priceChangePercent: parseFloat(data.priceChangePercent),
    lastPrice: parseFloat(data.lastPrice),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
    quoteVolume: parseFloat(data.quoteVolume),
    count: data.count,
  }
}

/** Recupere TOUTES les donnees avancees pour une paire */
export async function getAdvancedData(pair: string): Promise<BinanceAdvancedData> {
  const [openInterest, fundingRate, topLongShortRatio, takerRatio, globalRatio, orderBookWalls, whaleTransactions, ticker24h] =
    await Promise.all([
      getOpenInterest(pair),
      getFundingRate(pair),
      getTopLongShortRatio(pair),
      getTakerRatio(pair),
      getGlobalRatio(pair),
      getOrderBookWalls(pair),
      getWhaleTransactions(pair),
      getTicker24h(pair),
    ])

  return {
    openInterest,
    fundingRate,
    topLongShortRatio,
    takerRatio,
    globalRatio,
    orderBookWalls,
    whaleTransactions,
    ticker24h,
  }
}

/** Analyse le sentiment des futures pour determiner la direction */
export function analyzeFuturesSentiment(data: BinanceAdvancedData): {
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  // Funding rate analysis
  if (data.fundingRate) {
    if (data.fundingRate.fundingRate > 0.001) {
      score -= 1
      reasons.push('Funding rate eleve — marche trop bullish (danger)')
    } else if (data.fundingRate.fundingRate < -0.0005) {
      score += 1
      reasons.push('Funding rate negatif — opportunite d\'achat')
    }
  }

  // Long/Short ratio top traders
  if (data.topLongShortRatio) {
    if (data.topLongShortRatio.longAccount > 0.65) {
      score += 1
      reasons.push(`${(data.topLongShortRatio.longAccount * 100).toFixed(0)}% des top traders sont long`)
    } else if (data.topLongShortRatio.shortAccount > 0.65) {
      score -= 1
      reasons.push(`${(data.topLongShortRatio.shortAccount * 100).toFixed(0)}% des top traders sont short`)
    }
  }

  // Global retail ratio (contrarian)
  if (data.globalRatio) {
    if (data.globalRatio.longAccount > 0.7) {
      score -= 0.5
      reasons.push('Retail massivement long — signal contrarian bearish')
    } else if (data.globalRatio.shortAccount > 0.7) {
      score += 0.5
      reasons.push('Retail massivement short — signal contrarian bullish')
    }
  }

  // Whale activity
  if (data.whaleTransactions.length > 0) {
    const buyWhales = data.whaleTransactions.filter((t) => !t.isBuyerMaker)
    const sellWhales = data.whaleTransactions.filter((t) => t.isBuyerMaker)
    const buyVolume = buyWhales.reduce((s, t) => s + t.quoteQty, 0)
    const sellVolume = sellWhales.reduce((s, t) => s + t.quoteQty, 0)

    if (buyVolume > sellVolume * 1.5) {
      score += 1
      reasons.push('Accumulation whale detectee')
    } else if (sellVolume > buyVolume * 1.5) {
      score -= 1
      reasons.push('Distribution whale detectee')
    }
  }

  // Order book walls
  const { bids, asks } = data.orderBookWalls
  const totalBidWalls = bids.reduce((s, b) => s + b.total, 0)
  const totalAskWalls = asks.reduce((s, a) => s + a.total, 0)

  if (totalBidWalls > totalAskWalls * 2) {
    score += 0.5
    reasons.push('Murs d\'achat massifs — support fort')
  } else if (totalAskWalls > totalBidWalls * 2) {
    score -= 0.5
    reasons.push('Murs de vente massifs — resistance forte')
  }

  const confidence = Math.min(Math.abs(score) * 20, 100)

  return {
    signal: score > 0.5 ? 'BULLISH' : score < -0.5 ? 'BEARISH' : 'NEUTRAL',
    confidence: Math.round(confidence),
    reasons,
  }
}
