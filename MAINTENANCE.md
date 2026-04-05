# 赫西的遗星 - 博客日常更新维护指南

本指南将帮助您掌握博客的日常使用与维护。

---

## 一、环境与工具准备

### 1.1 本地开发环境

您需要在本地安装以下工具：

- **Node.js**: 下载地址 https://nodejs.org （建议 LTS 版本）
- **Git**: 下载地址 https://git-scm.com
- **Hexo CLI**: 通过 npm 安装
  ```bash
  npm install -g hexo-cli
  ```

### 1.2 项目初始化

如果从头开始：

```bash
# 克隆项目
git clone https://github.com/lastars/lastars-blog.git
cd lastars-blog

# 安装依赖
npm install
```

---

## 二、内容发布流程

### 2.1 创建新文章

```bash
# 命令方式
hexo new "文章标题"

# 示例
hexo new "2026年4月交易总结"
```

文章文件将自动创建在 `source/_posts/` 目录下。

### 2.2 手动创建文章

在 `source/_posts/` 目录创建 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-04-05 10:00:00
categories:
  - 分类名称
tags:
  - 标签1
  - 标签2
---

正文内容开始...
```

### 2.3 文章 Front-matter 详解

| 字段 | 说明 | 示例 |
|------|------|------|
| title | 文章标题 | 交易之路 |
| date | 发布日期 | 2026-04-05 10:00:00 |
| categories | 分类（可多个） | [交易思考, 投资感悟] |
| tags | 标签（可多个） | [交易心得, 复盘] |
|cover | 封面图片 | /img/cover.jpg |
| toc | 是否显示目录 | true/false |

### 2.4 文章内嵌图片

1. **方式一：使用图床（推荐）**
   - 将图片上传到图床（如 imgurl.cn、SM.MS）
   - 在文章中使用图片链接

2. **方式二：本地图片**
   - 在文章同目录下创建资源文件夹
   - 文件命名格式：`文章名/` + `图片`
   - 使用 `{% asset_img 图片名.jpg %}` 插入

### 2.5 外部链接嵌入

在 Markdown 中直接使用：

```markdown
[链接文字](https://example.com)
```

---

## 三、媒体管理

### 3.1 图片存储方案

**推荐方案：**

1. **图床服务**（最常用）
   - SM.MS: https://smms.app
   - imgurl.cn: https://imgurl.cn
   - 路过图床: https://imgtu.com

2. **GitHub 仓库存储**
   - 创建 `lastars-blog-images` 仓库
   - 通过 GitHub CDN 访问
   - 链接格式: `https://raw.githubusercontent.com/lastars/lastars-blog-images/main/xxx.jpg`

### 3.2 图片使用示例

```markdown
![图片描述](https://example.com/image.jpg)
```

---

## 四、链接管理

### 4.1 友链页面

在 `source/` 目录创建 `flink.md`：

```markdown
---
title: 友链
type: flink
---

<div class="flink">
  <div class="site-card">
    <div class="site-info">
      <a href="https://blog.xiocs.com" target="_blank">
        <h3>神楽坂雪紀的投研笔记</h3>
        <p>交易思考与市场分析</p>
      </a>
    </div>
  </div>
</div>
```

### 4.2 外部链接打开方式

在 `_config.yml` 中配置：

```yaml
external_link:
  enable: true
  field: site  # 对整个站点生效
```

---

## 五、网站更新维护

### 5.1 主题更新

```bash
# 更新 Hexo
npm update hexo

# 更新 Butterfly 主题
cd themes/butterfly
git pull
```

### 5.2 插件更新

常用插件：

```bash
# 安装插件
npm install hexo-deployer-git  # Git 部署
npm install hexo-generator-sitemap  # 网站地图
npm install hexo-generator-feed  # RSS 订阅
npm install hexo-wordcount  # 字数统计
```

### 5.3 本地预览

```bash
# 启动本地服务器
hexo server

# 指定端口
hexo server -p 4000

# 清除缓存后启动
hexo clean && hexo server
```

---

## 六、部署流程

### 6.1 部署到 GitHub

```bash
# 添加远程仓库
git remote add origin https://github.com/lastars/lastars-blog.git

# 提交代码
git add .
git commit -m "更新内容描述"
git push origin main
```

### 6.2 Vercel 自动部署

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 选择 "Import Git Repository"
5. 选择 `lastars-blog` 仓库
6. Vercel 会自动检测 Hexo 项目并配置
7. 点击 "Deploy" 开始部署

### 6.3 手动部署（可选）

```bash
# 安装部署插件
npm install hexo-deployer-git

# 配置 _config.yml
deploy:
  type: git
  repo: https://github.com/lastars/lastars-blog.git
  branch: gh-pages

# 部署
hexo clean && hexo deploy
# 或
hexo g -d
```

---

## 七、域名配置

### 7.1 腾讯云域名设置

1. 登录腾讯云控制台
2. 进入 "域名注册"
3. 选择 "lastars.cn"
4. 添加解析记录：

| 主机记录 | 记录类型 | 记录值 |
|----------|----------|--------|
| @ | CNAME | cname.vercel-dns.com |
| www | CNAME | cname.vercel-dns.com |

### 7.2 Vercel 域名绑定

1. 在 Vercel 项目中点击 "Settings"
2. 选择 "Domains"
3. 输入 `lastars.cn`
4. 点击 "Add Domain"

### 7.3 配置注意事项

- 添加域名后，Vercel 会自动配置 SSL 证书
- 解析生效需要等待几分钟到几小时
- 建议使用 "DNS Only" 模式避免代理问题

---

## 八、备份与恢复

### 8.1 手动备份

```bash
# 备份整个项目
tar -czvf lastars-blog-backup.tar.gz lastars-blog/

# 只备份源代码
cp -r source/ source-backup/
```

### 8.2 自动备份

在 GitHub 仓库设置中：

1. 开启 "GitHub Actions"
2. 定期自动推送到备份仓库
3. 或使用 CodeVault 功能

### 8.3 恢复流程

```bash
# 克隆备份仓库
git clone https://github.com/lastars/lastars-blog-backup.git

# 安装依赖
npm install

# 验证
hexo server
```

---

## 九、常见问题排查

### 9.1 页面显示异常

```bash
# 清除缓存
hexo clean

# 重新生成
hexo generate

# 重新部署
hexo deploy
```

### 9.2 图片显示问题

- 检查图片链接是否正确
- 确认图床服务是否正常
- 检查 CSS 是否禁用了图片

### 9.3 部署失败

- 检查 Git 仓库权限
- 确认 Vercel 构建配置
- 查看部署日志排查错误

### 9.4 主题显示异常

- 确认主题配置正确
- 检查 _config.yml 语法
- 清除 node_modules 后重新安装

---

## 十、安全建议

1. **定期更新**：保持 Hexo 和主题为最新版本
2. **密码保护**：Vercel 项目可设置密码保护
3. **敏感信息**：不要在公开仓库中暴露 API keys
4. **定期备份**：保持本地和云端双重备份

---

## 十一、快速命令参考

```bash
# 开发命令
hexo server                    # 启动本地服务器
hexo clean && hexo g           # 清除并生成
hexo g -d                      # 生成并部署

# 文章命令
hexo new "标题"                # 创建新文章
hexo new page "页面名"         # 创建新页面

# 主题命令
hexo new theme "主题名"        # 创建新主题（需开发）
```

---

如有问题，请参考：
- Hexo 文档: https://hexo.io/zh-cn/docs/
- Butterfly 文档: https://butterfly.js.org/