import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'

const MOCK_ENTRIES = ['src/mocks/setup.ts', 'src/mocks/browser.ts']

function preloadMocks(enabled: boolean): Plugin {
  return {
    name: 'preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle, chunk }) {
        if (!enabled || !bundle || !chunk) {
          return
        }
        const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
        const preloaded = new Set([chunk.fileName, ...chunk.imports])
        const files = new Set<string>()
        const visit = (fileName: string) => {
          if (preloaded.has(fileName) || files.has(fileName)) {
            return
          }
          files.add(fileName)
          const output = bundle[fileName]
          if (output?.type === 'chunk') {
            output.imports.forEach(visit)
          }
        }
        chunks
          .filter((output) => MOCK_ENTRIES.some((entry) => output.facadeModuleId?.replaceAll('\\', '/').endsWith(entry)))
          .forEach((output) => visit(output.fileName))
        return [...files].map<HtmlTagDescriptor>((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
          injectTo: 'head',
        }))
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      preloadMocks(env.VITE_ENABLE_MOCKS === 'true'),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
