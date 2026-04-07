const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { getCollection, setCollection } = require('../lib/data-store')
const { canSendEmail, sendNewsletterEmail, SITE_URL } = require('../lib/email')

const POSTS_DIR = path.join(process.cwd(), 'source', '_posts')

const stripMarkdown = content => content
  .replace(/```[\s\S]*?```/g, '')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/!\[[^\]]*]\([^)]*\)/g, '')
  .replace(/\[[^\]]*]\(([^)]*)\)/g, '')
  .replace(/^>\s?/gm, '')
  .replace(/[#*_~-]/g, '')
  .replace(/\n+/g, ' ')
  .trim()

const getSiteUrl = () => SITE_URL.replace(/\/$/, '')

const getPosts = () => {
  if (!fs.existsSync(POSTS_DIR)) return []

  return fs.readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const fullPath = path.join(POSTS_DIR, file)
      const raw = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(raw)
      const slug = path.parse(file).name
      const date = new Date(data.date || fs.statSync(fullPath).mtime.toISOString())
      const excerpt = stripMarkdown(content).slice(0, 180)

      return {
        slug,
        title: data.title || slug,
        date,
        dateLabel: date.toISOString().slice(0, 10),
        excerpt,
        url: `${getSiteUrl()}/${encodeURI(slug)}/`
      }
    })
    .filter(post => !Number.isNaN(post.date.getTime()) && post.date <= new Date())
    .sort((left, right) => left.date - right.date)
}

const main = async () => {
  if (!canSendEmail()) {
    console.log('Newsletter sync skipped: missing Resend configuration.')
    return
  }

  const subscribers = (await getCollection('subscribers', [])).filter(item => item.active !== false)

  if (!subscribers.length) {
    console.log('Newsletter sync skipped: no active subscribers.')
    return
  }

  const posts = getPosts()
  const sentLog = await getCollection('newsletterLog', [])
  const sentSet = new Set(sentLog)
  const unsentPosts = posts.filter(post => !sentSet.has(post.slug))

  if (!unsentPosts.length) {
    console.log('Newsletter sync skipped: no new posts.')
    return
  }

  for (const post of unsentPosts) {
    let successCount = 0
    let failureCount = 0

    for (const subscriber of subscribers) {
      try {
        await sendNewsletterEmail({ subscriber, post })
        successCount += 1
      } catch (error) {
        failureCount += 1
        console.error(`Newsletter send failed for ${subscriber.email}:`, error.message)
      }
    }

    if (successCount > 0) {
      sentLog.push(post.slug)
    } else {
      console.warn(`Newsletter sync deferred for "${post.title}": all deliveries failed.`)
    }

    if (failureCount > 0) {
      console.warn(`Newsletter sync completed with ${failureCount} failure(s) for "${post.title}".`)
    }
  }

  await setCollection('newsletterLog', sentLog)
  console.log(`Newsletter sync complete. Sent ${unsentPosts.length} post update(s) to ${subscribers.length} subscriber(s).`)
}

main().catch(error => {
  console.error('Newsletter sync failed:', error.message)
})
