const { findAccount } = require('../../lib/access-auth')
const { sendPasswordResetRequestEmail } = require('../../lib/email')

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

  try {
    const payload = await readJsonBody(req)
    const username = String(payload.username || '').trim()

    if (!username) {
      res.statusCode = 400
      res.end(JSON.stringify({ message: '请输入你的登录账号或邮箱。' }))
      return
    }

    const account = await findAccount(username)

    try {
      await sendPasswordResetRequestEmail({
        username,
        exists: Boolean(account)
      })
    } catch (error) {
      console.error('Password reset notification failed:', error.message)
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      message: '重置申请已提交。如果账号存在，我会尽快处理并发送新密码。'
    }))
  } catch (error) {
    res.statusCode = 400
    res.end(JSON.stringify({ message: '请求格式不正确，请稍后再试。' }))
  }
}
