# Auditoria Lighthouse

Auditoria da tela inicial (`/`) e do detalhe do NFT (`/nfts/emerald-ape-042`) nos perfis mobile e desktop, com o build de produção e o cenário padrão dos mocks. Foram feitas três execuções por página e perfil, e as tabelas mostram a mediana. Os valores entre parênteses são as três execuções, na ordem em que rodaram.

Comando: `npm run audit:lighthouse`. Relatórios HTML e JSON de cada execução: [`reports/mobile/`](reports/mobile/) e [`reports/desktop/`](reports/desktop/), com um `manifest.json` por perfil. Medianas consolidadas: [`reports/summary.json`](reports/summary.json) e [`reports/summary.md`](reports/summary.md).

## Resultado

| Perfil | Página | Performance (≥ 90) | Accessibility (≥ 95) | Best Practices (≥ 95) | SEO (≥ 90) |
| --- | --- | ---: | ---: | ---: | ---: |
| mobile | `/` | ❌ 82 (82, 80, 82) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) |
| mobile | `/nfts/emerald-ape-042` | ❌ 83 (83, 83, 83) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) |
| desktop | `/` | ✅ 99 (99, 99, 99) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) |
| desktop | `/nfts/emerald-ape-042` | ✅ 99 (99, 99, 99) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) | ✅ 100 (100, 100, 100) |

### Métricas (mediana, valores simulados pelo Lighthouse)

| Perfil | Página | FCP | LCP | CLS | TBT | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| mobile | `/` | 917 ms | 4455 ms | 0,000 | 172 ms | 1712 ms |
| mobile | `/nfts/emerald-ape-042` | 917 ms | 4419 ms | 0,000 | 142 ms | 1627 ms |
| desktop | `/` | 258 ms | 999 ms | 0,000 | 0 ms | 516 ms |
| desktop | `/nfts/emerald-ape-042` | 257 ms | 942 ms | 0,000 | 0 ms | 456 ms |

Valores observados sem throttling na execução representativa (do relatório): LCP de 775 ms em `/` e de 685 ms no detalhe, no mobile; 706 ms e 736 ms no desktop.

Elemento de LCP:
- `/` no mobile: imagem do primeiro card do catálogo.
- `/` no desktop: imagem do destaque no hero.
- Detalhe, nos dois perfis: imagem principal da galeria.

Todos dependem de dados da API simulada.

O relatório do Lighthouse 13 também traz a categoria "Agentic Browsing" (50, por falta de `llms.txt` e de dados estruturados). Ela não está entre as metas do enunciado e não foi otimizada.

## Ambiente e condições de execução

| Item | Valor |
| --- | --- |
| Lighthouse | 13.6.0 (via `@lhci/cli` 0.16.0) |
| Chrome | Google Chrome 156.0.8078.80 instalado no sistema, `--headless=new`, perfil novo a cada execução |
| Node.js | 24.20.0 |
| Sistema | Windows 10 Pro 22H2 (10.0.19045), AMD Ryzen 5 3500X (6 núcleos), 16 GB de RAM |
| BenchmarkIndex | 2731 a 2782 (mediana por página/perfil, em `summary.json`) |
| Build | `npm run build -- --outDir lighthouse/.build` (mesmo `tsc -b && vite build` da entrega, com `.env.production`: `VITE_ENABLE_MOCKS=true`) |
| Servidor | `vite preview` na porta 4180, com fallback de SPA e compressão gzip |
| Mocks | Cenário padrão (`success`), latência padrão (`fixed`, 300 ms), banco simulado recriado a cada execução porque o perfil do navegador é novo |
| Mobile | Configuração padrão do Lighthouse: Moto G Power emulado (412 × 823, DPR 1,75), throttling simulado (Lantern), RTT 150 ms, 1,6 Mbps, CPU 4× mais lenta |
| Desktop | `preset: 'desktop'`: 1350 × 940, DPR 1, throttling simulado, RTT 40 ms, 10 Mbps, CPU sem redução |
| Execuções | 3 por página e perfil, em sequência, com a máquina sem outra carga relevante |

A auditoria carrega a entrega completa: imagens WebP responsivas, a Roboto Mono, MSW com Service Worker, servidor Socket.IO simulado, carrinho de visitante e painel de mocks. Nada foi desligado para a medição.

A configuração está versionada em [`lighthouserc.mobile.cjs`](lighthouserc.mobile.cjs), [`lighthouserc.desktop.cjs`](lighthouserc.desktop.cjs) e [`shared.cjs`](shared.cjs). O script é [`run.mjs`](run.mjs) e o cálculo das medianas está em [`summarize.mjs`](summarize.mjs).

## Correções feitas nesta auditoria

A primeira medição deu Performance mobile 83/83, Accessibility 96/100, SEO 92/92 e desktop 98/97. As correções:

