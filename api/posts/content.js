const { getSessionFromRequest } = require('../../lib/access-auth')
const { readPostBySlug } = require('../../lib/protected-posts')

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ message: 'Method not allowed' }))
    return
  }

  const slug = req.query && req.query.slug
  const post = await readPostBySlug(slug)

  if (!post) {
    res.statusCode = 404
    res.end(JSON.stringify({ message: '文章不存在。' }))
    return
  }

  if (post.protected && !getSessionFromRequest(req)) {
    res.statusCode = 401
    res.end(JSON.stringify({ message: '请先登录后查看全文。' }))
    return
  }

  res.statusCode = 200
  res.end(JSON.stringify({
    success: true,
    slug: post.slug,
    title: post.title,
    contentHtml: post.contentHtml
  }))
}
