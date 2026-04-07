const { clearSessionCookie } = require('../../lib/access-auth')

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  res.setHeader('Set-Cookie', clearSessionCookie())
  res.statusCode = 200
  res.end(JSON.stringify({
    authenticated: false
  }))
}
