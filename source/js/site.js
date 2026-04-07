(() => {
  if (window.__LASTARS_SITE_BOOTED__) return
  window.__LASTARS_SITE_BOOTED__ = true

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'include',
      ...options
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  const initProtectedPost = () => {
    const shell = document.querySelector('[data-protected-post]')
    const status = document.querySelector('[data-protected-post-state]')
    const content = document.querySelector('[data-protected-post-content]')

    if (!shell || !status || !content) return

    const slug = String(shell.dataset.postSlug || '').trim()

    if (!slug) return

    const showStatus = message => {
      status.hidden = false
      status.textContent = message
      content.hidden = true
      content.innerHTML = ''
    }

    const load = async () => {
      showStatus('正在加载全文...')

      try {
        const data = await request(`/api/posts/content?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store'
        })
        content.innerHTML = data.contentHtml || ''
        content.hidden = false
        status.hidden = true
        status.textContent = ''
      } catch (error) {
        showStatus(error.message || '文章加载失败，请稍后再试。')
      }
    }

    window.addEventListener('lastars:session-changed', event => {
      if (event.detail && event.detail.authenticated) {
        load()
        return
      }

      showStatus('请先登录或购买会员后查看全文。')
    })

    load()
  }

  const renderAdminPurchases = data => {
    const summary = document.querySelector('[data-admin-summary]')
    const status = document.querySelector('[data-admin-status]')
    const container = document.querySelector('[data-admin-purchases]')

    if (!summary || !status || !container) return

    summary.innerHTML = `
      <div class="lastars-admin-card">
        <strong>${data.pending}</strong>
        <span>待授权</span>
      </div>
      <div class="lastars-admin-card">
        <strong>${data.issued}</strong>
        <span>已授权</span>
      </div>
    `

    if (!data.purchases.length) {
      container.innerHTML = '<p class="lastars-admin-empty">目前还没有新的开通申请。</p>'
      status.textContent = ''
      return
    }

    container.innerHTML = data.purchases.map(item => `
      <article class="lastars-admin-item">
        <div class="lastars-admin-item__meta">
          <h2>${item.planName}</h2>
          <p>邮箱：${item.email}</p>
          <p>备注：${item.contact || '未填写'}</p>
          <p>支付方式：${item.paymentMethodLabel || item.paymentMethod || ''}</p>
        </div>
        <div class="lastars-admin-item__side">
          <span class="lastars-admin-item__badge ${item.status === 'issued' ? 'is-issued' : ''}">${item.status === 'issued' ? '已授权' : '待授权'}</span>
          <small>${String(item.createdAt || '').slice(0, 16).replace('T', ' ')}</small>
          ${item.status === 'issued'
            ? `<p>账号：${item.username}</p><button type="button" data-issue-id="${item.id}">重置并发送新密码</button>`
            : `<button type="button" data-issue-id="${item.id}">授权并发送账号</button>`}
        </div>
      </article>
    `).join('')

    status.textContent = ''
  }

  const initAdminPage = () => {
    const container = document.querySelector('[data-admin-purchases]')
    const normalizedPathname = String(window.location.pathname || '/').replace(/\/+$/, '') || '/'

    if (!container || (normalizedPathname !== '/admin' && normalizedPathname !== '/admin/index.html')) return

    const status = document.querySelector('[data-admin-status]')

    const load = async () => {
      status.textContent = '正在加载后台数据...'
      try {
        const data = await request('/api/admin/purchases')
        renderAdminPurchases(data)
      } catch (error) {
        status.textContent = error.message || '后台数据加载失败。'
      }
    }

    container.addEventListener('click', async event => {
      const button = event.target.closest('[data-issue-id]')

      if (!button) return

      const purchaseId = button.dataset.issueId
      button.disabled = true
      button.textContent = '处理中...'
      status.textContent = '正在授权并发送账号邮件...'

      try {
        const data = await request('/api/admin/issue-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ purchaseId })
        })
        await load()
        if (data.emailSent) {
          status.textContent = data.reset
            ? `已为 ${data.username} 重置密码，并已发送新登录信息。`
            : `已授权 ${data.username}，并已发送登录信息。`
          return
        }

        status.textContent = `已授权 ${data.username}，但邮件未发出。请手动发送：账号 ${data.username}，密码 ${data.password}。${data.emailError ? `错误：${data.emailError}` : ''}`
      } catch (error) {
        status.textContent = error.message || '发放失败，请稍后再试。'
      }
    })

    load()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initProtectedPost()
      initAdminPage()
    }, { once: true })
  } else {
    initProtectedPost()
    initAdminPage()
  }
})()
