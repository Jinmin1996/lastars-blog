const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const POSTS_DIR = path.join(__dirname, '..', 'source', '_posts')
let markedModulePromise = null

const normalizeSlug = value => decodeURIComponent(String(value || '').trim()).replace(/^\/+|\/+$/g, '')

const getPostFiles = () => {
  if (!fs.existsSync(POSTS_DIR)) return []

  return fs.readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      file,
      fullPath: path.join(POSTS_DIR, file),
      slug: path.parse(file).name
    }))
}

const isProtectedPost = data => data.protected !== false && data.access !== 'public'

const loadMarked = async () => {
  if (!markedModulePromise) {
    markedModulePromise = import('marked')
  }

  return markedModulePromise
}

const renderMarkdown = async markdown => {
  const markedModule = await loadMarked()
  return markedModule.marked.parse(markdown)
}

const readPostBySlug = async slug => {
  const normalizedSlug = normalizeSlug(slug)

  if (!normalizedSlug) return null

  const entry = getPostFiles().find(item => item.slug === normalizedSlug)

  if (!entry) return null

  const raw = fs.readFileSync(entry.fullPath, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug: entry.slug,
    title: data.title || entry.slug,
    protected: isProtectedPost(data),
    contentHtml: await renderMarkdown(content),
    rawContent: content,
    data
  }
}

module.exports = {
  normalizeSlug,
  readPostBySlug
}
