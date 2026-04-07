const { sendWelcomeEmail } = require('../../lib/email')
const { upsertSubscriber } = require('../../lib/subscribers')

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
    const email = String(payload.email || '')
    const { subscriber, created } = await upsertSubscriber(email, {
      source: 'site'
    })

    try {
      await sendWelcomeEmail({ email: subscriber.email })
    } catch (error) {
      console.error('Welcome email failed:', error.message)
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      message: created
        ? '订阅成功，后续有新内容会同步推送到你的邮箱。'
        : '订阅状态已更新。'
    }))
  } catch (error) {
    res.statusCode = error.message === '请输入有效邮箱。' ? 400 : 500
    res.end(JSON.stringify({
      message: error.message === '请输入有效邮箱。'
        ? error.message
        : '订阅失败，请稍后再试。'
    }))
  }
}
