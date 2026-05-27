import PQueue from 'p-queue'

const userAgent = process.env.INGEST_USER_AGENT ?? 'pieces-ci-ingest/0.1'
const intervalMs = Number(process.env.INGEST_RATE_LIMIT_MS ?? 2000)

const queue = new PQueue({ interval: intervalMs, intervalCap: 1, concurrency: 1 })

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  return queue.add(async () => {
    const res = await fetch(url, {
      ...init,
      headers: { 'user-agent': userAgent, ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.text()
  }, { throwOnTimeout: true }) as Promise<string>
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return queue.add(async () => {
    const res = await fetch(url, {
      ...init,
      headers: { 'user-agent': userAgent, accept: 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.json() as Promise<T>
  }, { throwOnTimeout: true }) as Promise<T>
}
