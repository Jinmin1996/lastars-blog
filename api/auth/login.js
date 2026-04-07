const {
  buildSessionCookie,
  findAccount,
  readAccounts,
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

  if ((await readAccounts()).length === 0) {
    res.statusCode = 503
    res.end(JSON.stringify({ message: 'No accounts are configured yet' }))
    return
  }

  try {
    const payload = await readJsonBody(req)
    const username = String(payload.username || '').trim()
    const password = String(payload.password || '')
    const account = await findAccount(username)

    if (!account || !verifyPassword(account, password)) {
      res.statusCode = 401
      res.end(JSON.stringify({ message: '账号或密码不正确。' }))
      return
    }

    res.setHeader('Set-Cookie', buildSessionCookie(account.username))
    res.statusCode = 200
    res.end(JSON.stringify({
      authenticated: true,
      username: account.username,
      isAdmin: account.username === 'admin'
    }))
  } catch (error) {
    res.statusCode = 400
    res.end(JSON.stringify({ message: '请求格式不正确，请稍后再试。' }))
  }
}
