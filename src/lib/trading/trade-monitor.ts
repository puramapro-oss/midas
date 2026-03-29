// =============================================================================
// MIDAS — Trade Monitor
// Monitor open positions: SL/TP, trailing stop, breakeven, emergency close
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';

interface MonitoredPosition {
  id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  current_price: number;
  quantity: number;
  stop_loss: number | null;
  take_profit: number | null;
  trailing_stop_pct: number | null;
  trailing_stop_highest: number | null;
  trailing_stop_lowest: number | null;
  breakeven_activated: boolean;
  leverage: number;
  is_paper: boolean;
  status: string;
  created_at: string;
}

interface MonitorAction {
  position_id: string;
  action: 'close_sl' | 'close_tp' | 'close_trailing' | 'move_breakeven' | 'close_emergency' | 'update_trailing';
  reason: string;
  new_stop_loss: number | null;
  close_price: number | null;
}

interface MonitorResult {
  positions_checked: number;
  actions_taken: MonitorAction[];
  errors: string[];
}

export async function monitorPositions(userId: string): Promise<MonitorResult> {
  const supabase = createServiceClient();
  const actions: MonitorAction[] = [];
  const errors: string[] = [];

  // Fetch all open positions for user
  const { data: positions, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open');

  if (error) {
    return { positions_checked: 0, actions_taken: [], errors: [error.message] };
  }

  const openPositions: MonitoredPosition[] = (positions ?? []).map(mapToMonitoredPosition);

  for (const position of openPositions) {
    try {
      const positionActions = await checkPosition(position, supabase);
      actions.push(...positionActions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown monitor error';
      errors.push(`Position ${position.id}: ${msg}`);
    }
  }

  return {
    positions_checked: openPositions.length,
    actions_taken: actions,
    errors,
  };
}

async function checkPosition(
  position: MonitoredPosition,
  supabase: ReturnType<typeof createServiceClient>
): Promise<MonitorAction[]> {
  const actions: MonitorAction[] = [];
  const price = position.current_price;

  // 1. Check stop loss hit
  if (position.stop_loss !== null && position.stop_loss > 0) {
    const slHit =
      position.side === 'buy'
        ? price <= position.stop_loss
        : price >= position.stop_loss;

    if (slHit) {
      await closePosition(supabase, position, position.stop_loss, 'stop_loss');
      actions.push({
        position_id: position.id,
        action: 'close_sl',
        reason: `Stop loss hit at ${position.stop_loss}`,
        new_stop_loss: null,
        close_price: position.stop_loss,
      });
      return actions; // Position closed, no more checks
    }
  }

  // 2. Check take profit hit
  if (position.take_profit !== null && position.take_profit > 0) {
    const tpHit =
      position.side === 'buy'
        ? price >= position.take_profit
        : price <= position.take_profit;

    if (tpHit) {
      await closePosition(supabase, position, position.take_profit, 'take_profit');
      actions.push({
        position_id: position.id,
        action: 'close_tp',
        reason: `Take profit hit at ${position.take_profit}`,
        new_stop_loss: null,
        close_price: position.take_profit,
      });
      return actions;
    }
  }

  // 3. Trailing stop logic
  if (position.trailing_stop_pct !== null && position.trailing_stop_pct > 0) {
    const trailingAction = await handleTrailingStop(position, supabase);
    if (trailingAction) {
      actions.push(trailingAction);
      if (trailingAction.action === 'close_trailing') {
        return actions;
      }
    }
  }

  // 4. Breakeven move: if position is up >= 1.5x risk, move SL to entry
  if (!position.breakeven_activated && position.stop_loss !== null) {
    const riskDistance = Math.abs(position.entry_price - position.stop_loss);
    const currentProfit =
      position.side === 'buy'
        ? price - position.entry_price
        : position.entry_price - price;

    if (currentProfit >= riskDistance * 1.5) {
      const newSL = position.entry_price;
      await supabase
        .from('trades')
        .update({
          stop_loss: newSL,
          breakeven_activated: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      actions.push({
        position_id: position.id,
        action: 'move_breakeven',
        reason: `Profit >= 1.5x risk — stop loss moved to breakeven at ${newSL}`,
        new_stop_loss: newSL,
        close_price: null,
      });
    }
  }

  return actions;
}

async function handleTrailingStop(
  position: MonitoredPosition,
  supabase: ReturnType<typeof createServiceClient>
): Promise<MonitorAction | null> {
  const price = position.current_price;
  const trailPct = position.trailing_stop_pct ?? 0;

  if (position.side === 'buy') {
    const highest = Math.max(position.trailing_stop_highest ?? price, price);
    const trailingLevel = highest * (1 - trailPct / 100);

    // Update the highest price tracker
    if (price > (position.trailing_stop_highest ?? 0)) {
      await supabase
        .from('trades')
        .update({
          trailing_stop_highest: price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);
    }

    // Check if trailing stop hit
    if (price <= trailingLevel && highest > position.entry_price) {
      await closePosition(supabase, position, price, 'trailing_stop');
      return {
        position_id: position.id,
        action: 'close_trailing',
        reason: `Trailing stop hit: price ${price} fell below trail level ${trailingLevel.toFixed(2)} (peak: ${highest})`,
        new_stop_loss: null,
        close_price: price,
      };
    }

    // Update trailing stop level if moved up
    if (trailingLevel > (position.stop_loss ?? 0)) {
      await supabase
        .from('trades')
        .update({
          stop_loss: trailingLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      return {
        position_id: position.id,
        action: 'update_trailing',
        reason: `Trailing stop raised to ${trailingLevel.toFixed(2)}`,
        new_stop_loss: trailingLevel,
        close_price: null,
      };
    }
  } else {
    // Sell/short position: track lowest price
    const lowest = Math.min(position.trailing_stop_lowest ?? price, price);
    const trailingLevel = lowest * (1 + trailPct / 100);

    if (price < (position.trailing_stop_lowest ?? Infinity)) {
      await supabase
        .from('trades')
        .update({
          trailing_stop_lowest: price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);
    }

    if (price >= trailingLevel && lowest < position.entry_price) {
      await closePosition(supabase, position, price, 'trailing_stop');
      return {
        position_id: position.id,
        action: 'close_trailing',
        reason: `Trailing stop hit: price ${price} rose above trail level ${trailingLevel.toFixed(2)} (trough: ${lowest})`,
        new_stop_loss: null,
        close_price: price,
      };
    }

    if (position.stop_loss === null || trailingLevel < position.stop_loss) {
      await supabase
        .from('trades')
        .update({
          stop_loss: trailingLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      return {
        position_id: position.id,
        action: 'update_trailing',
        reason: `Trailing stop lowered to ${trailingLevel.toFixed(2)}`,
        new_stop_loss: trailingLevel,
        close_price: null,
      };
    }
  }

  return null;
}

async function closePosition(
  supabase: ReturnType<typeof createServiceClient>,
  position: MonitoredPosition,
  closePrice: number,
  exitReason: string
): Promise<void> {
  const pnl =
    position.side === 'buy'
      ? (closePrice - position.entry_price) * position.quantity
      : (position.entry_price - closePrice) * position.quantity;

  const pnlPct =
    position.entry_price > 0
      ? ((closePrice - position.entry_price) / position.entry_price) *
        100 *
        (position.side === 'buy' ? 1 : -1)
      : 0;

  await supabase
    .from('trades')
    .update({
      status: 'closed',
      exit_price: closePrice,
      pnl,
      pnl_pct: pnlPct,
      exit_reason: exitReason,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', position.id);
}

function mapToMonitoredPosition(row: Record<string, unknown>): MonitoredPosition {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    symbol: row.symbol as string,
    side: row.side as 'buy' | 'sell',
    entry_price: Number(row.entry_price ?? 0),
    current_price: Number(row.current_price ?? row.entry_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    stop_loss: row.stop_loss !== null ? Number(row.stop_loss) : null,
    take_profit: row.take_profit !== null ? Number(row.take_profit) : null,
    trailing_stop_pct: row.trailing_stop_pct !== null ? Number(row.trailing_stop_pct) : null,
    trailing_stop_highest: row.trailing_stop_highest !== null ? Number(row.trailing_stop_highest) : null,
    trailing_stop_lowest: row.trailing_stop_lowest !== null ? Number(row.trailing_stop_lowest) : null,
    breakeven_activated: Boolean(row.breakeven_activated ?? false),
    leverage: Number(row.leverage ?? 1),
    is_paper: Boolean(row.is_paper ?? false),
    status: row.status as string,
    created_at: row.created_at as string,
  };
}
