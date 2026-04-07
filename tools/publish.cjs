const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const ENV_FILE = path.join(ROOT, '.env.production.local')

const run = (command, args, options = {}) => {
  console.log(`\n$ ${[command, ...args].join(' ')}`)

  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env || {})
    }
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

const parseEnvLine = line => {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) return null

  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
  const divider = normalized.indexOf('=')

  if (divider === -1) return null

  const key = normalized.slice(0, divider).trim()
  let value = normalized.slice(divider + 1).trim()

  if (!key) return null

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [key, value.replaceAll('\\n', '\n')]
}

const readEnvFile = file => {
  if (!fs.existsSync(file)) return {}

  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map(parseEnvLine)
    .filter(Boolean)
    .reduce((env, [key, value]) => {
      env[key] = value
      return env
    }, {})
}

console.log('LASTARS publish: build, deploy, then sync newsletter.')

run('npm', ['run', 'build'])
run('npx', ['vercel', 'deploy', '--prod'])

run('npx', [
  'vercel',
  'env',
  'pull',
  '.env.production.local',
  '--environment=production',
  '--yes',
  '--non-interactive'
])

const productionEnv = readEnvFile(ENV_FILE)

run('npm', ['run', 'newsletter:sync'], {
  env: productionEnv
})

console.log('\nLASTARS publish complete.')
