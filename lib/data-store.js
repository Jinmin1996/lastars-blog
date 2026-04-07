const fs = require('fs')
const path = require('path')

let Redis = null

try {
  ({ Redis } = require('@upstash/redis'))
} catch (error) {
  Redis = null
}

const ROOT = path.join(__dirname, '..')
const KEY_PREFIX = 'lastars'
const LOCAL_FILES = {
  purchases: path.join(ROOT, 'site-purchases.json'),
  subscribers: path.join(ROOT, 'site-subscribers.json'),
  newsletterLog: path.join(ROOT, 'site-newsletter-log.json'),
  issuedAccounts: path.join(ROOT, 'site-issued-accounts.json')
}

const getRemoteCredentials = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token) return null

  return { url, token }
}

const createRemoteStore = () => {
  const credentials = getRemoteCredentials()

  if (!Redis || !credentials) return null

  return new Redis(credentials)
}

const remoteStore = createRemoteStore()
const hasRemoteStore = () => Boolean(remoteStore)

const getLocalFile = name => {
  const file = LOCAL_FILES[name]

  if (!file) {
    throw new Error(`Unknown local collection: ${name}`)
  }

  return file
}

const readLocal = (name, fallback) => {
  try {
    const file = getLocalFile(name)
    const raw = fs.readFileSync(file, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    return fallback
  }
}

const writeLocal = (name, value) => {
  const file = getLocalFile(name)
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const getCollection = async (name, fallback = []) => {
  if (hasRemoteStore()) {
    const remoteValue = await remoteStore.get(`${KEY_PREFIX}:${name}`)
    return remoteValue ?? fallback
  }

  return readLocal(name, fallback)
}

const setCollection = async (name, value) => {
  if (hasRemoteStore()) {
    await remoteStore.set(`${KEY_PREFIX}:${name}`, value)
    return
  }

  writeLocal(name, value)
}

module.exports = {
  getCollection,
  hasRemoteStore,
  setCollection
}
