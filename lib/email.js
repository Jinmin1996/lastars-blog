const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lastars.cn'

const canSendEmail = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)

const escapeHtml = value => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const postEmail = async payload => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Resend request failed: ${details}`)
  }

  return response.json()
}

const sendEmail = async payload => {
  if (!canSendEmail()) {
    return {
      skipped: true
    }
  }

  return postEmail({
    from: process.env.RESEND_FROM_EMAIL,
    ...payload
  })
}

const sendPurchaseNotification = async purchase => {
  if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
    return { skipped: true }
  }

  const subject = `[LASTARS] 新开通申请 - ${purchase.planName}`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111;">
      <h2>新的会员开通申请</h2>
      <p><strong>套餐：</strong>${purchase.planName}</p>
      <p><strong>邮箱：</strong>${purchase.email}</p>
      <p><strong>联系备注：</strong>${purchase.contact || '未填写'}</p>
      <p><strong>支付方式：</strong>${purchase.paymentMethodLabel}</p>
      <p><strong>提交时间：</strong>${purchase.createdAt}</p>
      <p><strong>后台地址：</strong><a href="${SITE_URL}/admin/">${SITE_URL}/admin/</a></p>
    </div>
  `

  return sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject,
    html
  })
}

const sendIssuedAccountEmail = async ({ email, username, password, planName }) => {
  const subject = `[LASTARS] ${planName} 已开通`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111;">
      <h2>LASTARS 会员账号已开通</h2>
      <p>你申请的 <strong>${planName}</strong> 已处理完成。</p>
      <p><strong>登录地址：</strong><a href="${SITE_URL}">${SITE_URL}</a></p>
      <p><strong>账号：</strong>${username}</p>
      <p><strong>密码：</strong>${password}</p>
      <p>首次登录后建议你妥善保管账号信息。</p>
    </div>
  `

  return sendEmail({
    to: email,
    subject,
    html
  })
}

const sendPasswordResetRequestEmail = async ({ username, exists }) => {
  if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
    return { skipped: true }
  }

  const subject = `[LASTARS] 密码重置申请 - ${username}`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111;">
      <h2>新的密码重置申请</h2>
      <p><strong>账号：</strong>${escapeHtml(username)}</p>
      <p><strong>账号状态：</strong>${exists ? '已找到' : '未找到或未开通'}</p>
      <p><strong>提交时间：</strong>${new Date().toISOString()}</p>
      <p>如果账号已开通，请进入后台为该用户重置并发送新密码。</p>
      <p><strong>后台地址：</strong><a href="${SITE_URL}/admin/">${SITE_URL}/admin/</a></p>
    </div>
  `

  return sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject,
    html
  })
}

const sendWelcomeEmail = async ({ email }) => {
  const subject = '[LASTARS] 订阅成功'
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111;">
      <h2>订阅成功</h2>
      <p>以后站内有新的公开文章或订阅推送时，你会收到更新邮件。</p>
      <p>访问站点：<a href="${SITE_URL}">${SITE_URL}</a></p>
    </div>
  `

  return sendEmail({
    to: email,
    subject,
    html
  })
}

const sendNewsletterEmail = async ({ subscriber, post }) => {
  const unsubscribeUrl = `${SITE_URL}/api/subscribers/unsubscribe?token=${subscriber.token}`
  const subject = `[LASTARS] ${post.title}`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.75; color: #111;">
      <h2 style="margin-bottom: 8px;">${post.title}</h2>
      <p style="color: #666; margin-top: 0;">${post.dateLabel}</p>
      <p>${post.excerpt}</p>
      <p><a href="${post.url}" style="color: #111; text-decoration: underline;">阅读全文</a></p>
      <hr style="margin: 32px 0; border: 0; border-top: 1px solid #ddd;">
      <p style="font-size: 13px; color: #666;">如果你不想继续接收订阅邮件，可以 <a href="${unsubscribeUrl}">点击这里退订</a>。</p>
    </div>
  `

  return sendEmail({
    to: subscriber.email,
    subject,
    html
  })
}

module.exports = {
  SITE_URL,
  canSendEmail,
  sendIssuedAccountEmail,
  sendNewsletterEmail,
  sendPasswordResetRequestEmail,
  sendPurchaseNotification,
  sendWelcomeEmail
}
