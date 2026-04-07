(() => {
  if (window.__LASTARS_ACCESS_BOOTED__) return
  window.__LASTARS_ACCESS_BOOTED__ = true

  const root = document.getElementById('lastars-access-root')

  if (!root) return

  const state = {
    session: null,
    configured: true,
    submittingLogin: false,
    submittingPurchase: false,
    submittingPasswordChange: false,
    submittingPasswordReset: false,
    purchaseOpen: false,
    changePasswordOpen: false,
    forgotPasswordOpen: false,
    accountMenuOpen: false,
    forceLoginOpen: false,
    message: '',
    purchaseMessage: '',
    passwordMessage: '',
    resetMessage: '',
    accountMenuMessage: '',
    selectedPlanId: '',
    selectedPayment: '',
    purchaseEmail: '',
    purchaseContact: ''
  }

  let lastSessionKey = '__initial__'

  const defaultPlans = [
    {
      id: 'monthly',
      name: '月度会员',
      price: '¥299',
      period: '/月'
    },
    {
      id: 'yearly',
      name: '年度会员',
      price: '¥2599',
      period: '/年',
      badge: '推荐',
      recommended: true
    },
    {
      id: 'lifetime',
      name: '终身会员',
      price: '¥8999',
      period: '/永久'
    }
  ]

  const defaults = {
    enabled: true,
    site_label: 'LASTARS',
    login_title: 'LASTARS 私享会员',
    login_subtitle: '使用已开通账号登录。未开通可点击购买会员查看套餐。',
    helper_text: '输入账号密码登录。',
    contact_wechat_id: 'JM2YZX',
    contact_note: '添加微信时请备注邮箱或昵称，便于核对。',
    contact_title: '购买会员',
    contact_hint: '选择套餐与支付方式，完成付款后提交开通申请。',
    purchase_template: '你好，我已支付 {plan_name}，请帮我开通 LASTARS 会员账号。',
    plans: defaultPlans,
    wechat: {
      label: '微信支付',
      qr_image: ''
    },
    alipay: {
      label: '支付宝',
      qr_image: ''
    }
  }

  const escapeHtml = value => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  const getConfig = () => {
    const source = window.LASTARS_ACCESS_CONFIG || {}
    const sourcePlans = Array.isArray(source.plans) && source.plans.length ? source.plans : defaultPlans

    return {
      ...defaults,
      ...source,
      plans: sourcePlans.map((plan, index) => ({
        ...defaultPlans[index % defaultPlans.length],
        ...plan
      })),
      wechat: {
        ...defaults.wechat,
        ...(source.wechat || {})
      },
      alipay: {
        ...defaults.alipay,
        ...(source.alipay || {})
      }
    }
  }

  const getPlans = config => config.plans.filter(plan => plan && plan.id)

  const getSelectedPlan = config => {
    const plans = getPlans(config)

    if (!plans.length) return null

    if (!state.selectedPlanId) {
      const recommended = plans.find(plan => plan.recommended)
      state.selectedPlanId = (recommended || plans[0]).id
    }

    return plans.find(plan => plan.id === state.selectedPlanId) || plans[0]
  }

  const getSelectedPayment = config => {
    const available = ['wechat', 'alipay'].filter(method => config[method] && config[method].qr_image)

    if (!available.length) return ''
    if (!state.selectedPayment || !available.includes(state.selectedPayment)) {
      state.selectedPayment = available[0]
    }

    return state.selectedPayment
  }

  const setDocumentState = locked => {
    const html = document.documentElement
    html.classList.remove('lastars-access-pending')
    html.classList.toggle('lastars-access-locked', locked)
    html.classList.toggle('lastars-access-ready', !locked)
  }

  const getPageContext = () => {
    const config = window.GLOBAL_CONFIG_SITE || {}
    const pathname = String(window.location.pathname || '/')
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/'

    return {
      isAdminPage: normalizedPathname === '/admin' || normalizedPathname === '/admin/index.html',
      pathname,
      pageType: String(config.pageType || ''),
      requiresAccess: Boolean(config.requiresAccess)
    }
  }

  const notifySessionChange = () => {
    const nextSessionKey = state.session ? state.session.username : ''

    if (nextSessionKey === lastSessionKey) return

    lastSessionKey = nextSessionKey
    window.dispatchEvent(new CustomEvent('lastars:session-changed', {
      detail: {
        authenticated: Boolean(state.session),
        username: state.session ? state.session.username : null,
        isAdmin: Boolean(state.session && state.session.isAdmin)
      }
    }))
  }

  const copyText = async text => {
    if (!text) return false

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }

  const openPurchase = () => {
    if (state.session && state.session.username.includes('@') && !state.purchaseEmail) {
      state.purchaseEmail = state.session.username
    }

    state.purchaseOpen = true
    state.accountMenuOpen = false
    state.purchaseMessage = ''
  }

  const getPurchaseTemplateText = (config, selectedPlan) => {
    const template = String(config.purchase_template || '').trim()

    if (!template) return ''

    return template.replaceAll('{plan_name}', selectedPlan ? selectedPlan.name : '会员套餐')
  }

  const renderPurchaseDialog = (config, selectedPlan, selectedPayment, selectedPaymentConfig) => {
    const plansMarkup = getPlans(config).map(plan => `
      <button class="lastars-plan${plan.id === selectedPlan?.id ? ' is-active' : ''}" type="button" data-plan="${escapeHtml(plan.id)}">
        <span class="lastars-plan__name">${escapeHtml(plan.name)}</span>
        <span class="lastars-plan__price">${escapeHtml(plan.price)}${escapeHtml(plan.period || '')}</span>
        ${plan.badge ? `<span class="lastars-plan__badge">${escapeHtml(plan.badge)}</span>` : ''}
      </button>
    `).join('')

    const paymentMarkup = ['wechat', 'alipay']
      .filter(method => config[method] && config[method].qr_image)
      .map(method => `
        <button class="lastars-payment-choice${selectedPayment === method ? ' is-active' : ''}" type="button" data-payment="${method}">
          ${escapeHtml(config[method].label || method)}
        </button>
      `).join('')

    return `
      <div class="lastars-purchase-modal">
        <button class="lastars-purchase-modal__backdrop" type="button" data-close-purchase aria-label="关闭购买窗口"></button>
        <section class="lastars-purchase-modal__dialog">
          <div class="lastars-purchase-modal__header">
            <div>
              <p class="lastars-access-shell__eyebrow">${escapeHtml(config.site_label)}</p>
              <h3>${escapeHtml(config.contact_title || '购买会员')}</h3>
              <p>${escapeHtml(config.contact_hint || '选择套餐与支付方式，完成付款后提交开通申请。')}</p>
            </div>
            <button class="lastars-purchase-modal__close" type="button" data-close-purchase aria-label="关闭购买窗口">关闭</button>
          </div>

          <div class="lastars-plan-grid">
            ${plansMarkup}
          </div>

          <form class="lastars-purchase__form" data-purchase-form>
            <label>
              接收邮箱
              <input name="email" type="email" placeholder="用于接收账号信息" value="${escapeHtml(state.purchaseEmail)}" required>
            </label>
            <label>
              联系备注
              <input name="contact" type="text" placeholder="微信昵称 / 付款备注" value="${escapeHtml(state.purchaseContact)}">
            </label>
            <div class="lastars-payment-choice-group">
              ${paymentMarkup}
            </div>
            ${selectedPaymentConfig && selectedPaymentConfig.qr_image ? `
              <div class="lastars-payment-box">
                <img src="${escapeHtml(selectedPaymentConfig.qr_image)}" alt="${escapeHtml(selectedPaymentConfig.label || '支付二维码')}">
                <div>
                  <strong>${escapeHtml(selectedPlan ? `${selectedPlan.name} ${selectedPlan.price}${selectedPlan.period || ''}` : '')}</strong>
                  <p>${escapeHtml(selectedPaymentConfig.label || '')}</p>
                  <p>支付完成后添加微信 ${escapeHtml(config.contact_wechat_id)}，并提交开通申请。</p>
                </div>
              </div>
            ` : ''}
            <div class="lastars-purchase__actions">
              <button class="lastars-access-shell__submit" type="submit"${state.submittingPurchase ? ' disabled' : ''}>
                ${state.submittingPurchase ? '提交中...' : '我已支付，提交开通申请'}
              </button>
              <button class="lastars-access-shell__secondary" type="button" data-copy-wechat>复制微信号</button>
              <button class="lastars-access-shell__secondary" type="button" data-copy-template>复制联系话术</button>
            </div>
            <p class="lastars-access-shell__status" data-purchase-status>${escapeHtml(state.purchaseMessage || config.contact_note || '')}</p>
            <p class="lastars-access-shell__status">${escapeHtml(getPurchaseTemplateText(config, selectedPlan))}</p>
          </form>
        </section>
      </div>
    `
  }

  const renderChangePasswordDialog = config => `
    <div class="lastars-purchase-modal">
      <button class="lastars-purchase-modal__backdrop" type="button" data-close-password aria-label="关闭修改密码窗口"></button>
      <section class="lastars-purchase-modal__dialog lastars-account-dialog">
        <div class="lastars-purchase-modal__header">
          <div>
            <p class="lastars-access-shell__eyebrow">${escapeHtml(config.site_label)}</p>
            <h3>修改密码</h3>
            <p>为当前登录账号设置一个新的密码。</p>
          </div>
          <button class="lastars-purchase-modal__close" type="button" data-close-password aria-label="关闭修改密码窗口">关闭</button>
        </div>
        <form class="lastars-password-form" data-change-password-form>
          <label>
            当前密码
            <input name="currentPassword" type="password" autocomplete="current-password" placeholder="输入当前密码" required>
          </label>
          <label>
            新密码
            <input name="newPassword" type="password" autocomplete="new-password" placeholder="至少 6 位" required>
          </label>
          <label>
            确认新密码
            <input name="confirmPassword" type="password" autocomplete="new-password" placeholder="再次输入新密码" required>
          </label>
          <button class="lastars-access-shell__submit" type="submit"${state.submittingPasswordChange ? ' disabled' : ''}>
            ${state.submittingPasswordChange ? '提交中...' : '确认修改'}
          </button>
          <p class="lastars-access-shell__status">${escapeHtml(state.passwordMessage || '修改后请使用新密码登录。')}</p>
        </form>
      </section>
    </div>
  `

  const renderForgotPasswordDialog = config => `
    <div class="lastars-purchase-modal">
      <button class="lastars-purchase-modal__backdrop" type="button" data-close-forgot-password aria-label="关闭找回密码窗口"></button>
      <section class="lastars-purchase-modal__dialog lastars-account-dialog">
        <div class="lastars-purchase-modal__header">
          <div>
            <p class="lastars-access-shell__eyebrow">${escapeHtml(config.site_label)}</p>
            <h3>忘记密码</h3>
            <p>提交账号后，我会收到邮件提醒，再为你手动重置并发送新密码。</p>
          </div>
          <button class="lastars-purchase-modal__close" type="button" data-close-forgot-password aria-label="关闭找回密码窗口">关闭</button>
        </div>
        <form class="lastars-password-form" data-forgot-password-form>
          <label>
            登录账号 / 邮箱
            <input name="username" type="text" autocomplete="username" placeholder="输入你的登录账号或邮箱" required>
          </label>
          <button class="lastars-access-shell__submit" type="submit"${state.submittingPasswordReset ? ' disabled' : ''}>
            ${state.submittingPasswordReset ? '提交中...' : '提交重置申请'}
          </button>
          <p class="lastars-access-shell__status">${escapeHtml(state.resetMessage || '如果账号存在，我会尽快处理。')}</p>
        </form>
      </section>
    </div>
  `

  const renderToolbar = config => {
    const menu = state.accountMenuOpen ? `
      <div class="lastars-account-menu">
        <button class="lastars-account-menu__item" type="button" data-open-change-password>修改密码</button>
        <button class="lastars-account-menu__item" type="button" data-open-purchase>续费</button>
        <button class="lastars-account-menu__item" type="button" data-copy-contact>联系作者：${escapeHtml(config.contact_wechat_id)}</button>
        <button class="lastars-account-menu__item" type="button" data-access-logout>退出登录</button>
        <p class="lastars-account-menu__status">${escapeHtml(state.accountMenuMessage || config.contact_note || '')}</p>
      </div>
    ` : ''

    return `
      <div class="lastars-access-toolbar">
        <button class="lastars-access-toolbar__user" type="button" data-account-menu aria-expanded="${state.accountMenuOpen ? 'true' : 'false'}">
          ${escapeHtml(state.session.username)}
        </button>
        <button class="lastars-access-toolbar__button" type="button" data-access-logout>退出</button>
        ${menu}
      </div>
      ${state.purchaseOpen ? renderPurchaseDialog(config, getSelectedPlan(config), getSelectedPayment(config), getSelectedPayment(config) ? config[getSelectedPayment(config)] : null) : ''}
      ${state.changePasswordOpen ? renderChangePasswordDialog(config) : ''}
    `
  }

  const renderLogin = (config, missingAdminAccess) => {
    const selectedPlan = getSelectedPlan(config)
    const selectedPayment = getSelectedPayment(config)
    const selectedPaymentConfig = selectedPayment ? config[selectedPayment] : null

    return `
      <div class="lastars-access-shell is-locked">
        <div class="lastars-access-shell__overlay">
          <section class="lastars-access-login">
            <header class="lastars-access-shell__header">
              <p class="lastars-access-shell__eyebrow">${escapeHtml(config.site_label)}</p>
              <h2>${escapeHtml(config.login_title)}</h2>
              <p>${escapeHtml(missingAdminAccess ? '当前账号没有后台访问权限，请切换管理员账号。' : config.login_subtitle)}</p>
            </header>

            <form class="lastars-access-shell__form" data-login-form>
              <label>
                用户名
                <input name="username" type="text" autocomplete="username" placeholder="输入账号" required>
              </label>
              <label>
                密码
                <input name="password" type="password" autocomplete="current-password" placeholder="输入密码" required>
              </label>
              <div class="lastars-access-shell__actions">
                <button class="lastars-access-shell__submit" type="submit"${state.submittingLogin ? ' disabled' : ''}>
                  ${state.submittingLogin ? '登录中...' : missingAdminAccess ? '切换账号' : '登录'}
                </button>
                <button class="lastars-access-shell__secondary" type="button" data-open-purchase>购买会员</button>
              </div>
              <div class="lastars-access-shell__links">
                <button type="button" data-open-forgot-password>忘记密码</button>
                <button type="button" data-copy-login-contact>联系作者</button>
              </div>
              <p class="lastars-access-shell__status" data-login-status>${escapeHtml(state.message || config.helper_text)}</p>
            </form>

            <p class="lastars-access-shell__hint">已付款用户直接使用账号登录，未开通用户点击“购买会员”查看套餐与支付方式。</p>
          </section>
          ${state.purchaseOpen ? renderPurchaseDialog(config, selectedPlan, selectedPayment, selectedPaymentConfig) : ''}
          ${state.forgotPasswordOpen ? renderForgotPasswordDialog(config) : ''}
        </div>
      </div>
    `
  }

  const render = () => {
    const config = getConfig()
    const page = getPageContext()

    if (!config.enabled) {
      root.innerHTML = ''
      setDocumentState(false)
      notifySessionChange()
      return
    }

    const missingAdminAccess = page.isAdminPage && state.session && !state.session.isAdmin
    const requiresLogin = page.requiresAccess && (!state.session || missingAdminAccess)
    const showLogin = requiresLogin || state.forceLoginOpen

    if (state.session && !showLogin) {
      root.innerHTML = renderToolbar(config)
      bindEvents()
      setDocumentState(false)
      notifySessionChange()
      return
    }

    if (!showLogin) {
      root.innerHTML = ''
      setDocumentState(false)
      notifySessionChange()
      return
    }

    root.innerHTML = renderLogin(config, missingAdminAccess)
    bindEvents()
    setDocumentState(true)
    notifySessionChange()
  }

  const submitLogin = async event => {
    event.preventDefault()

    if (state.submittingLogin) return

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') || '').trim()
    const password = String(formData.get('password') || '')

    if (!username || !password) {
      state.message = '请输入账号和密码。'
      render()
      return
    }

    state.submittingLogin = true
    state.message = '账号验证中...'
    render()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '登录失败，请稍后再试。')
      }

      state.session = {
        username: data.username,
        isAdmin: Boolean(data.isAdmin)
      }
      state.forceLoginOpen = false
      state.message = `欢迎回来，${data.username}。`
      state.purchaseOpen = false
      state.forgotPasswordOpen = false
    } catch (error) {
      state.session = null
      state.message = error.message || '登录失败，请稍后再试。'
    } finally {
      state.submittingLogin = false
      render()
    }
  }

  const submitPurchase = async event => {
    event.preventDefault()

    if (state.submittingPurchase) return

    const config = getConfig()
    const selectedPlan = getSelectedPlan(config)
    const selectedPayment = getSelectedPayment(config)
    const selectedPaymentConfig = selectedPayment ? config[selectedPayment] : null
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const contact = String(formData.get('contact') || '').trim()

    state.purchaseEmail = email
    state.purchaseContact = contact

    if (!email || !email.includes('@')) {
      state.purchaseMessage = '请输入有效邮箱。'
      render()
      return
    }

    if (!selectedPlan || !selectedPayment || !selectedPaymentConfig) {
      state.purchaseMessage = '请先选择套餐和支付方式。'
      render()
      return
    }

    state.submittingPurchase = true
    state.purchaseMessage = '正在提交开通申请...'
    render()

    try {
      const response = await fetch('/api/purchases/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          contact,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          paymentMethod: selectedPayment,
          paymentMethodLabel: selectedPaymentConfig.label
        })
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '提交失败，请稍后再试。')
      }

      state.purchaseMessage = data.message || '开通申请已提交。'
      state.purchaseEmail = ''
      state.purchaseContact = ''
    } catch (error) {
      state.purchaseMessage = error.message || '提交失败，请稍后再试。'
    } finally {
      state.submittingPurchase = false
      render()
    }
  }

  const submitPasswordChange = async event => {
    event.preventDefault()

    if (state.submittingPasswordChange) return

    const formData = new FormData(event.currentTarget)
    const currentPassword = String(formData.get('currentPassword') || '')
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!currentPassword || !newPassword) {
      state.passwordMessage = '请输入当前密码和新密码。'
      render()
      return
    }

    if (newPassword.length < 6) {
      state.passwordMessage = '新密码至少需要 6 位。'
      render()
      return
    }

    if (newPassword !== confirmPassword) {
      state.passwordMessage = '两次输入的新密码不一致。'
      render()
      return
    }

    state.submittingPasswordChange = true
    state.passwordMessage = '正在修改密码...'
    render()

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '修改失败，请稍后再试。')
      }

      state.passwordMessage = data.message || '密码已修改。'
      state.changePasswordOpen = false
      state.accountMenuOpen = true
      state.accountMenuMessage = '密码已修改。'
    } catch (error) {
      state.passwordMessage = error.message || '修改失败，请稍后再试。'
    } finally {
      state.submittingPasswordChange = false
      render()
    }
  }

  const submitForgotPassword = async event => {
    event.preventDefault()

    if (state.submittingPasswordReset) return

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') || '').trim()

    if (!username) {
      state.resetMessage = '请输入你的登录账号或邮箱。'
      render()
      return
    }

    state.submittingPasswordReset = true
    state.resetMessage = '正在提交重置申请...'
    render()

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '提交失败，请稍后再试。')
      }

      state.resetMessage = data.message || '重置申请已提交。'
    } catch (error) {
      state.resetMessage = error.message || '提交失败，请稍后再试。'
    } finally {
      state.submittingPasswordReset = false
      render()
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // The local UI should still return to the login state if the network blips.
    }

    state.session = null
    state.forceLoginOpen = true
    state.purchaseOpen = false
    state.changePasswordOpen = false
    state.forgotPasswordOpen = false
    state.accountMenuOpen = false
    state.message = '你已经退出登录。'
    render()
  }

  const bindEvents = () => {
    const loginForm = root.querySelector('[data-login-form]')
    const purchaseForm = root.querySelector('[data-purchase-form]')
    const changePasswordForm = root.querySelector('[data-change-password-form]')
    const forgotPasswordForm = root.querySelector('[data-forgot-password-form]')
    const planButtons = root.querySelectorAll('[data-plan]')
    const paymentButtons = root.querySelectorAll('[data-payment]')
    const copyWechat = root.querySelector('[data-copy-wechat]')
    const copyTemplate = root.querySelector('[data-copy-template]')
    const copyContactButtons = root.querySelectorAll('[data-copy-contact], [data-copy-login-contact]')
    const openPurchaseButtons = root.querySelectorAll('[data-open-purchase]')
    const closePurchaseButtons = root.querySelectorAll('[data-close-purchase]')
    const logoutButtons = root.querySelectorAll('[data-access-logout]')
    const accountMenuButton = root.querySelector('[data-account-menu]')
    const openChangePasswordButton = root.querySelector('[data-open-change-password]')
    const closePasswordButtons = root.querySelectorAll('[data-close-password]')
    const openForgotPasswordButtons = root.querySelectorAll('[data-open-forgot-password]')
    const closeForgotPasswordButtons = root.querySelectorAll('[data-close-forgot-password]')
    const config = getConfig()

    if (loginForm) loginForm.addEventListener('submit', submitLogin)
    if (purchaseForm) purchaseForm.addEventListener('submit', submitPurchase)
    if (changePasswordForm) changePasswordForm.addEventListener('submit', submitPasswordChange)
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', submitForgotPassword)

    planButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.selectedPlanId = button.dataset.plan
        render()
      })
    })

    paymentButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.selectedPayment = button.dataset.payment
        render()
      })
    })

    openPurchaseButtons.forEach(button => {
      button.addEventListener('click', () => {
        openPurchase()
        render()
      })
    })

    closePurchaseButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.purchaseOpen = false
        render()
      })
    })

    if (copyWechat) {
      copyWechat.addEventListener('click', async () => {
        try {
          await copyText(config.contact_wechat_id)
          state.purchaseMessage = '微信号已复制。'
        } catch (error) {
          state.purchaseMessage = `复制失败，请手动复制微信号：${config.contact_wechat_id}`
        }
        render()
      })
    }

    if (copyTemplate) {
      copyTemplate.addEventListener('click', async () => {
        const text = getPurchaseTemplateText(config, getSelectedPlan(config))

        try {
          await copyText(text)
          state.purchaseMessage = '联系话术已复制。'
        } catch (error) {
          state.purchaseMessage = '复制失败，请手动复制联系话术。'
        }
        render()
      })
    }

    copyContactButtons.forEach(button => {
      button.addEventListener('click', async () => {
        try {
          await copyText(config.contact_wechat_id)
          state.accountMenuMessage = `微信号 ${config.contact_wechat_id} 已复制。`
          state.message = `微信号 ${config.contact_wechat_id} 已复制。`
        } catch (error) {
          state.accountMenuMessage = `请手动添加微信：${config.contact_wechat_id}`
          state.message = `请手动添加微信：${config.contact_wechat_id}`
        }
        render()
      })
    })

    if (accountMenuButton) {
      accountMenuButton.addEventListener('click', () => {
        state.accountMenuOpen = !state.accountMenuOpen
        state.accountMenuMessage = ''
        render()
      })
    }

    if (openChangePasswordButton) {
      openChangePasswordButton.addEventListener('click', () => {
        state.changePasswordOpen = true
        state.accountMenuOpen = false
        state.passwordMessage = ''
        render()
      })
    }

    closePasswordButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.changePasswordOpen = false
        render()
      })
    })

    openForgotPasswordButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.forgotPasswordOpen = true
        state.resetMessage = ''
        render()
      })
    })

    closeForgotPasswordButtons.forEach(button => {
      button.addEventListener('click', () => {
        state.forgotPasswordOpen = false
        render()
      })
    })

    logoutButtons.forEach(button => {
      button.addEventListener('click', logout)
    })
  }

  const syncSession = async () => {
    const config = getConfig()

    if (!config.enabled) {
      state.session = null
      render()
      return
    }

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store'
      })
      const data = await response.json()
      state.configured = data.configured !== false
      state.session = data.authenticated ? {
        username: data.username,
        isAdmin: Boolean(data.isAdmin)
      } : null
      state.message = ''
    } catch (error) {
      state.session = null
      state.message = ''
    }

    render()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSession, { once: true })
  } else {
    syncSession()
  }
})()
