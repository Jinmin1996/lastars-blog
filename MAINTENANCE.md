# 赫西的遗星维护说明

## 日常改文字

主要改这几处：

- `_config.yml`
- `themes/butterfly/layout/index.pug`
- `source/about/index.md`
- `source/account/index.md`
- `source/ranking/index.md`

其中 `_config.yml` 里的 `lastars_access` 负责：

- 登录页标题与提示
- 套餐名称、价格、说明
- 微信号
- 微信 / 支付宝二维码路径
- 购买联系话术

## 发布新文章

```bash
npx hexo new "文章标题"
```

文章在 `source/_posts/` 下编辑。发布时执行一键发布：

```bash
npm run publish
```

这条命令会依次完成：

- 构建静态博客
- 部署到 Vercel 生产环境
- 拉取生产环境变量
- 把未推送过的新文章同步给邮箱订阅者

## 会员开通流程

1. 用户在登录页下方选择套餐并提交开通申请
2. 申请进入 `/admin/`
3. `admin` 点击“生成账号并发邮件”
4. 系统自动：
   - 生成会员账号
   - 保存到 `site-issued-accounts.json` 或 KV
   - 向用户邮箱发送账号密码
   - 把该邮箱加入订阅列表

## 账号管理

- 调试账号在 `site-accounts.json`
- 后台签发的会员账号在 `site-issued-accounts.json`
- 停用账号：把对应项的 `active` 改成 `false`

如需批量生成账号，也可以运行：

```bash
npm run accounts:generate -- --count 5 --prefix vip
```

## 数据文件

未接入 Vercel KV 时，本地使用这些文件保存数据：

- `site-purchases.json`
- `site-subscribers.json`
- `site-newsletter-log.json`
- `site-issued-accounts.json`

接入 KV 后，线上会优先使用 KV。

## 需要的 Vercel 环境变量

- `LASTARS_AUTH_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`
- `SITE_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
