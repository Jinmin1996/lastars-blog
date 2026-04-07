const { getCollection, setCollection } = require('../../lib/data-store')

module.exports = async (req, res) => {
  const token = String((req.query && req.query.token) || '').trim()
  const subscribers = await getCollection('subscribers', [])
  const subscriber = subscribers.find(item => item.token === token)

  if (subscriber) {
    subscriber.active = false
    subscriber.updatedAt = new Date().toISOString()
    await setCollection('subscribers', subscribers)
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.statusCode = 200
  res.end(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>LASTARS 退订结果</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; margin: 0; padding: 48px 20px; color: #111; background: #fff; }
          main { max-width: 560px; margin: 0 auto; }
          h1 { font-size: 28px; margin-bottom: 12px; }
          p { line-height: 1.8; color: #444; }
          a { color: #111; }
        </style>
      </head>
      <body>
        <main>
          <h1>邮件订阅已更新</h1>
          <p>你已经成功退订 LASTARS 的邮件更新。如果之后想重新订阅，可以回到网站底部再次填写邮箱。</p>
          <p><a href="https://lastars.cn">返回网站</a></p>
        </main>
      </body>
    </html>
  `)
}
