export interface PublicServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  latency?: number
}

export function summarizeStatusServices(services: PublicServiceStatus[], loading: boolean) {
  // A confirmed outage stays visible even beside unknown services or a refresh.
  if (services.some(service => service.status === 'down')) return 'down'
  if (loading) return 'checking'
  if (services.some(service => service.status === 'degraded')) return 'degraded'
  if (services.length === 0 || services.some(service => service.status === 'unknown')) return 'unknown'
  return 'operational'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Parse the public status contract without inventing checks for other services. */
export function parseStatusServices(payload: unknown): PublicServiceStatus[] {
  if (!isRecord(payload) || !isRecord(payload.services) || Object.keys(payload.services).length === 0) {
    return [{ name: 'API', status: 'unknown' }]
  }

  return Object.entries(payload.services).map(([name, info]) => {
    // The current API uses strings; retain the earlier object form for compatibility.
    const rawStatus = isRecord(info) ? info.status : info
    const status: PublicServiceStatus['status'] = rawStatus === 'operational' || rawStatus === 'ok'
      ? 'operational'
      : rawStatus === 'degraded' || rawStatus === 'down' ? rawStatus : 'unknown'
    const latency = isRecord(info) ? info.latency : undefined
    return {
      name: name === 'public_market_data' ? 'Données de marché publiques' : name.charAt(0).toUpperCase() + name.slice(1),
      status,
      ...(typeof latency === 'number' && Number.isFinite(latency) && latency >= 0 ? { latency } : {}),
    }
  })
}
