# 赫西的遗星

基于 Hexo + Butterfly 的会员制博客，部署在 Vercel，当前包含登录访问、购买开通、后台发号与邮件订阅推送。

## 本地开发

```bash
npm install
npm run clean
npm run server
```

## 构建与部署

```bash
npm run build
```

构建会执行两件事：

1. 生成静态站点到 `public/`
2. 同步新文章邮件到订阅者邮箱

## 当前账号体系

- `site-accounts.json` 保存种子账号
- `site-issued-accounts.json` 保存后台发放的会员账号
- 当前调试账号为 `admin`

后台处理路径：

1. 访客在登录页下方完成付款并提交开通申请
2. 申请写入 `site-purchases.json` 或 Vercel KV
3. `admin` 登录 `/admin/` 审核并一键发号
4. 系统自动把会员邮箱加入订阅列表
5. 新文章发布后，构建阶段自动向订阅者发送邮件

## 主要文件

- `_config.yml`：站点标题、描述、付费文案、支付二维码
- `themes/butterfly/_config.yml`：导航与主题行为
- `themes/butterfly/layout/index.pug`：首页结构
- `source/css/style.css`：整体视觉与登录页样式
- `source/js/access.js`：登录与购买前端逻辑
- `source/js/site.js`：订阅表单与后台管理前端
- `api/`：Vercel Functions
- `lib/`：账号、存储、邮件、订阅公共逻辑

## 建议的 Vercel 环境变量

- `LASTARS_AUTH_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`
- `SITE_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
