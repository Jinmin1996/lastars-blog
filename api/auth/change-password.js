const crypto = require('crypto')
const {
  findAccount,
  getSessionFromRequest,
  hashPassword,
  readIssuedAccounts,
  upsertIssuedAccount,
  verifyPassword
} = require('../../lib/access-auth')

const readJsonBody = req => new Promise((resolve, reject) => {
  let body = ''

  req.on('data', chunk => {
    body += chunk

    if (body.length > 1024 * 1024) {
      reject(new Error('Request body is too large'))
      req.destroy()
    }
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

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  const session = getSessionFromRequest(req)

  if (!session || !session.username) {
    res.statusCode = 401
    res.end(JSON.stringify({ message: '请先登录后再修改密码。' }))
    return
  }

  try {
    const payload = await readJsonBody(req)
    const currentPassword = String(payload.currentPassword || '')
    const newPassword = String(payload.newPassword || '')

    if (!currentPassword || !newPassword) {
      res.statusCode = 400
      res.end(JSON.stringify({ message: '请输入当前密码和新密码。' }))
      return
    }

    if (newPassword.length < 6) {
      res.statusCode = 400
      res.end(JSON.stringify({ message: '新密码至少需要 6 位。' }))
      return
    }

    const account = await findAccount(session.username)

    if (!account || !verifyPassword(account, currentPassword)) {
      res.statusCode = 401
      res.end(JSON.stringify({ message: '当前密码不正确。' }))
      return
    }

    const now = new Date().toISOString()
    const salt = crypto.randomBytes(16).toString('hex')
    const issuedAccounts = await readIssuedAccounts()
    const issuedAccount = issuedAccounts.find(item => item.username === session.username)

    await upsertIssuedAccount({
      username: session.username,
      passwordHash: `${salt}:${hashPassword(newPassword, salt)}`,
      active: true,
      createdAt: issuedAccount?.createdAt || now,
      updatedAt: now
    })

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      message: '密码已修改。'
    }))
  } catch (error) {
    res.statusCode = 400
    res.end(JSON.stringify({ message: '请求格式不正确，请稍后再试。' }))
  }
}
