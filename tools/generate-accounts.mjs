import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const getOption = (flag, fallback) => {
  const index = args.indexOf(flag)
  return index === -1 ? fallback : args[index + 1] || fallback
}

const count = Number.parseInt(getOption('--count', '3'), 10)
const prefix = getOption('--prefix', 'vip')
const file = path.resolve(process.cwd(), getOption('--file', 'site-issued-accounts.json'))

if (!Number.isInteger(count) || count <= 0) {
  console.error('count must be a positive integer')
  process.exit(1)
}

const readExistingAccounts = () => {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const existingAccounts = readExistingAccounts()
const nextIndex = existingAccounts.length + 1

const makePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from(crypto.randomBytes(12), byte => alphabet[byte % alphabet.length]).join('')
}

const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const issuedAccounts = Array.from({ length: count }, (_, offset) => {
  const index = String(nextIndex + offset).padStart(3, '0')
  const username = `${prefix}${index}`
  const password = makePassword()

  return {
    username,
    password,
    stored: {
      username,
      passwordHash: hashPassword(password),
      active: true,
      createdAt: new Date().toISOString()
    }
  }
})

const mergedAccounts = existingAccounts.concat(issuedAccounts.map(account => account.stored))

fs.writeFileSync(file, `${JSON.stringify(mergedAccounts, null, 2)}\n`)

console.log(`Generated ${issuedAccounts.length} account(s) and wrote hashes to ${path.relative(process.cwd(), file)}.`)
console.log('Save these credentials now:')

issuedAccounts.forEach(account => {
  console.log(`- ${account.username} / ${account.password}`)
})
