const { getCollection } = require('../../lib/data-store')
const { requireAdmin } = require('../../lib/access-auth')

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  if (!requireAdmin(req, res)) {
    return
  }

  const purchases = await getCollection('purchases', [])
  const pending = purchases.filter(item => item.status !== 'issued').length
  const issued = purchases.filter(item => item.status === 'issued').length

  res.statusCode = 200
  res.end(JSON.stringify({
    purchases,
    pending,
    issued
  }))
}
