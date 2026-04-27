import { existsSync, copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const ENV_FILE = '.env'
const ENV_TEMPLATE = '.env.example'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('ProductivitApp setup:dev')

if (!existsSync(ENV_TEMPLATE)) {
  console.error('Missing .env.example. Cannot initialize environment.')
  process.exit(1)
}

if (!existsSync(ENV_FILE)) {
  copyFileSync(ENV_TEMPLATE, ENV_FILE)
  console.log('Created .env from .env.example')
} else {
  console.log('.env already exists, leaving it unchanged')
}

console.log('Installing dependencies...')
run('npm', ['install'])

console.log('Running typecheck...')
run('npm', ['run', 'typecheck'])

console.log('Setup complete.')
console.log('Next: fill SUPABASE_URL and SUPABASE_ANON_KEY in .env, then run npm run dev.')
