// balldontlie API client — auth, localStorage caching (10 min TTL), 429 backoff.
const BASE = 'https://api.balldontlie.io/v1'
const KEY = import.meta.env.VITE_BALLDONTLIE_KEY || ''
const TTL_MS = 10 * 60 * 1000
const CACHE_PREFIX = 'statlyne:cache:'

function cacheGet(url) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url)
    if (!raw) return null
    const { t, data } = JSON.parse(raw)
    if (Date.now() - t > TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + url)
      return null
    }
    return data
  } catch {
    return null
  }
}

function cacheSet(url, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ t: Date.now(), data }))
  } catch {
    // localStorage full — evict our cache entries and move on
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message || `API error ${status}`)
    this.status = status
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * GET a v1 endpoint. `path` like '/players', params as object.
 * Cached per-URL for 10 minutes. Retries once on 429 (free tier: 5 req/min).
 */
export async function api(path, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => qs.append(`${k}[]`, x))
    else qs.set(k, v)
  }
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ''}`

  const cached = cacheGet(url)
  if (cached) return cached

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { Authorization: KEY } })
    if (res.status === 429 && attempt === 0) {
      await sleep(15000)
      continue
    }
    if (!res.ok) throw new ApiError(res.status)
    const json = await res.json()
    cacheSet(url, json)
    return json
  }
  throw new ApiError(429)
}
