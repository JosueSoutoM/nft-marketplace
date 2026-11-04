# Kurio — Marketplace de NFTs

SPA de um marketplace de NFTs com catálogo, detalhe, favoritos, carrinho, pagamento com carteira, acompanhamento de pedidos em tempo real e área do colecionador. A API REST e os eventos em tempo real são simulados na camada de rede com MSW, de forma determinística, tanto em desenvolvimento quanto no build publicado e nos testes.

- Repositório: https://github.com/JosueSoutoM/nft-marketplace
- Aplicação publicada: https://nft-marketplace-indol-one.vercel.app
- Arquitetura, contratos REST e eventos, sessão, carrinho, cache, reconciliação REST × Socket.IO, decisões de UX, desvios do Figma e limitações: [ARCHITECTURE.md](ARCHITECTURE.md)

## Stack

| Função | Tecnologia |
| --- | --- |
| UI | React 19, TypeScript, Vite 8 |
| Rotas, search params e rotas privadas | TanStack Router (rotas baseadas em arquivos) |
| Estado remoto, mutations e cache | TanStack Query |
| Chamadas REST | Axios |
| Tempo real | Socket.IO (`socket.io-client`) |
| Estilo e componentes | Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react, Sonner |
| API simulada | MSW 2 e `@mswjs/socket.io-binding` |
| Testes E2E | Playwright (Chromium, desktop 1440 px e mobile 390 px) |
| Verificação de tipos e lint | TypeScript (`tsc -b`) e Oxlint |
| Deploy | Vercel |

## Requisitos

- Node.js 20.19+ ou 22.12+ (exigência do Vite 8). O projeto é desenvolvido com Node.js 24.
- npm (o `package-lock.json` está versionado).
- Navegador com Service Worker e Web Crypto. A API simulada exige contexto seguro: `localhost` ou HTTPS.
- Para os testes E2E: Chromium do Playwright ou Google Chrome instalado.

Nenhum backend, serviço privado ou credencial externa é necessário.

## Setup a partir de um checkout limpo

```bash
git clone https://github.com/JosueSoutoM/nft-marketplace.git
cd nft-marketplace
npm ci
cp .env.example .env
npm run dev
```

A aplicação abre em http://localhost:5173. O service worker do MSW (`public/mockServiceWorker.js`) já está versionado; não é preciso gerá-lo.

## Variáveis de ambiente

| Variável | Valor padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa a API simulada (MSW), o servidor Socket.IO simulado e o painel de cenários. Somente o valor `"true"` ativa. |
| `VITE_API_URL` | `/api` | URL base das chamadas REST feitas pelo Axios. |
| `VITE_API_TIMEOUT_MS` | `10000` | Timeout das requisições REST, em milissegundos. |

Arquivos:

- `.env.example`: modelo para desenvolvimento. Copie para `.env` (ignorado pelo Git). Sem `.env`, `npm run dev` inicia sem os mocks e as chamadas à API falham.
- `.env.production`: versionado e usado por `npm run build`. Mantém os mocks ativos no build de demonstração, que é o mesmo publicado na Vercel e usado pelos testes Playwright.

## Credenciais fictícias

| Usuário | E-mail | Senha | Dados iniciais |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@kurio.test` | `Kurio#2026` | Carteira principal (MetaMask, Ethereum) e secundária (Coinbase, Polygon); favoritos: Emerald Ape #042 e Ivory Baron #088 |
| Bruno Tavares | `bruno@kurio.test` | `Kurio#2026` | Carteira principal (WalletConnect, Polygon); favorito: Golden Beat #207 |

Novos usuários podem ser cadastrados em `/register`; eles ficam no banco simulado até o reset.

Cupons:

| Código | Comportamento |
| --- | --- |
| `KURIO10` | Válido, 10% de desconto |
| `GENESIS25` | Expirado (31/01/2025) |
| Qualquer outro no formato `[A-Z0-9]{4,20}` | Inválido |

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com os mocks (requer `.env` com `VITE_ENABLE_MOCKS=true`). |
| `npm run build` | Verificação de tipos e build de produção em `dist/`, com os mocks ativos (`.env.production`). |
| `npm run preview` | Serve o build de `dist/` em http://localhost:4173. |
| `npm run typecheck` | Verificação de tipos (`tsc -b`). |
| `npm run lint` | Lint com Oxlint. |
| `npm run test:e2e` | Testes Playwright. Faz o build, sobe o preview na porta 4173 e roda os projetos `desktop-chromium` e `mobile-chromium`. |
| `npm run test:e2e:report` | Abre o relatório HTML do último teste (`playwright-report/`), com traces das falhas. |

