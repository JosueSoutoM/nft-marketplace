import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPORTS_DIR = 'lighthouse/reports'

const CATEGORIES = [
  { id: 'performance', label: 'Performance', target: 90 },
  { id: 'accessibility', label: 'Accessibility', target: 95 },
  { id: 'best-practices', label: 'Best Practices', target: 95 },
  { id: 'seo', label: 'SEO', target: 90 },
]

const METRICS = [
  { id: 'first-contentful-paint', label: 'FCP', unit: 'ms' },
  { id: 'largest-contentful-paint', label: 'LCP', unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'CLS', unit: '' },
  { id: 'total-blocking-time', label: 'TBT', unit: 'ms' },
  { id: 'speed-index', label: 'SI', unit: 'ms' },
]

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function formatMetric(value, unit) {
  return unit === 'ms' ? `${Math.round(value)} ms` : value.toFixed(3)
}

function summarizeProfile(profile) {
  const dir = join(REPORTS_DIR, profile)
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  const byPath = new Map()
  for (const entry of manifest) {
    const lhr = JSON.parse(readFileSync(join(dir, entry.jsonPath), 'utf8'))
    const path = new URL(lhr.finalDisplayedUrl).pathname
    const runs = byPath.get(path) ?? []
    runs.push(lhr)
    byPath.set(path, runs)
  }
  return [...byPath.entries()].map(([path, runs]) => ({
    profile,
    path,
    runs: runs.length,
    categories: Object.fromEntries(
      CATEGORIES.map(({ id }) => {
        const scores = runs.map((lhr) => Math.round(lhr.categories[id].score * 100))
        return [id, { median: median(scores), runs: scores }]
      }),
    ),
    metrics: Object.fromEntries(
      METRICS.map(({ id }) => {
        const values = runs.map((lhr) => lhr.audits[id].numericValue)
        return [id, { median: median(values), runs: values }]
      }),
    ),
    environment: {
      lighthouse: runs[0].lighthouseVersion,
      chrome: runs[0].environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1],
      userAgent: runs[0].environment.hostUserAgent,
      benchmarkIndex: median(runs.map((lhr) => lhr.environment.benchmarkIndex)),
      formFactor: runs[0].configSettings.formFactor,
      throttlingMethod: runs[0].configSettings.throttlingMethod,
      throttling: runs[0].configSettings.throttling,
      screenEmulation: runs[0].configSettings.screenEmulation,
    },
  }))
}

function toMarkdown(results) {
  const scoreHeader = CATEGORIES.map(({ label, target }) => `${label} (≥ ${target})`).join(' | ')
  const metricHeader = METRICS.map(({ label }) => label).join(' | ')
  const lines = [
    `| Perfil | Página | ${scoreHeader} |`,
    `| --- | --- | ${CATEGORIES.map(() => '---:').join(' | ')} |`,
    ...results.map(({ profile, path, categories }) => {
      const cells = CATEGORIES.map(({ id, target }) => {
        const { median: value, runs } = categories[id]
        const status = value >= target ? '✅' : '❌'
        return `${status} ${value} (${runs.join(', ')})`
      })
      return `| ${profile} | \`${path}\` | ${cells.join(' | ')} |`
    }),
    '',
    `| Perfil | Página | ${metricHeader} |`,
    `| --- | --- | ${METRICS.map(() => '---:').join(' | ')} |`,
    ...results.map(({ profile, path, metrics }) => {
      const cells = METRICS.map(({ id, unit }) => formatMetric(metrics[id].median, unit))
      return `| ${profile} | \`${path}\` | ${cells.join(' | ')} |`
    }),
    '',
  ]
  return lines.join('\n')
}

export function summarize(profiles) {
  const results = profiles.flatMap(summarizeProfile)
  const summary = { generatedAt: new Date().toISOString(), node: process.version, results }
  writeFileSync(join(REPORTS_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  const markdown = toMarkdown(results)
  writeFileSync(join(REPORTS_DIR, 'summary.md'), markdown)
  console.log(`\n${markdown}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  summarize(['mobile', 'desktop'])
}
