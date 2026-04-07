const crypto = require('crypto')
const { getCollection, setCollection } = require('../../lib/data-store')
const { sendPurchaseNotification } = require('../../lib/email')
const { normalizeEmail } = require('../../lib/subscribers')

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
    const email = normalizeEmail(payload.email)
    const contact = String(payload.contact || '').trim()
    const planId = String(payload.planId || '').trim()
    const planName = String(payload.planName || '').trim()
    const paymentMethod = String(payload.paymentMethod || '').trim()
    const paymentMethodLabel = String(payload.paymentMethodLabel || '').trim()

    if (!email || !email.includes('@') || !planId || !planName || !paymentMethod) {
      res.statusCode = 400
      res.end(JSON.stringify({ message: '请完整填写开通信息。' }))
      return
    }

    const purchases = await getCollection('purchases', [])
    const purchase = {
      id: crypto.randomUUID(),
      email,
      contact,
      planId,
      planName,
      paymentMethod,
      paymentMethodLabel,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    purchases.unshift(purchase)
    await setCollection('purchases', purchases)

    try {
      const notificationResult = await sendPurchaseNotification(purchase)
      if (notificationResult && notificationResult.skipped) {
        console.warn('Purchase notification skipped: missing email configuration.')
      }
    } catch (error) {
      console.error('Purchase notification failed:', error.message)
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      message: '开通申请已提交，我会在核对付款后发放账号密码。'
    }))
  } catch (error) {
    res.statusCode = 400
    res.end(JSON.stringify({ message: '提交失败，请稍后再试。' }))
  }
}
