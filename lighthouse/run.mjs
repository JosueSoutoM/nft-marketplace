import { spawnSync } from 'node:child_process'
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { summarize } from './summarize.mjs'

const BUILD_DIR = 'lighthouse/.build'
const PROFILES = ['mobile', 'desktop']

function run(command) {
  console.log(`\n> ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

rmSync('lighthouse/reports', { recursive: true, force: true })
rmSync('.lighthouseci', { recursive: true, force: true })

run(`npm run build -- --outDir ${BUILD_DIR} --emptyOutDir`)

function normalizeReports(profile) {
  const dir = join('lighthouse/reports', profile)
  const manifestPath = join(dir, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const rename = (path) => {
    const name = basename(path)
    const target = name.startsWith('-') ? `home${name}` : name
    if (target !== name) {
      renameSync(join(dir, name), join(dir, target))
    }
    return target
  }
  const normalized = manifest.map((entry) => ({
    ...entry,
    htmlPath: rename(entry.htmlPath),
    jsonPath: rename(entry.jsonPath),
  }))
  writeFileSync(manifestPath, `${JSON.stringify(normalized, null, 2)}\n`)
}

for (const profile of PROFILES) {
  const config = `lighthouse/lighthouserc.${profile}.cjs`
  run(`npx lhci collect --config=${config}`)
  run(`npx lhci upload --config=${config}`)
  normalizeReports(profile)
}

summarize(PROFILES)