### Testes E2E

Antes da primeira execução, instale o Chromium do Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Para usar o Google Chrome instalado no sistema em vez do Chromium do Playwright:

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

Outras formas úteis:

```bash
npx playwright test e2e/checkout.spec.ts
npx playwright test --project=mobile-chromium
npx playwright test --ui
```

Cada teste parte de um estado isolado: abre a aplicação, restaura o banco simulado com `window.__mocks.reset()` e define cenário, latência e liquidação conforme o caso. Os testes de tempo real passam pelo `socket.io-client` e os de REST pelos handlers do MSW. Traces e capturas são mantidos apenas nas falhas.

## Cenários da API simulada

O banco simulado fica no `localStorage` do navegador (chave `kurio.mocks.db.v3`) e sobrevive ao refresh. As configurações de cenário, latência, TTL de sessão e liquidação ficam em `kurio.mocks.settings.v1`.

### Cenários disponíveis

| Cenário | Efeito |
| --- | --- |
| `success` | Tudo funciona normalmente (padrão). |
| `empty-catalog` | Catálogo sem itens e detalhes respondem 404. |
| `variable-latency` | Latência variável, com respostas fora de ordem. |
| `network-error` | Todas as requisições falham na rede. |
| `server-error` | Todas as requisições respondem 500. |
| `service-unavailable` | Todas as requisições respondem 503 até o cenário ser trocado. |
| `transient-failure` | As duas primeiras chamadas de cada endpoint respondem 503; as seguintes funcionam. |
| `session-expired` | Expira as sessões abertas; rotas privadas respondem 401 `SESSION_EXPIRED`. Novos logins funcionam. |
| `unauthorized` | Endpoints privados respondem 401 `UNAUTHENTICATED`. |
| `forbidden` | Endpoints privados respondem 403 `FORBIDDEN`. |
| `register-conflict` | O cadastro responde 409 `EMAIL_TAKEN`. |
| `form-validation` | Formulários válidos no cliente recebem 422 com erros por campo do servidor. |
| `coupon-invalid` | Qualquer cupom responde 422 `COUPON_INVALID`. |
| `coupon-expired` | Qualquer cupom responde 422 `COUPON_EXPIRED`. |
| `price-changed` | Na primeira tentativa de pedido, o preço sobe 10% (com `nft.updated`) e o pedido responde 409 `QUOTE_OUTDATED`. |
| `edition-sold-out` | Na primeira tentativa de pedido, a edição esgota (com `nft.updated`) e o pedido responde 409 `AVAILABILITY_CONFLICT`. |
| `order-timeout` | O pedido é criado, mas a resposta leva 20 s, mais que o timeout do Axios (10 s). O reenvio com a mesma chave de idempotência devolve o mesmo pedido. |
| `payment-confirmed` | O pedido fica pendente por 3 s e é confirmado. |
| `payment-declined` | O pedido fica pendente por 3 s e é recusado; carrinho e estoque ficam intactos. |
| `favorite-failure` | Incluir ou remover favoritos responde 503. |
| `wallet-rejected` | Conectar carteira responde 409 `WALLET_CONNECTION_REJECTED`. |

Latências: `none` (0 ms), `fixed` (300 ms, padrão), `slow` (2,5 s) e `variable` (150 ms a 2 s, sequência pseudoaleatória com semente fixa).

Liquidação dos pedidos: `auto` (padrão; o pedido é liquidado 3 s após a criação) ou `manual` (o pedido fica pendente até `window.__mocks.advanceOrder`).

### Como selecionar

**Painel de simulação.** Botão redondo no canto superior esquerdo da página ("Painel de simulação da API"). Permite escolher cenário e latência, expirar sessões, restaurar os dados e, na seção "Tempo real", ver o estado do socket, derrubar ou recusar conexões e reenviar eventos duplicados ou antigos. Para ocultar o botão, abra qualquer URL com `?mockPanel=hidden`; para exibi-lo de novo, `?mockPanel=visible`.

