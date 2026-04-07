const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { getCollection, setCollection } = require('./data-store')

const COOKIE_NAME = 'lastars_session'
const DEFAULT_MAX_AGE_DAYS = 30
const ACCOUNTS_FILE = path.join(__dirname, '..', 'site-accounts.json')

const safeString = value => String(value || '').trim()

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex')

const normalizeAccounts = input => {
  if (!Array.isArray(input)) return []

  return input
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      username: safeString(item.username),
      passwordHash: safeString(item.passwordHash),
      active: item.active !== false
    }))
    .filter(item => item.username && item.passwordHash)
}

const readSeedAccounts = () => {
  if (process.env.LASTARS_SITE_ACCOUNTS) {
    try {
      return normalizeAccounts(JSON.parse(process.env.LASTARS_SITE_ACCOUNTS))
    } catch (error) {
      console.warn('Failed to parse LASTARS_SITE_ACCOUNTS:', error.message)
      return []
    }
  }

  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf8')
    return normalizeAccounts(JSON.parse(raw))
  } catch (error) {
    return []
  }
}

const readIssuedAccounts = async () => normalizeAccounts(await getCollection('issuedAccounts', []))

const readAccounts = async () => {
  const merged = new Map()

  readSeedAccounts().forEach(account => {
    merged.set(account.username, account)
  })

  ;(await readIssuedAccounts()).forEach(account => {
    merged.set(account.username, account)
  })

  return Array.from(merged.values())
}

const findAccount = async username => {
  const normalizedUsername = safeString(username)

  if (!normalizedUsername) return null

  return (await readAccounts()).find(account => account.username === normalizedUsername && account.active) || null
}

const verifyPassword = (account, password) => {
  if (!account || !account.passwordHash) return false

  const [salt, storedHash] = account.passwordHash.split(':')

  if (!salt || !storedHash) return false

  const derivedHash = hashPassword(password, salt)
  return timingSafeEqual(derivedHash, storedHash)
}

const buildFallbackSecret = () => {
  let accountFingerprint = ''

  try {
    accountFingerprint = fs.readFileSync(ACCOUNTS_FILE, 'utf8')
  } catch (error) {
    accountFingerprint = 'lastars-no-accounts'
  }

  return crypto
    .createHash('sha256')
    .update([
      process.cwd(),
      process.env.VERCEL_PROJECT_PRODUCTION_URL || '',
      process.env.VERCEL_GIT_COMMIT_SHA || '',
      accountFingerprint
    ].join('|'))
    .digest('hex')
}

const getSecret = () => process.env.LASTARS_AUTH_SECRET || process.env.AUTH_SECRET || buildFallbackSecret()

const upsertIssuedAccount = async account => {
  const accounts = await readIssuedAccounts()

  const index = accounts.findIndex(item => item.username === account.username)

  if (index >= 0) {
    accounts[index] = {
      ...accounts[index],
      ...account
    }
  } else {
    accounts.push(account)
  }

  await setCollection('issuedAccounts', accounts)
}

const getSessionFromRequest = req => {
  const cookies = parseCookies(req.headers.cookie)
  return verifySession(cookies[COOKIE_NAME])
}

const requireAdmin = (req, res) => {
  const session = getSessionFromRequest(req)

  if (!session || session.username !== 'admin') {
    res.statusCode = 403
    res.end(JSON.stringify({ message: 'Admin access required' }))
    return null
  }

  return session
}

const createSignature = payload => crypto
  .createHmac('sha256', getSecret())
  .update(payload)
  .digest('base64url')

const serializeSession = username => {
  const maxAgeMs = DEFAULT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({
    u: safeString(username),
    exp: Date.now() + maxAgeMs
  })).toString('base64url')
  const signature = createSignature(payload)

  return `${payload}.${signature}`
}

const verifySession = token => {
  if (!token || typeof token !== 'string') return null

  const [payload, signature] = token.split('.')

  if (!payload || !signature) return null
  if (!timingSafeEqual(createSignature(payload), signature)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

    if (!parsed || !parsed.u || !parsed.exp || parsed.exp < Date.now()) return null

    return {
      username: safeString(parsed.u)
    }
  } catch (error) {
    return null
  }
}

const parseCookies = header => {
  return String(header || '')
    .split(';')
    .map(segment => segment.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const divider = entry.indexOf('=')

      if (divider === -1) return cookies

      const key = entry.slice(0, divider).trim()
      const value = entry.slice(divider + 1).trim()
      cookies[key] = decodeURIComponent(value)
      return cookies
    }, {})
}

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.secure) parts.push('Secure')

  return parts.join('; ')
}

const buildSessionCookie = username => {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const maxAgeSeconds = DEFAULT_MAX_AGE_DAYS * 24 * 60 * 60

  return serializeCookie(COOKIE_NAME, serializeSession(username), {
    maxAge: maxAgeSeconds,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecure
  })
}

const clearSessionCookie = () => {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  return serializeCookie(COOKIE_NAME, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecure
  })
}

module.exports = {
  COOKIE_NAME,
  buildSessionCookie,
  clearSessionCookie,
  findAccount,
  getSessionFromRequest,
  hashPassword,
  parseCookies,
  readIssuedAccounts,
  readAccounts,
  readSeedAccounts,
  requireAdmin,
  upsertIssuedAccount,
  verifyPassword,
  verifySession
}
