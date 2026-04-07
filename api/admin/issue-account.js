const crypto = require('crypto')
const {
  hashPassword,
  requireAdmin,
  upsertIssuedAccount
} = require('../../lib/access-auth')
const { getCollection, setCollection } = require('../../lib/data-store')
const { sendIssuedAccountEmail } = require('../../lib/email')

const readJsonBody = req => new Promise((resolve, reject) => {
  let body = ''

  req.on('data', chunk => {
    body += chunk
  })

  req.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {})
    } catch (error) {
      reject(new Error('Invalid JSON body'))
    }
  })

  req.on('error', reject)
})

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from(crypto.randomBytes(12), byte => alphabet[byte % alphabet.length]).join('')
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  if (!requireAdmin(req, res)) {
    return
  }

  try {
    const { purchaseId } = await readJsonBody(req)
    const purchases = await getCollection('purchases', [])
    const purchase = purchases.find(item => item.id === purchaseId)

    if (!purchase) {
      res.statusCode = 404
      res.end(JSON.stringify({ message: '未找到对应的开通申请。' }))
      return
    }

    const username = purchase.email
    const password = generatePassword()
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = `${salt}:${hashPassword(password, salt)}`
    const now = new Date().toISOString()

    await upsertIssuedAccount({
      username,
      passwordHash,
      active: true,
      createdAt: purchase.createdAt || new Date().toISOString(),
      updatedAt: now
    })

    const wasIssued = purchase.status === 'issued'
    purchase.status = 'issued'
    purchase.issuedAt = purchase.issuedAt || now
    purchase.updatedAt = now
    purchase.username = username
    await setCollection('purchases', purchases)

    let emailSent = false
    let emailError = ''

    try {
      const emailResult = await sendIssuedAccountEmail({
        email: purchase.email,
        username,
        password,
        planName: purchase.planName
      })
      emailSent = !emailResult?.skipped
    } catch (error) {
      emailError = error.message || '邮件发送失败'
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      reset: wasIssued,
      username,
      password,
      email: purchase.email,
      emailSent,
      emailError
    }))
  } catch (error) {
    res.statusCode = 400
    res.end(JSON.stringify({ message: '账号发放失败，请稍后重试。' }))
  }
}