**Query string.** Em qualquer URL, por exemplo:

```
http://localhost:5173/?scenario=payment-declined
http://localhost:5173/?scenario=variable-latency&latency=variable
http://localhost:5173/checkout?settlement=manual
```

Os valores de `scenario`, `latency` e `settlement` são aplicados, persistidos e removidos da URL antes de a aplicação iniciar. A escolha vale até ser trocada ou até o reset.

**Console do navegador (`window.__mocks`).** Disponível depois que o service worker do MSW assume as requisições:

```js
await window.__mocks.reset()
window.__mocks.setScenario('payment-declined')
window.__mocks.setLatency('slow')
window.__mocks.setSettlement('manual')
window.__mocks.setSessionTtl(30)
window.__mocks.expireSessions()
window.__mocks.getSettings()
window.__mocks.updateNft('emerald-ape-042', { price: '1.29' })
window.__mocks.updateNft('neon-vessel-552', { editionId: 'limited-10', available: 0 })
window.__mocks.advanceOrder('order-0001')
window.__mocks.advanceOrder('order-0001', 'declined')
window.__mocks.dropRealtime()
window.__mocks.refuseRealtime(10)
window.__mocks.replayLastEvent()
window.__mocks.sendStaleEvent()
window.__mocks.getRealtimeStatus()
```

`updateNft` e `advanceOrder` alteram o banco simulado e emitem `nft.updated` e `order.updated` pelo servidor Socket.IO simulado; a interface recebe os eventos pelo `socket.io-client`.

### Como restaurar

- Painel: "Restaurar dados" (recarrega a página).
- Console: `await window.__mocks.reset()` seguido de refresh.

O reset recria catálogo, usuários, carteiras, favoritos e cupons; apaga sessões, carrinhos, cotações, pedidos e conexões de carteira; cancela liquidações pendentes; e volta ao cenário `success`, com latência `fixed` e liquidação `auto`.

## Como reproduzir os fluxos de falha

Os passos abaixo partem de um banco restaurado. Os cenários podem ser escolhidos pelo painel ou pela query string indicada.

### Sucesso e resultado vazio

- Sucesso: cenário padrão. Navegue pelo catálogo, entre com `ana@kurio.test`, adicione um NFT ao carrinho e conclua a compra.
- Busca sem resultado: digite um termo inexistente na busca do catálogo.
- Catálogo vazio: `/?scenario=empty-catalog`. O catálogo mostra o estado vazio e qualquer `/nfts/<id>` mostra "não encontrado".
- Recurso inexistente: abra `/nfts/nao-existe` ou `/orders/order-9999` (logado).

### Latência variável e respostas fora de ordem

- `/?latency=slow`: os skeletons com shimmer aparecem no catálogo, no detalhe, no carrinho e no pagamento.
- `/?scenario=variable-latency`: altere filtros e busca em sequência rápida; respostas antigas que chegam depois não substituem o resultado mais recente.

### Falhas de conexão e HTTP 4xx/5xx

- `/?scenario=network-error`: as telas mostram a falha de conexão com "Tentar novamente".
- `/?scenario=server-error` ou `/?scenario=service-unavailable`: as telas mostram o erro da API. Troque para `success` e use "Tentar novamente" para recuperar.
- `/?scenario=transient-failure`: as primeiras chamadas falham e as novas tentativas recuperam a tela sem refresh.
- Tempo real: no painel, seção "Tempo real", use "Derrubar conexão" ou "Recusar reconexões" por alguns segundos (ou `window.__mocks.dropRealtime()` e `window.__mocks.refuseRealtime(10)`). A interface indica a reconexão e, ao reconectar, refaz pela API as consultas ativas.

### Sessão expirada e acesso não autorizado

- Entre com `ana@kurio.test`, vá para `/checkout` e preencha parte do formulário. Use "Expirar sessões" no painel (ou ative `session-expired`) e interaja com a tela, por exemplo conectando uma carteira. A aplicação leva a `/login?redirect=/checkout&reason=expired`; ao entrar de novo com Ana, o rascunho do checkout é recuperado.
- Expiração por tempo: `window.__mocks.setSessionTtl(10)` antes do login; a sessão expira 10 s depois.
- Acesso sem login: abra `/checkout` ou `/orders/order-0001` sem sessão; a aplicação redireciona para o login e volta ao destino depois de entrar.
- `/?scenario=unauthorized` ou `/?scenario=forbidden`, logado: os endpoints privados respondem 401 ou 403 e a interface trata o erro.

