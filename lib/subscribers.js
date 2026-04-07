const crypto = require('crypto')
const { getCollection, setCollection } = require('./data-store')

const normalizeEmail = email => String(email || '').trim().toLowerCase()

const upsertSubscriber = async (email, metadata = {}) => {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('请输入有效邮箱。')
  }

  const subscribers = await getCollection('subscribers', [])
  const existing = subscribers.find(item => item.email === normalizedEmail)

  if (existing) {
    existing.active = true
    existing.updatedAt = new Date().toISOString()
    Object.assign(existing, metadata)
    await setCollection('subscribers', subscribers)
    return {
      subscriber: existing,
      created: false
    }
  }

  const subscriber = {
    email: normalizedEmail,
    token: crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
    ...metadata
  }

  subscribers.unshift(subscriber)
  await setCollection('subscribers', subscribers)

  return {
    subscriber,
    created: true
  }
}

module.exports = {
  normalizeEmail,
  upsertSubscriber
}
