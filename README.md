# 赫西的遗星

基于 Hexo + Butterfly 主题的静态博客网站

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动本地服务器
hexo server
# 或
npx hexo server
```

### 创建新文章

```bash
hexo new "文章标题"
# 文章将创建在 source/_posts/ 目录
```

### 生成静态文件

```bash
hexo generate
# 或
hexo g
```

### 部署到 Vercel

本项目已配置 Vercel 部署：

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. Vercel 将自动检测 Hexo 项目并部署

## 项目结构

```
lastars-blog/
├── source/           # 源代码目录
│   ├── _posts/       # 文章目录
│   ├── about/        # 关于页面
│   └── css/          # 自定义样式
├── themes/          # 主题目录
│   └── butterfly/   # Butterfly 主题
├── _config.yml      # Hexo 配置
└── vercel.json      # Vercel 配置
```

## 自定义配置

- 主配置文件: `_config.yml`
- 主题配置: `themes/butterfly/_config.yml`
- 自定义样式: `source/css/style.css`

## 主题定制

已配置以下自定义效果：
- 深黑色背景 (#0a0a0a)
- 紫色渐变主题色 (#7c3aed)
- 霓虹渐变装饰元素
- 卡片悬浮动效
- 自定义滚动条

## 许可证

MIT