### Conflito de cadastro e validação de formulário

- `/register?scenario=register-conflict`: qualquer e-mail recebe "e-mail já cadastrado" no campo. Sem o cenário, cadastrar `ana@kurio.test` produz o mesmo conflito.
- `/register?scenario=form-validation`: o servidor devolve erro no campo de nome de usuário, associado ao campo e anunciado.
- Checkout com `form-validation`: ao confirmar o pedido, o servidor devolve erro no campo de código de indicação.
- Validação no cliente: envie os formulários de login, cadastro e pagamento vazios ou com valores inválidos.

### Cupom inválido ou expirado

- No carrinho, aplique `GENESIS25` (expirado) ou `NAOEXISTE` (inválido). `KURIO10` aplica 10% de desconto.
- `/cart?scenario=coupon-invalid` ou `/cart?scenario=coupon-expired`: qualquer cupom é recusado com a mensagem correspondente.

### Preço alterado ou edição esgotada durante a compra

- Pelo cenário: com itens no carrinho, ative `price-changed` ou `edition-sold-out` e confirme o pedido no checkout. A revisão mostra o que mudou (de/para) e exige revisar a nova cotação; com edição esgotada, é preciso ajustar o carrinho.
- Pelo Socket.IO: com o checkout ou o carrinho aberto, execute `window.__mocks.updateNft('emerald-ape-042', { price: '1.31' })` (com Emerald Ape #042 no carrinho). O evento `nft.updated` chega pelo socket, o aviso aparece e a cotação é refeita pela API.
- Esgotar uma edição: `window.__mocks.updateNft('<id-do-nft>', { editionId: '<id-da-edição>', available: 0 })`.
- Eventos duplicados ou antigos: no painel, "Reenviar último evento" e "Enviar evento antigo" (ou `replayLastEvent()` e `sendStaleEvent()`). A interface ignora ambos.

### Timeout após criação do pedido, com recuperação por idempotência

1. Entre, monte o carrinho e vá ao checkout.
2. Ative `order-timeout`.
3. Confirme o pedido. Após 10 s, a requisição expira; a tela informa que está verificando o pedido e reenvia com a mesma chave de idempotência.
4. A API devolve o pedido já criado, sem duplicar, e a aplicação abre `/orders/<id>`.

Também é possível dar refresh durante a espera: ao reabrir o checkout, a tentativa é reenviada com a mesma chave. Cliques repetidos em "Confirmar e enviar pedido" geram uma única requisição.

### Pagamento confirmado e pagamento recusado

- Confirmado: cenário `success` ou `payment-confirmed`. A tela do pedido fica em "Aguardando confirmação do pagamento" e muda para o recibo quando chega o `order.updated` (cerca de 3 s).
- Recusado: `payment-declined`. A tela mostra "Pagamento recusado" com o motivo; os itens continuam no carrinho.
- Controle manual: abra `?settlement=manual`, faça o pedido e, com a tela pendente aberta, execute `window.__mocks.advanceOrder('order-0001')` ou `window.__mocks.advanceOrder('order-0001', 'declined')`.
- Retomada de pedido pendente: com `settlement=manual`, derrube o socket (`dropRealtime()`), liquide o pedido com `advanceOrder` e aguarde a reconexão; a tela consulta a API e mostra o estado final. Refresh na tela pendente também consulta a API sem reenviar o pedido.

### Favoritos com falha

- Logado, ative `favorite-failure` e clique no coração de um NFT. O estado muda na hora, a API recusa, o estado anterior é restaurado e a falha é anunciada.

### Carteira recusada

- No checkout, ative `wallet-rejected` e clique em "Conectar" em uma carteira. A conexão é recusada e a mensagem é exibida junto à carteira.

## Deploy

O build publicado na Vercel é o resultado de `npm run build` com `.env.production`, com a API simulada e o tempo real ativos. O `vercel.json` reescreve todas as rotas para `index.html` (acesso direto e refresh em qualquer rota) e serve `mockServiceWorker.js` sem cache e com escopo na raiz.
