const PORT = 4180
const BUILD_DIR = 'lighthouse/.build'

function createConfig({ profile, settings }) {
  return {
    ci: {
      collect: {
        startServerCommand: `npx vite preview --outDir ${BUILD_DIR} --port ${PORT} --strictPort`,
        startServerReadyPattern: 'Local',
        startServerReadyTimeout: 60000,
        url: [`http://localhost:${PORT}/`, `http://localhost:${PORT}/nfts/emerald-ape-042`],
        numberOfRuns: 3,
        settings: {
          chromeFlags: '--headless=new --no-first-run --no-default-browser-check',
          ...settings,
        },
      },
      upload: {
        target: 'filesystem',
        outputDir: `lighthouse/reports/${profile}`,
        reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
      },
    },
  }
}

module.exports = { createConfig, BUILD_DIR, PORT }