| Problema | Causa | Correção |
| --- | --- | --- |
| SEO: `robots.txt` inválido (39 erros) | Não havia `robots.txt`. O fallback de SPA devolvia o `index.html` | [`public/robots.txt`](../public/robots.txt) |
| Accessibility: `target-size` na tela inicial | Os pontos do carrossel do hero eram botões de 16 × 16 px a 20 px de distância | Botões de 24 × 24 px com o mesmo ponto visual de 8 px. A posição vertical foi ajustada para manter o centro no mesmo lugar |
| Performance: imagem de LCP sem prioridade | Os cards da primeira linha usavam `loading="eager"`, mas sem `fetchpriority` | `fetchPriority="high"` nos cards da primeira linha. O hero e a galeria já tinham |
| Performance: cadeia serial até a primeira requisição | O chunk dos mocks só era descoberto depois de executar `index.js`, o `msw/browser` só depois do seed do banco e os chunks da rota só depois de o MSW iniciar | Plugin `preload-mocks` em [`vite.config.ts`](../vite.config.ts), que emite `modulepreload` dos chunks dos mocks quando `VITE_ENABLE_MOCKS=true`. O import de `msw/browser` agora roda em paralelo ao seed ([`src/mocks/setup.ts`](../src/mocks/setup.ts)). Os chunks da rota atual são carregados em paralelo à inicialização dos mocks, só o código e sem loaders ([`src/main.tsx`](../src/main.tsx)) |

Com isso, Accessibility e SEO foram a 100 nas quatro combinações, e o desktop foi a 99. No mobile, o LCP simulado caiu cerca de 150 ms (de 4,5–4,6 s para 4,4–4,5 s), mas a Performance continuou em 82–83.

## Abaixo da meta: Performance no mobile (82 e 83)

O único item abaixo da meta é a Performance no perfil mobile. CLS (0) e TBT (142–172 ms) estão bons. FCP (0,9 s) e Speed Index (1,6–1,7 s) também. A nota cai pelo LCP simulado de 4,4 s, que tem peso de 25%.

### Causa

O LCP das duas páginas é uma imagem que vem dos dados da API simulada. Antes da primeira requisição de dados, o navegador precisa baixar e executar a camada de mocks inteira, e isso é obrigatório: a entrega usa MSW no navegador como API.

Na execução representativa de `/`, foram baixados 474 KB (gzip) antes do LCP:

| Recurso | Transferido |
| --- | ---: |
| Chunk principal da aplicação (React DOM, TanStack Query/Router, Radix, Sonner, Socket.IO client) | 129 KB |
| Camada de mocks: handlers, fixtures, servidor Socket.IO simulado e dependências do MSW (`tough-cookie` e `tldts`, com a lista de sufixos públicos, somam cerca de 60% do chunk) | 147 KB |
| `msw/browser` | 33 KB |
| Outros chunks da rota | cerca de 100 KB |
| Fonte Roboto Mono latina (preload) | 32 KB |
| CSS | 16 KB |

Com a banda do perfil mobile (1,6 Mbps, cerca de 200 KB/s), só a transferência leva cerca de 2,4 s. Somam-se três coisas:
- a execução de JavaScript antes do LCP: o `msw/browser` sozinho executa 166 ms sem throttling, o que vira cerca de 660 ms com a CPU 4× mais lenta;
- o registro do Service Worker;
- os RTTs de 150 ms da cadeia HTML → JS → mocks → API → imagem.

A camada de mocks responde por cerca de 38% dos bytes antes do LCP e por parte relevante da CPU. Sem throttling, o LCP observado é de 0,7–0,8 s.

### Por que não foi corrigido

- Remover ou adiar o MSW deixaria a página sem dados, e o enunciado exige auditar com o cenário padrão dos mocks.
- Trocar o `tough-cookie` por um stub mudaria o comportamento do MSW com cookies. Seria uma simplificação só para a auditoria.
- Os chunks já são divididos por rota (`autoCodeSplitting`), as imagens são WebP com `srcset` e `sizes`, a fonte é uma variável latina de 32 KB com preload e o CLS é zero.
- Os candidatos restantes (adiar Sonner e Radix do layout raiz, cerca de 25 KB gzip) renderiam cerca de 0,1 s. Não alcançam a meta e exigiriam reestruturar o layout.
- Em produção, a hospedagem (Vercel) serve Brotli, cerca de 15% menor que o gzip do `vite preview`, o que reduz um pouco a transferência. A auditoria usa o `vite preview` para ser reproduzível localmente.

Numa API real, a camada de mocks não existiria no bundle. O mesmo código chegaria à primeira requisição de dados com cerca de 180 KB e algumas centenas de milissegundos de CPU a menos. Esse é o mesmo trecho que hoje separa os 4,4 s da meta de cerca de 3 s.

### Fonte e primeiro render

O `main.tsx` espera a Roboto Mono por até 1,5 s antes do primeiro render, em paralelo com a inicialização dos mocks. Essa espera não pesa no FCP nem no LCP medidos:
- a fonte tem preload no HTML, pesa 32 KB e termina de baixar bem antes da camada de mocks (180 KB);
- o render já precisa esperar os mocks para ter dados.

Na prática, o tempo até o primeiro render é limitado pelo MSW, não pela fonte. Trocar a espera por uma fonte reserva com `size-adjust` não mudaria as métricas e reabriria o risco de deslocamento no hero (documentado em [`ARCHITECTURE.md`](../ARCHITECTURE.md#tipografia)). Por isso a espera foi mantida.

### Variação entre execuções

A segunda execução mobile de `/` deu 80. Na primeira medição, a primeira execução tinha dado 69. Essa execução coincide com o primeiro carregamento depois de subir o servidor e é exatamente o tipo de ruído que a mediana de três execuções absorve.
