const {
  COOKIE_NAME,
  parseCookies,
  readAccounts,
  verifySession
} = require('../../lib/access-auth')

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  const cookies = parseCookies(req.headers.cookie)
  const session = verifySession(cookies[COOKIE_NAME])
  const configured = (await readAccounts()).length > 0

  res.statusCode = 200
  res.end(JSON.stringify({
    authenticated: Boolean(session),
    configured,
    username: session ? session.username : null,
    isAdmin: Boolean(session && session.username === 'admin')
  }))
}
