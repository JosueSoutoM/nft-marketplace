# Arquitetura

## Visão geral

Kurio é um marketplace de NFTs construído como SPA com React, TypeScript e Vite. O roteamento usa TanStack Router com rotas baseadas em arquivos, o estado remoto usa TanStack Query e todas as chamadas REST passam por um cliente Axios. A API e os eventos em tempo real são simulados na camada de rede com MSW, ativada pela variável `VITE_ENABLE_MOCKS`. A interface usa Tailwind CSS e componentes shadcn/ui adaptados aos tokens do Figma.

## Estrutura de pastas

```
e2e/                      testes Playwright e utilitários de controle dos mocks
public/
  images/nfts/            imagens dos NFTs em WebP, servidas pela API simulada
  mockServiceWorker.js    service worker do MSW (gerado por `msw init`)
src/
  api/                    cliente Axios, ApiError, sessão armazenada e funções REST por recurso
    contracts/            tipos e constantes compartilhados entre cliente e mocks
  assets/icons/           SVGs otimizados (Google e Facebook)
  components/
    account/              menu lateral "Meu perfil", layout das telas de conta, skeleton e erro de carga
    profile/              tela de perfil: dados, avatar com prévia e troca de senha
    wallets/              tela de carteiras: principal e secundária, resumo e formulário com validação por rede
    cart/                 tela do carrinho: itens, quantidade, cupom, resumo, avisos, estados e contador
    order/                tela do pedido: pendente, confirmado (recibo), recusado, não encontrado, explorador simulado e cópia do ID
    checkout/             pagamento: formulário do colecionador, carteiras, resumo da cotação, revisão, revalidação e envio idempotente
    catalog/              catálogo: busca, filtros, segmentos, ordenação, grade, estados e paginação
    favorites/            botão de favorito (card, detalhe desktop e detalhe mobile)
    home/                 seções da tela inicial: banner, NFT em destaque, chamadas e Diário da Cunhagem
    icons/                ícones de redes sociais em SVG inline
    layout/               header (com busca), footer, barra inferior mobile, 404 e utilitários de layout
    nft/                  componentes de NFT reutilizados entre telas (imagem responsiva)
    ui/                   componentes shadcn/ui adaptados aos tokens
  hooks/                  hooks de dados (TanStack Query) e do estado do catálogo na URL
  lib/                    QueryClient, search params do catálogo, chaves de query, anunciador aria-live, aritmética de ETH e utilitários
  mocks/                  API simulada (MSW): banco, fixtures, cenários, handlers, servidor Socket.IO e painel
  realtime/               cliente Socket.IO, aplicação de eventos no cache e estado da conexão
  routes/                 rotas do TanStack Router (uma rota por arquivo)
    _authenticated/       rotas privadas agrupadas em layout próprio
  index.css               tokens do design system e estilos globais
  main.tsx                inicialização dos mocks, Query, ponte de tempo real e Router
  router.ts               instância do router e tipagem de `staticData`
  routeTree.gen.ts        árvore de rotas gerada pelo plugin do TanStack Router
```

## Rotas

| Caminho | Arquivo | Tela | Acesso |
| --- | --- | --- | --- |
| `/` | `routes/index.tsx` | Início (com `favorites=true`, lista de favoritos) | Público; privado com `favorites=true` |
| `/nfts/$nftId` | `routes/nfts.$nftId.tsx` | Detalhes do NFT | Público |
| `/cart` | `routes/cart.tsx` | Carrinho | Público |
| `/login` | `routes/_auth/login.tsx` | Login (diálogo sobre o início a partir de 768 px) | Público |
| `/register` | `routes/_auth/register.tsx` | Cadastro (diálogo sobre o início a partir de 768 px) | Público |
| `/checkout` | `routes/_authenticated/checkout.tsx` | Pagamento | Privado |
| `/orders/$orderId` | `routes/_authenticated/orders.$orderId.tsx` | Confirmação de pedido | Privado |
| `/profile` | `routes/_authenticated/profile.tsx` | Perfil do colecionador | Privado |
| `/wallets` | `routes/_authenticated/wallets.tsx` | Carteiras | Privado |
| qualquer outro | `notFoundComponent` da raiz | Página não encontrada | Público |

- As rotas privadas ficam sob o layout `_authenticated`, que não altera a URL e verifica a sessão no `beforeLoad` (ver "Sessão").
- Login e cadastro ficam sob o layout `_auth`, que também não altera a URL.
- `/` guarda o estado do catálogo na URL (ver "Estado do catálogo na URL").
- `/nfts/$nftId` aceita o search param `edition` (ver "Detalhe do NFT").
- `/login` e `/register` aceitam os search params `redirect` e `reason`. Apenas caminhos internos são aceitos (iniciados por `/` e não por `//`); qualquer outro valor é descartado. O botão "Entrar" do header envia a URL atual como `redirect`.
- `staticData.mobileActionBar` indica que a tela tem barra de ação fixa no mobile (detalhe, com quantidade, preço, "Comprar NFT" e carrinho): o layout raiz reserva 192 px no fim da página e afasta as notificações dessa barra.
- `staticData.hideMobileTabBar` oculta a barra inferior no mobile nas telas que, no Figma, têm barra de ação própria ou ocupam a tela inteira: detalhes, carrinho, pagamento, login e cadastro.
- O acesso direto e o refresh funcionam em qualquer rota: no desenvolvimento e no preview pelo fallback de SPA do Vite, e na Vercel pelo rewrite de `vercel.json`.

## Contratos REST

Os tipos ficam em `src/api/contracts/` e são importados tanto pelo cliente (`src/api/`) quanto pelos handlers do MSW, de modo que transporte e simulação compartilham um único contrato.

### Convenções

- Base `/api` (`VITE_API_URL`). Corpo e respostas em JSON, exceto o upload de avatar (`multipart/form-data`).
- Sessão: header `Authorization: Bearer <token>`. O token é opaco, gerado aleatoriamente, e expira conforme o TTL da sessão.
- Carrinho do visitante: header `X-Guest-Cart-Id` com um identificador gerado no cliente. Após o login, `POST /api/cart/merge` incorpora o carrinho do visitante ao do usuário.
- Pedidos: header `Idempotency-Key` obrigatório em `POST /api/orders`.
- Valores em ETH são strings decimais (até 18 casas, por exemplo `"1.19"`). Quantidades, estoques e versões são inteiros. Datas em ISO 8601 (UTC).
- Arrays em query string são enviados repetindo a chave: `?category=music&category=gaming`.
- Dados privados (favoritos, carrinho, pedidos, perfil, carteiras) nunca aparecem em respostas públicas. O catálogo não traz `isFavorite`; o estado de favorito vem de `GET /api/favorites`, para que o cache público não dependa do usuário.

### Formato de erro

Todas as respostas de erro seguem `{ "error": { "code", "message", "fieldErrors"?, "details"? } }`. `fieldErrors` associa mensagens a campos (em objetos aninhados, com caminho por ponto, como `collector.email`). `details` só aparece nos conflitos de disponibilidade e de cotação:

- `details.availability`: lista de `AvailabilityIssue` (`nftId`, `editionId`, `cartItemId`, `requested`, `available`, `maxQuantity` e `reason`, que é `STOCK` quando o limite vem do estoque ou `ORDER_LIMIT` quando vem do limite por pedido);
- `details.quoteChanges`: lista de `QuoteChange` (o que mudou desde a cotação);
- `details.currentQuote`: a cotação recalculada, já gravada, para o cliente pedir nova confirmação.

| Status | Códigos | Uso |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | JSON inválido, query string inválida ou header obrigatório ausente (`X-Guest-Cart-Id`, `Idempotency-Key`) |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | Sem token ou token desconhecido; sessão expirada; e-mail ou senha incorretos no login |
| 403 | `FORBIDDEN` | Sem permissão (cenário `forbidden`) |
| 404 | `NOT_FOUND` | Recurso inexistente ou de outro usuário |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `AVAILABILITY_CONFLICT`, `QUOTE_OUTDATED`, `IDEMPOTENCY_KEY_REUSED`, `WALLET_CONNECTION_REJECTED`, `WALLET_NOT_CONNECTED` | Conflitos de estado |
| 413 | `PAYLOAD_TOO_LARGE` | Avatar acima do limite |
| 422 | `VALIDATION_ERROR`, `COUPON_INVALID`, `COUPON_EXPIRED`, `CART_EMPTY` | Validação de corpo, sempre com `fieldErrors` quando há campo associado |
| 500 | `INTERNAL_ERROR` | Erro inesperado |
| 503 | `SERVICE_UNAVAILABLE` | Falha transitória |

No cliente, um interceptor do Axios converte qualquer falha em `ApiError` (`status`, `code`, `message`, `fieldErrors`, `details`). Falhas sem resposta HTTP recebem `status: 0` e um código de cliente: `NETWORK_ERROR`, `TIMEOUT`, `CANCELED` ou `UNKNOWN_ERROR`. `ApiError.isTransient` indica rede, timeout ou 5xx. Todas as funções REST aceitam `AbortSignal`.

### Cliente REST (`src/api/`)

Uma função tipada por endpoint, agrupadas por recurso: `auth.ts`, `nfts.ts`, `networks.ts`, `favorites.ts`, `cart.ts`, `quotes.ts`, `orders.ts`, `profile.ts` e `wallets.ts`. Os headers de protocolo são montados apenas nessa camada:

- `Authorization`: interceptor do Axios, a partir de `session-token.ts`.
- `X-Guest-Cart-Id`: `guest-cart.ts` gera um UUID e o guarda em `localStorage` (`kurio.guest-cart-id`). As funções de carrinho e cotação enviam esse header apenas quando não há sessão. `mergeGuestCart()` envia o identificador no corpo e o apaga após o merge.
- `Idempotency-Key`: `createOrder(body, { idempotencyKey })` exige a chave, e `createIdempotencyKey()` a gera. A chave pertence à tentativa de compra: reenvios da mesma tentativa reutilizam a chave; uma nova confirmação, depois de uma cotação nova, usa outra (ver "Pagamento").
- Timeout de `createOrder`: 10 s (`ORDER_REQUEST_TIMEOUT_MS`), medido por um `setTimeout` que aborta a requisição e a converte em `ApiError` `TIMEOUT`. As demais chamadas usam o `timeout` nativo do Axios. O timer em JavaScript torna o timeout do pedido controlável pelo relógio do Playwright (`page.clock`), o que o timeout do XHR não permite.

### Endpoints

Todos os endpoints estão implementados. A coluna "Sessão" indica se o endpoint exige token; "Visitante ou sessão" aceita o token ou, sem ele, o header `X-Guest-Cart-Id`.

| Método e caminho | Sessão | Corpo / query | Resposta |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Não | `RegisterRequest` | `201 AuthResponse`; 409 `EMAIL_TAKEN`/`USERNAME_TAKEN`; 422 |
| `POST /api/auth/login` | Não | `LoginRequest` | `200 AuthResponse`; 401 `INVALID_CREDENTIALS`; 422 |
| `GET /api/auth/session` | Sim | — | `200 Session`; 401 `UNAUTHENTICATED`/`SESSION_EXPIRED` |
| `POST /api/auth/logout` | Não | — | `204` (idempotente; invalida o token enviado e desconecta as carteiras do usuário) |
| `GET /api/nfts` | Não (sim com `favorites=true`) | `NftListQuery` | `200 NftListResponse`; 400; 401 com `favorites=true` sem sessão |
| `GET /api/nfts/:nftId` | Não | — | `200 Nft`; 404 |
| `GET /api/networks` | Não | — | `200 NetworkListResponse` (rede, taxa estimada, base do explorador) |
| `GET /api/favorites` | Sim | — | `200 FavoriteListResponse` (mais recentes primeiro) |
| `PUT /api/favorites/:nftId` | Sim | — | `200 Favorite` (idempotente); 404 |
| `DELETE /api/favorites/:nftId` | Sim | — | `204` (idempotente) |
| `GET /api/cart` | Visitante ou sessão | `X-Guest-Cart-Id` sem sessão | `200 Cart` (criado vazio se não existir); 400 sem dono |
| `POST /api/cart/items` | Visitante ou sessão | `AddCartItemRequest` | `200 Cart`; 404 NFT/edição; 409 `AVAILABILITY_CONFLICT`; 422 quantidade |
| `PATCH /api/cart/items/:itemId` | Visitante ou sessão | `UpdateCartItemRequest` | `200 Cart`; 404; 409 `AVAILABILITY_CONFLICT`; 422 |
| `DELETE /api/cart/items/:itemId` | Visitante ou sessão | — | `200 Cart` (idempotente) |
| `PUT /api/cart/coupon` | Visitante ou sessão | `ApplyCouponRequest` | `200 Cart`; 422 `VALIDATION_ERROR`/`COUPON_INVALID`/`COUPON_EXPIRED` |
| `DELETE /api/cart/coupon` | Visitante ou sessão | — | `200 Cart` |
| `POST /api/cart/merge` | Sim | `MergeCartRequest` | `200 MergeCartResponse` (`cart` e `adjustments`); 422 |
| `POST /api/quotes` | Visitante ou sessão | `CreateQuoteRequest` | `201 Quote`; 422 `CART_EMPTY`/`VALIDATION_ERROR` |
| `POST /api/orders` | Sim | `CreateOrderRequest` + `Idempotency-Key` | `201 Order` (`pending`); `200` com o mesmo pedido e header `Idempotent-Replayed: true` ao repetir a chave; 400; 404 cotação; 409 `QUOTE_OUTDATED`/`AVAILABILITY_CONFLICT`/`IDEMPOTENCY_KEY_REUSED`/`WALLET_NOT_CONNECTED`; 422 |
| `GET /api/orders` | Sim | `?status=pending\|confirmed\|declined` | `200 OrderListResponse` (mais recentes primeiro) |
| `GET /api/orders/:orderId` | Sim | — | `200 Order`; 404 (inexistente ou de outro usuário) |
| `GET /api/profile` | Sim | — | `200 Profile` |
| `PATCH /api/profile` | Sim | `UpdateProfileRequest` | `200 Profile`; 409 `EMAIL_TAKEN`/`USERNAME_TAKEN`; 422 |
| `PUT /api/profile/avatar` | Sim | `multipart/form-data` (campo `avatar`, PNG/JPEG/WebP, até 512 KB) | `200 Profile`; 400; 413; 422 |
| `DELETE /api/profile/avatar` | Sim | — | `200 Profile` |
| `POST /api/profile/password` | Sim | `ChangePasswordRequest` | `204`; 422 |
| `GET /api/wallets` | Sim | — | `200 WalletListResponse` (principal primeiro, com `connection`) |
| `PUT /api/wallets/:slot` | Sim | `UpsertWalletRequest` (`slot` = `primary` ou `secondary`) | `201 Wallet` ao criar, `200` ao atualizar; 404 slot; 422 |
| `POST /api/wallets/:walletId/connect` | Sim | `ConnectWalletRequest` | `200 WalletConnection`; 404; 409 `WALLET_CONNECTION_REJECTED`; 422 |
| `POST /api/wallets/:walletId/disconnect` | Sim | — | `200 WalletConnection`; 404 |

### Catálogo (`GET /api/nfts`)

| Parâmetro | Valores | Padrão |
| --- | --- | --- |
| `q` | texto (até 100 caracteres), busca em nome, criador e coleção, sem diferenciar acentos e maiúsculas | — |
| `category` | repetível: `digital-art`, `photography`, `music`, `3d-art`, `collectibles`, `generative`, `gaming`, `subscriptions`, `utility` | todas |
| `network` | repetível: `ethereum`, `polygon`, `solana` | todas |
| `minPrice`, `maxPrice` | string ETH, aplicados ao preço da edição padrão | — |
| `segment` | `all`, `new` (novos lançamentos), `trending` (em alta) | `all` |
| `collection` | identificador da coleção (para "Mais desta coleção") | — |
| `featured` | `true` ou `false` (destaques do banner e "NFT em destaque") | — |
| `favorites` | `true` restringe a lista aos favoritos do usuário do token (exige sessão; sem token responde 401); facetas e faixa de preço passam a considerar só os favoritos | `false` |
| `sort` | `recent` (listados recentemente), `price-asc`, `price-desc`, `name-asc`, `rating-desc` | `recent` |
| `page`, `pageSize` | inteiros; `pageSize` entre 1 e 48 | `1`, `9` |

A resposta traz `items`, `total`, `page`, `pageSize`, `totalPages` e `facets`. Nas facetas, a contagem de cada categoria considera todos os filtros exceto o de categoria (o mesmo vale para rede), de modo que a barra lateral mostra quantos resultados cada opção produziria. `priceRange` traz o menor e o maior preço do catálogo. Página além do total responde `200` com `items` vazio.

Cada NFT tem edições (`1/1`, `1/10`, `1/50`, `Aberta`) com estoque inteiro (`available`), limite por pedido (`maxPerOrder`), preço e preço anterior opcional. `price` e `compareAtPrice` do NFT repetem os da edição padrão (`defaultEditionId`, sempre `1/50`) e são a base de filtro e ordenação. `version` é um inteiro que cresce a cada alteração de preço ou estoque e acompanha os eventos `nft.updated`.

### Carrinho (API)

- Dono: com token, o carrinho do usuário; sem token, o carrinho identificado por `X-Guest-Cart-Id`. Token inválido ou expirado responde 401 e nunca cai para o carrinho de visitante.
- O carrinho guarda apenas `nftId`, `editionId` e quantidade. Preço, disponibilidade, `maxQuantity` e `nftVersion` são lidos do catálogo a cada resposta, então refletem qualquer mudança.
- Quantidades são inteiros de 1 a 1000 (422 caso contrário). Incluir um item que já existe soma as quantidades.
- Disponibilidade: o limite é `maxQuantity = min(available, maxPerOrder)` da edição. Exceder responde `409 AVAILABILITY_CONFLICT` com `details.availability[0].maxQuantity` e `reason` (`STOCK` ou `ORDER_LIMIT`); edição esgotada tem `maxQuantity` 0.
- Cupom: código normalizado para maiúsculas. Fora do formato `[A-Z0-9]{4,20}` responde 422 `VALIDATION_ERROR`; inexistente, 422 `COUPON_INVALID` ("O cupom X não existe…"); vencido, 422 `COUPON_EXPIRED` ("O cupom X expirou em dd/mm/aaaa."). Nos três casos a mensagem também vem em `fieldErrors.code`.
- Merge (`POST /api/cart/merge`, após o login): soma as quantidades do visitante às do usuário, limitando cada linha a `maxQuantity`. Cada limitação aplicada aparece em `adjustments`. O cupom do visitante é mantido se o usuário não tiver um. O carrinho de visitante é apagado.

### Cotação

`POST /api/quotes { network }` valida o carrinho atual e devolve a cotação, que é a referência para o pedido:

- Linhas com preço e disponibilidade atuais e `issue`: `SOLD_OUT`, `INSUFFICIENT_AVAILABILITY` (quantidade acima de `maxQuantity`) ou `PRICE_CHANGED` (preço diferente da cotação anterior do mesmo carrinho, com `previousUnitPrice`).
- Cupom do carrinho revalidado: válido em `coupon`, inválido ou vencido em `couponError` (sem desconto).
- `subtotal` = soma de `unitPrice × quantity`; `discount` = percentual do cupom sobre o subtotal (half-up no wei, nunca maior que o subtotal); `networkFee` = taxa da rede escolhida; `total` = subtotal − desconto + taxa. Tudo calculado com `src/lib/eth.ts`.
- `purchasable` é falso se alguma linha estiver esgotada ou acima do disponível.
- `id` é novo a cada chamada. `version` é um contador por carrinho que só cresce quando o conteúdo muda (itens, quantidades, preços, disponibilidade suficiente ou não, cupom, rede ou taxa). `expiresAt` = criação + 10 minutos.

### Pedidos

**Idempotência.** `POST /api/orders` exige `Idempotency-Key` (8 a 128 caracteres `[A-Za-z0-9_-]`; 400 se ausente). A chave vale por usuário. O servidor guarda uma impressão canônica do corpo validado (chaves ordenadas):

- mesma chave e mesmo conteúdo: devolve o pedido já criado (`200`, `Idempotent-Replayed: true`), no estado atual, sem revalidar nem criar outro;
- mesma chave e conteúdo diferente: `409 IDEMPOTENCY_KEY_REUSED`;
- tentativa rejeitada (409 de cotação, 422) não registra a chave.

A verificação da chave e a criação do pedido acontecem no mesmo trecho síncrono do handler, então cliques repetidos simultâneos também resultam em um único pedido.

**Revalidação.** Antes de criar o pedido, o servidor:

1. exige carrinho não vazio (`422 CART_EMPTY`) e cotação existente (`404`);
2. resolve a carteira: salva precisa pertencer ao usuário e estar conectada na rede do pedido (`409 WALLET_NOT_CONNECTED`); "outra carteira" exige tipo e endereço válidos para a rede;
3. se a cotação é de outro carrinho (por exemplo, cotada como visitante antes do merge), responde `409 QUOTE_OUTDATED` com `ITEMS_CHANGED`;
4. recalcula a cotação com o estado atual e compara com a cotação enviada: `QUOTE_EXPIRED`, `QUOTE_VERSION_MISMATCH`, `NETWORK_CHANGED`, `ITEMS_CHANGED`, `PRICE_CHANGED`, `AVAILABILITY_CHANGED`, `COUPON_CHANGED` e `NETWORK_FEE_CHANGED`;
5. se algum item ficou indisponível, responde `409 AVAILABILITY_CONFLICT`; se houve qualquer outra mudança, `409 QUOTE_OUTDATED`. Nos dois casos `details` traz as mudanças e a nova cotação (`currentQuote`), que o usuário precisa confirmar com uma nova tentativa.

**Máquina de estados.**

```
pending ──(liquidação)──▶ confirmed   (terminal)
   └─────(liquidação)──▶ declined    (terminal)
```

- O pedido nasce `pending` (`version` 1) com o resultado planejado: `declined` no cenário `payment-declined`, `confirmed` nos demais. A liquidação ocorre 3 s depois (`settleAt`, gravado no banco), por timer. Se a página recarregar, os pedidos pendentes são reagendados ao iniciar os mocks; leituras (`GET /api/orders`, `GET /api/orders/:id` e o replay idempotente) também liquidam pedidos vencidos.
- Confirmação: confere o estoque de cada edição. Se faltar, o pedido vira `declined` com `AVAILABILITY_LOST` e nada muda. Caso contrário, baixa o estoque (emitindo `nft.updated`), remove do carrinho do usuário apenas os itens e quantidades comprados e grava `transaction` (hash de 64 hex derivado do pedido e endereço do explorador simulado da rede, em `explorer.kurio.test`, domínio reservado que não leva a nenhum explorador real).
- Recusa: `decline.code = PAYMENT_DECLINED`; estoque, itens e cupom do carrinho ficam intactos.
- Não há reserva de estoque entre a criação e a confirmação: o estoque só é baixado na confirmação, e um pedido cujo estoque acabou nesse intervalo é recusado com `AVAILABILITY_LOST`.
- Cada transição incrementa `version` e emite `order.updated`. Estados terminais nunca mudam; `advanceOrder` em um pedido terminal devolve o pedido inalterado.

**Remoção parcial do carrinho.** Na confirmação, para cada linha do recibo, a quantidade comprada é subtraída do item correspondente (mesmo NFT e edição) no carrinho atual do usuário, e itens que chegam a zero são removidos. Itens ou quantidades adicionados depois da criação do pedido permanecem. O cupom usado no pedido é consumido: se o carrinho ainda tiver esse mesmo cupom, ele é removido. Na recusa (incluindo `AVAILABILITY_LOST`) ou em qualquer falha antes da criação, itens e cupom permanecem.

**Recibo.** `receipt` é um snapshot gravado na criação (clonado, sem referências ao catálogo): linhas com nome, token, imagem, edição, quantidade, preço unitário e total da linha, cupom, subtotal, desconto, taxa, total, rede, carteira (tipo, endereço e rótulo, por exemplo "MetaMask"), dados do colecionador e observação. Mudanças posteriores no catálogo não o alteram. `transaction` é preenchido apenas na confirmação.

### Perfil e carteiras

- Perfil: nome de exibição (2 a 50), nome de usuário (padrão do cadastro, único), e-mail (único), nome ENS (`nome.eth`) e apelido da carteira (2 a 40), todos obrigatórios como no Figma. O contrato tipa `ensName` e `walletNickname` como `string | null` porque contas recém-cadastradas ainda não os têm, mas o servidor recusa `null` ou vazio na atualização (422).
- Avatar: PNG, JPEG ou WebP até 512 KB. O tipo declarado precisa coincidir com a assinatura dos bytes do arquivo. Fica guardado como data URL no banco.
- Senha: exige a senha atual (422 em `currentPassword` se estiver errada), aplica a política do cadastro, recusa senha igual à atual, guarda novo salt e hash e encerra as outras sessões do usuário, mantendo a atual.
- Carteiras: principal e secundária por usuário. Endereço validado pela rede: Ethereum e Polygon `0x` + 40 hex; Solana base58 com 32 a 44 caracteres. "ENS ou carteira secundária" aceita `nome.eth` ou endereço da mesma rede. A secundária exige a principal; com `{ sameAsPrimary: true }` ela copia a principal e acompanha suas alterações. Trocar endereço ou rede desfaz a conexão.
- Conexão simulada: `connect` registra a carteira como conectada em uma rede, `disconnect` a desconecta e o logout desconecta todas as carteiras do usuário. O estado aparece em `Wallet.connection`.

### Isolamento por usuário

- Todo endpoint privado obtém o usuário a partir do token e filtra os dados por ele. Nenhum endpoint aceita `userId` do cliente.
- Recursos de outro usuário respondem `404`, sem revelar a existência: pedidos, carteiras (inclusive `connect`/`disconnect`) e itens de carrinho, porque cada busca já é feita dentro do usuário.
- A chave de idempotência vale por usuário.
- Sem token, endpoints privados respondem `401 UNAUTHENTICATED`. Com sessão expirada (por TTL, pelo botão "Expirar sessões" ou pelo cenário `session-expired`), respondem `401 SESSION_EXPIRED`, inclusive no carrinho.
- Cada mudança do barramento de pedidos carrega o `userId` dono, para que o transporte em tempo real entregue o evento apenas a esse usuário.

### Aritmética de ETH

`src/lib/eth.ts` converte strings decimais para `bigint` em wei (18 casas) e oferece soma, subtração, multiplicação por inteiro, percentual (arredondamento half-up no wei), comparação, mínimo, máximo, leitura de entrada com vírgula e formatação. Nenhum valor monetário passa por `number`. As mesmas funções são usadas pelo cliente e pelos mocks.

## Eventos Socket.IO

### Eventos

| Evento | Destinatários | `data` | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | Todas as conexões, inclusive visitantes | `editions`, `price`, `compareAtPrice` | Atualiza o detalhe, os itens das listas, o índice e as listas de favoritos em cache; invalida carrinho e cotação |
| `order.updated` | Somente a conexão autenticada como dona do pedido | `Order` completo | Atualiza o pedido em cache (nunca regride um estado terminal); invalida as listas de pedidos; na confirmação, invalida carrinho e cotação; anuncia o resultado só quando a tela do pedido não está aberta |

Os dois eventos têm o mesmo envelope (`src/api/contracts/events.ts`):

```ts
interface RealtimeEvent {
  id: string
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  userId: string | null
  occurredAt: string
  data: ...
}
```

- `id`: identidade estável do evento (UUID). Reenvios do mesmo evento repetem o `id`.
- `resource`: tipo e identificador do recurso afetado.
- `version`: versão do recurso depois da mudança (`Nft.version` ou `Order.version`), estritamente crescente por recurso.
- `userId`: dono do pedido em `order.updated`; `null` em `nft.updated`.

O payload trafega como objeto JSON no pacote de evento do Socket.IO (`42["nft.updated",{...}]`).

### Conexão e autenticação

- Cliente: `socket.io-client` com `path: '/realtime'`, `transports: ['websocket']`, `autoConnect: false` e `forceNew: true`. A URL é a da própria página, então funciona igual em desenvolvimento, preview e Vercel.
- O token da sessão vai no payload `auth` do pacote CONNECT do Socket.IO (`40{"token":"…"}`). Sem sessão, `auth` é `{}` e a conexão é de visitante.
- A alternativa seria a query string (`?token=`), que o binding também permitiria ler pela URL. Ela foi descartada porque coloca o token na URL, onde fica sujeito a logs e histórico. O `auth` é o mecanismo previsto pelo Socket.IO para credenciais e é reenviado a cada reconexão.
- O servidor simulado guarda apenas o SHA-256 do token. Quando o token é desconhecido, a conexão é tratada como visitante, não recusada.
- O filtro por usuário é feito a cada evento, no momento da entrega, porque o binding não tem rooms: um `order.updated` só é enviado se o hash do token da conexão corresponder a uma sessão ativa, não expirada, do dono do pedido. Uma conexão cuja sessão expirou ou saiu deixa de receber eventos privados imediatamente, mesmo antes de reconectar.

## Sessão

### Armazenamento

- `src/api/session-token.ts` guarda apenas `{ token, userId }` em `localStorage` (`kurio.session`). Nenhuma senha é guardada no cliente; o token é opaco. O módulo expõe um snapshot reativo (`subscribeSession`, `getSessionSnapshot`) com o motivo do último encerramento (`logout`, `expired` ou `invalid`).
- O interceptor de requisição do Axios envia `Authorization: Bearer <token>`. O de resposta encerra a sessão quando uma requisição feita com o token atual recebe 401 `SESSION_EXPIRED` (motivo `expired`) ou `UNAUTHENTICATED` (motivo `invalid`). Erros de requisições feitas com um token antigo são ignorados.
- Os dados do usuário (`Session`) ficam no TanStack Query em `['user', userId, 'session']`, dentro do prefixo privado do usuário.

### Recuperação após refresh

- `useSession()` (`src/hooks/use-session.ts`) lê o snapshot e, se há token, consulta `GET /api/auth/session`. Devolve `anonymous`, `pending` (com `isError` em falha transitória) ou `authenticated` com o usuário. O `staleTime` é de 60 s, e um `refetchInterval` agendado para o `expiresAt` da sessão detecta a expiração por TTL mesmo sem outras requisições.
- `loadSession(queryClient)` faz a mesma consulta com `staleTime: 0` e é usada pelos `beforeLoad` das rotas. Um 401 devolve `null` (o interceptor já encerrou a sessão); outras falhas são propagadas.
- O header (desktop e tablet) mostra avatar, nome e um menu (Dados do perfil, Carteiras e Sair); enquanto a sessão carrega, um skeleton do mesmo tamanho. No mobile, a aba "Perfil" da barra inferior vira o mesmo menu, com o avatar. Sem avatar, aparecem as iniciais do nome.

### Perfil e carteiras

- Perfil: o campo "Nome ENS" usa o sufixo fixo `.eth`, como no pagamento, no lugar do seletor do Figma. "Alterar senha" ganhou uma linha de instrução (preenchimento opcional e política da senha). O avatar ganhou a dica de formato e tamanho e o estado da prévia; "Remover" vira "Descartar" ou "Desfazer" conforme o que está pendente.
- Carteiras: o Figma mostra a carteira principal sempre como formulário e a ação "Adicionar". Aqui uma carteira cadastrada aparece como resumo com "Editar", e o formulário abre por essa ação (ou direto, quando não há carteira principal). O título da página ("Carteiras") é um `h1` visualmente oculto; os títulos visíveis são os das seções, como no frame.
- Mobile e tablet (sem frame): o menu lateral vira uma faixa horizontal rolável e os campos ficam em uma coluna abaixo de 768 px. O botão "Salvar" ocupa a largura toda no mobile.

### Login e cadastro

- `/login` e `/register` ficam sob o layout sem caminho `_auth` (`src/routes/_auth.tsx`), que valida `redirect` (apenas caminhos internos) e `reason` (`expired` ou `invalid`). Com sessão válida, o `beforeLoad` leva direto ao `redirect` (ou a `/`).
- A partir de 768 px, o layout renderiza a tela inicial e, sobre ela, um `Dialog` do shadcn/ui com as abas "Entrar | Criar conta" (links para as duas URLs, preservando o `redirect`). O diálogo continua montado ao trocar de aba. Foco preso, foco inicial no primeiro campo; Esc ou "Fechar" levam ao `redirect` quando ele é público (ou a `/`) e devolvem o foco ao elemento que abriu o diálogo, ou ao conteúdo principal no acesso direto. Abaixo de 768 px, página inteira, como nos frames mobile.
- Validação no cliente com as mesmas funções dos mocks (`src/lib/validation.ts`), sem biblioteca de formulário: são dois formulários pequenos, e `react-hook-form` + `zod` acrescentariam duas dependências sem ganho real. `useAuthForm` (`src/components/auth/use-auth-form.ts`) guarda valores, erros e o resumo, e é reutilizado nos formulários de perfil e carteiras.
- Cada campo tem `label` (visualmente oculto, porque o Figma usa só placeholders), `aria-invalid` e `aria-describedby` com a mensagem de erro. No envio, um resumo (`role="alert"`) é anunciado ("Revise 2 campos: E-mail e Senha.") e o foco vai para o primeiro campo inválido. Os `fieldErrors` da API seguem o mesmo caminho: `EMAIL_TAKEN` aparece no campo de e-mail; `USERNAME_TAKEN` e o 422 do cenário `form-validation`, no de usuário. `INVALID_CREDENTIALS` mostra "E-mail ou senha incorretos. Confira os dados e tente novamente." e foca o e-mail.
- O botão de envio fica desabilitado, com "Entrando…"/"Criando conta…", da requisição até o fim da navegação, e o handler ignora envios enquanto houver um pendente.
- Sucesso (`useLogin`/`useRegister`, `src/hooks/use-auth.ts`): grava a `Session` no cache, salva o token, faz o merge do carrinho do visitante e navega para o `redirect` com `replace`. O resultado é anunciado ("Você entrou como Ana Ribeiro.").
- Login social e "Esqueceu a senha?" seguem o padrão "em breve".

### Merge do carrinho

- Depois do login ou do cadastro, `mergeGuestCart()` chama `POST /api/cart/merge` se existir `kurio.guest-cart-id`. Uma consulta do carrinho já em andamento é cancelada (ela poderia chegar depois e gravar o carrinho anterior ao merge) e a resposta substitui `['user', userId, 'cart']`, a cotação do usuário é invalidada e o identificador do visitante é apagado.
- Cada item de `adjustments` vira uma frase numa notificação ("Neon Vessel #552 (edição 1/50) foi ajustado para 1 unidade (estoque disponível)."); itens esgotados aparecem como removidos.
- Se o merge falhar, o login continua válido, uma notificação informa a falha e o identificador do visitante é mantido para a próxima tentativa.

### Rotas privadas

- O layout `_authenticated` chama `loadSession` no `beforeLoad` a cada navegação privada. Sem sessão, redireciona com `replace` para `/login?redirect=<caminho atual com search e hash>`; se a sessão acabou de ser recusada, acrescenta `reason`. Falha transitória mostra "Não foi possível verificar sua sessão" com "Tentar novamente".
- Os links privados do menu da conta usam `preload={false}`: o preload por intenção rodaria o `beforeLoad` e, com a sessão expirada, encerraria a sessão antes do clique, perdendo o destino.

### Expiração durante a navegação

- Qualquer 401 `SESSION_EXPIRED` com o token atual (consulta da sessão, `beforeLoad`, timer do `expiresAt` ou qualquer endpoint privado) encerra a sessão com motivo `expired`.
- `SessionWatcher` (montado no layout raiz) reage ao encerramento: chama os handlers registrados em `onSessionInterrupted`, mostra a notificação "Sua sessão expirou." e, quando o router está ocioso, leva a `/login?redirect=<onde estava>&reason=expired` com `replace`. Se a expiração aconteceu num `beforeLoad` privado, o próprio redirecionamento da rota já leva ao login com o destino pretendido. Com motivo `invalid`, a navegação só acontece em rota privada.
- A tela de login mostra o aviso da expiração em `role="alert"`, dentro do diálogo, porque fora dele a região `aria-live` global fica com `aria-hidden` enquanto o diálogo está aberto. Ao entrar de novo, o usuário volta ao `redirect`.
- Preservação de contexto (`src/lib/session-resume.ts`), usada pelo checkout (ver "Pagamento"): `onSessionInterrupted(handler)` registra um callback executado antes do redirecionamento, e `saveResumeDraft(key, userId, data)`, `readResumeDraft(key, userId)` e `clearResumeDraft(key)` guardam o rascunho em `sessionStorage` com o dono. O rascunho só é lido pelo mesmo usuário; o logout apaga todos, e um login apaga os de outros usuários.

### Logout e troca de usuário

- "Sair" chama `POST /api/auth/logout` (que invalida o token e desconecta as carteiras) e, mesmo se a chamada falhar, encerra a sessão local e apaga todos os rascunhos de `session-resume` (inclusive o do checkout, com a chave de idempotência guardada). O `SessionWatcher` repete a limpeza ao receber o motivo `logout`, o que cobre também o logout feito em outra aba. O resultado é anunciado ("Você saiu da sua conta.") e, se a tela atual é privada, o usuário vai para `/`.
- `installSessionCacheIsolation` (`src/lib/session-cache.ts`, instalado em `main.tsx` antes do primeiro render) observa o snapshot de forma síncrona. A cada troca de token (login, logout, expiração, troca de usuário ou outra aba), cancela e remove todas as queries `['user', <usuário anterior>]` e `['guest']` e remove as mutations já concluídas. Nada do usuário anterior sobrevive no cache quando o próximo usuário renderiza.
- A consulta da sessão confere se a resposta pertence ao `userId` da chave e falha caso contrário, para que uma resposta atrasada não grave dados de um usuário na chave de outro.
- A ponte de tempo real reinicia o socket a cada troca de token: os listeners do socket anterior são removidos e o novo socket se autentica com o token novo (ver "Ciclo de vida e troca de sessão"). Os testes conferem pelo servidor simulado que, depois do logout, a única conexão é de visitante e, depois do login de Bruno, só existe a conexão de Bruno.
- O evento `storage` propaga login e logout entre abas da mesma origem, com os mesmos efeitos.

### Testes (`e2e/auth.spec.ts`)

Validação dos dois formulários, conflito de e-mail no cadastro, credenciais inválidas, cadastro com redirect, login com retorno ao redirect (com search) e sessão após refresh, redirect externo descartado, rota privada sem login, Esc no diálogo com retorno do foco (desktop), expiração pelo painel durante a navegação com retomada, logout e troca ana → bruno sem vazamento (menu, textos, conexões do socket e header `Authorization` de todas as requisições) e merge do carrinho com ajuste.

## Favoritos

### Dados e chaves

- `useFavoriteIds` (`src/hooks/use-favorites.ts`) consulta `GET /api/favorites` na chave `['user', userId, 'favorites', 'index']`, com `staleTime` de 30 s, e entrega o conjunto de ids favoritados. É a fonte do estado de todos os botões de favorito.
- A lista `/?favorites=true` usa `useCatalogList` (`src/hooks/use-nft-list.ts`) com a chave `['user', userId, 'favorites', 'list', params]` e chama `GET /api/nfts?favorites=true&…` com os mesmos parâmetros do catálogo. A chave privada impede que o cache público de `['nfts', 'list', …]` dependa do usuário. O `placeholderData` só reaproveita a lista anterior se ela for do mesmo dono (catálogo público ou o mesmo usuário); trocar de usuário ou passar do catálogo público para os favoritos mostra o skeleton, nunca itens de outra lista.
- Tudo fica sob `['user', userId]`: o logout e a troca de usuário removem os favoritos do cache (ver "Logout e troca de usuário"). Na API, os favoritos são filtrados pelo usuário do token, então ana e bruno têm listas independentes, persistidas no banco simulado (sobrevivem ao refresh).

### Atualização otimista com rollback

`useFavoriteToggle(nft)` concentra a regra; `FavoriteButton` (`src/components/favorites/favorite-button.tsx`) só exibe o estado e chama `toggle`.

- O estado desejado é lido do cache no momento do clique (`getQueryData`), não do último render, para que cliques seguidos alternem corretamente.
- `onMutate`: cancela o refetch em andamento do índice, guarda se o NFT era favorito (`previous`) e grava o novo estado no índice com `setQueryData`. O botão muda na hora.
- `mutationFn`: `PUT /api/favorites/:nftId` ou `DELETE /api/favorites/:nftId` (ambos idempotentes), sem novas tentativas automáticas.
- `scope: { id: 'favorite:<userId>:<nftId>' }`: mutations do mesmo NFT rodam em série, então os pedidos chegam à API na ordem dos cliques mesmo com latência variável. Os `onMutate` continuam imediatos.
- `onError`: se não há mutation mais nova pendente para o mesmo NFT, restaura `previous` no índice (quando há, é a mais nova que define o estado desejado). Mostra a notificação "Não foi possível favoritar X." (ou "remover X dos favoritos") com "O estado anterior foi restaurado. Tente novamente.", anunciada pela região `aria-live` do Sonner.
- `onSuccess`: anuncia "X foi adicionado aos favoritos." ou "X foi removido dos favoritos." pelo `LiveAnnouncer`.
- `onSettled`: quando é a última mutation de favoritos pendente do usuário, invalida `['user', userId, 'favorites']` (índice e listas) e sincroniza com a API. Isso também corrige qualquer estado intermediário de cliques repetidos.
- Todos os callbacks conferem se o usuário da mutation ainda é o da sessão; se a sessão mudou no meio, nada é escrito no cache.
- Na lista de favoritos, desfavoritar não remove o card na hora: o coração muda imediatamente e a lista é refeita no `onSettled`, para não quebrar o total e a paginação.

### Visitante e rotas

- Visitante que aciona um botão de favorito vai para `/login?redirect=<URL atual>` e volta para a mesma página ao entrar.
- `/?favorites=true` sem sessão: o `beforeLoad` da rota `/` redireciona para `/login?redirect=/?favorites=true…` com `replace`. `isPrivatePath` trata essa URL como privada: o logout nela leva a `/`, e fechar o diálogo de login não volta para ela.
- A aba "Favoritos" da barra mobile e "Lista de interesse" no rodapé levam a `/?favorites=true#catalogo`. Na lista, a aba "Favoritos" fica ativa no mobile e "Mercado" no header.

### Estados da lista

- Vazio sem filtros: "Você ainda não tem favoritos", com o link "Explorar o catálogo".
- Vazio com filtros: "Nenhum favorito encontrado", com "Limpar filtros" (mantém `favorites=true`).
- Acima da grade: "Mostrando apenas os seus favoritos." com o botão "Ver todo o catálogo", que remove `favorites` e mantém os demais filtros.
- Erro: "Não foi possível carregar seus favoritos", com "Tentar novamente". A contagem anunciada usa "favoritos" ("2 favoritos encontrados.").

### Testes (`e2e/favorites.spec.ts`)

Favoritar e desfavoritar no detalhe com persistência após refresh; falha da mutation (`favorite-failure`, latência fixa) com estado otimista, rollback, notificação e recuperação ao tentar de novo; três cliques seguidos terminando em estado consistente após refresh; visitante levado ao login e de volta ao detalhe; visitante em `/?favorites=true` levado ao login e de volta à lista; lista aberta pela aba mobile ou pelo rodapé, combinada com categoria, ordenação e busca, conferindo `favorites=true`, filtros e `Authorization` na requisição; remoção pelo coração do card (mobile); isolamento entre ana e bruno, estado vazio e retorno ao catálogo.

## Carrinho

Tela em `src/routes/cart.tsx` (`CartPage`, em `src/components/cart/`), dados em `src/hooks/use-cart.ts` e regras de texto em `src/lib/cart-changes.ts`.

### Dados e chaves

- `useCart()` consulta `GET /api/cart` na chave `['user', userId, 'cart']` (com sessão) ou `['guest', 'cart']` (visitante, com `X-Guest-Cart-Id`), com `staleTime` de 15 s. O mesmo cache alimenta o contador do header, da barra inferior mobile e do botão de carrinho da barra do detalhe (`itemCount`, a soma das quantidades), então o número é sempre o da API.
- `useCartQuote(cart)` faz `POST /api/quotes { network: 'ethereum' }` na chave `['user', userId, 'quote', 'ethereum']` (ou `['guest', 'quote', 'ethereum']`), só quando o carrinho tem itens. O carrinho cota na Ethereum, a rede padrão; a rede final é escolhida no pagamento.
- O resumo mostra `subtotal`, `discount`, `networkFee` e `total` exatamente como a cotação devolve, formatados com `formatEth`. O cliente não recalcula valores. "Taxa estimada" aparece quando `networkFeeEstimated` é verdadeiro.
- Mutations (`useAddToCart`, `useUpdateCartItem`, `useRemoveCartItem`, `useApplyCoupon`, `useRemoveCoupon`) recebem o carrinho completo da API, gravam no cache com `setQueryData` e invalidam a cotação. Uma resposta só substitui o cache se o `updatedAt` dela for igual ou mais recente que o do cache, para que respostas fora de ordem não regridam o carrinho. Não há atualização otimista no carrinho: quantidade, total e resumo só mudam com a resposta da API.
- Os callbacks conferem se o dono da sessão ainda é o mesmo de quando a mutation começou; se não for, nada é gravado. O isolamento por usuário segue as chaves `['user', id]` e `['guest']` (ver "Logout e troca de usuário").
- `409 AVAILABILITY_CONFLICT` invalida o carrinho e a cotação, para a tela mostrar a disponibilidade atual.

### Adicionar pelo detalhe

- "Comprar" (desktop) e "Comprar NFT" (barra mobile) adicionam a edição selecionada e a quantidade escolhida (`POST /api/cart/items`). O sucesso aparece numa notificação ("Emerald Ape #042 foi adicionado ao carrinho." com "2 unidades da edição 1/50. O carrinho tem 2 itens." e a ação "Ver carrinho"), anunciada pela região `aria-live` do Sonner.
- Conflito de disponibilidade: a notificação mostra a mensagem da API e o máximo ("Você já tem 3 unidades no carrinho. Disponível nesta edição: 3 unidades." ou "Limite por pedido nesta edição: N unidades.").
- Durante o envio, o botão fica com `aria-disabled` e `aria-busy` e ignora novos cliques. Com a edição esgotada, o clique anuncia o motivo.
- O botão de carrinho da barra mobile é um link para `/cart`, com o contador.

### Tela do carrinho

- Cada item mostra imagem, nome, ID do token (desktop), edição, preço unitário (desktop), quantidade, total do item e remover. Os itens são uma lista; o cabeçalho visual da tabela (NFTs, Preço, Edições, Total) fica com `aria-hidden`, e cada valor tem o seu rótulo para leitores de tela ("Preço unitário:", "Total do item (2 unidades × 1.19 ETH):").
- Quantidade: botões e campo numérico. O campo só aceita dígitos e envia ao sair dele ou com Enter (Esc descarta). O valor é limitado a 1 até `maxQuantity`; acima disso, é ajustado e o motivo é anunciado. No limite, "Aumentar" fica com `aria-disabled` e o motivo aparece abaixo, ligado ao campo por `aria-describedby` ("Só restam 3 unidades desta edição." ou "Limite de N unidades por pedido nesta edição.").
- Durante a mutation de um item, os botões e o campo daquele item ficam bloqueados (`aria-disabled`, campo somente leitura), sem perder o foco e sem cliques duplicados. Cada mudança é anunciada ("Quantidade de Emerald Ape #042, edição 1/50 alterada para 2."). Ao remover, o foco vai para a lista de itens (ou para o título do estado vazio).
- Falha de mutation: a mensagem da API aparece no próprio item (`role="alert"`) e o carrinho continua como estava. Tentar de novo funciona normalmente.
- Cupom: `label` "Código promocional", erro em `role="alert"` ligado ao campo por `aria-describedby` e `aria-invalid`, com o foco de volta no campo. Inválido e expirado têm mensagens distintas, vindas da API. O cupom aplicado aparece abaixo do campo ("Cupom KURIO10 aplicado: 10% de desconto.") com "Remover cupom". Se a cotação disser que o cupom aplicado deixou de valer (`couponError`), a mensagem aparece ali.
- "Conectar e finalizar" leva a `/checkout`; o visitante passa pelo login com `redirect=/checkout`, e o carrinho é mesclado ao entrar. Fica bloqueado (`aria-disabled`, com o motivo ligado por `aria-describedby`) quando algum item está esgotado ou acima do disponível, ou quando a cotação diz que não é possível comprar.
- "Colecionadores também viram": `GET /api/nfts?segment=trending&sort=rating-desc&pageSize=16`, sem os NFTs do carrinho, no mesmo carrossel de "Mais desta coleção".

### Estados

- Carregando: skeleton com brilho nas linhas e no resumo, com as mesmas dimensões da tela final (o teste compara posição e altura da primeira linha). Enquanto a cotação carrega, os valores do resumo são skeletons; ao recalcular, o resumo fica com opacidade reduzida e `aria-busy`.
- Vazio: "Seu carrinho está vazio", com o link "Explorar o catálogo".
- Erro ao carregar: "Não foi possível carregar o carrinho", com a mensagem da API e "Tentar novamente". Erro da cotação: mensagem e "Tentar novamente" no lugar dos valores.

### Tempo real

- Com o carrinho em cache, o `nft.updated` de um NFT do carrinho compara a edição exata de cada item com os dados do evento e anuncia a mudança ("Emerald Ape #042, edição 1/50, no carrinho: Preço alterado de 1.19 ETH para 1.31 ETH."). Em seguida, o carrinho e a cotação são invalidados e refeitos pela API, o que atualiza o resumo. Com o detalhe do mesmo NFT aberto, o anúncio fica com o detalhe.
- A tela compara cada versão do carrinho com a anterior (`useCartItemNotices`) e mostra o aviso no item: "Preço alterado de X para Y.", "Disponibilidade reduzida: restam N unidades." ou "Edição esgotada.". O aviso continua visível enquanto a tela estiver aberta. Esgotado ou acima do disponível também mostra o que fazer e bloqueia "Conectar e finalizar".

### Persistência

- O carrinho do visitante fica no banco simulado, identificado pelo `kurio.guest-cart-id` do `localStorage`, então sobrevive ao refresh. No login, o merge junta os itens ao carrinho do usuário e apaga o identificador do visitante (ver "Merge do carrinho").

### Testes (`e2e/cart.spec.ts`)

Adicionar pelo detalhe com edição e quantidade, notificação e contador; conflito de disponibilidade com o máximo; alterar quantidade pelos botões e pelo campo, limite de disponibilidade com motivo, remover com foco e estado vazio; cupom inválido, expirado (GENESIS25), válido (KURIO10) com desconto e total da API, persistência após refresh e remoção; carrinho do visitante após refresh e após login pelo "Conectar e finalizar" (redirect para `/checkout`); preço e disponibilidade alterados por `__mocks.updateNft` com aviso no item, anúncio, resumo atualizado e checkout bloqueado; falha de mutation sem perder itens e nova tentativa; erro ao carregar com "Tentar novamente"; skeleton sem deslocamento com latência lenta.

## Pagamento

Rota privada `/checkout` (`src/routes/_authenticated/checkout.tsx`), componentes em `src/components/checkout/` e regras puras em `src/lib/checkout.ts` (formulário, validação, mapeamento de `fieldErrors`, corpo do pedido e rascunho) e `src/lib/quote-changes.ts` (diferenças de cotação em texto). A tela nunca mostra compra confirmada: depois de criado, o pedido (`pending`) é gravado no cache e o usuário vai para `/orders/$orderId`, que acompanha o estado (ver "Pedido").

Nada de carteira ou blockchain real: não há bibliotecas de carteira nem acesso a `window.ethereum`. Conexão, recusa, desconexão, pagamento e transação vêm da API simulada.

### Dados e chaves

| Dado | Hook | Chave | Observação |
| --- | --- | --- | --- |
| Carrinho | `useCart` | `['user', id, 'cart']` | Itens da compra e estado vazio |
| Perfil | `useProfile` | `['user', id, 'profile']` | Preenche o formulário |
| Carteiras | `useWallets` | `['user', id, 'wallets']` | Principal e secundária, com `connection` |
| Redes | `useNetworks` | `['networks']` | Lista pública, `staleTime` de 5 min |
| Cotação | `useCheckoutQuote` | `['user', id, 'quote', network]` | `POST /api/quotes`, `staleTime` 0: refeita ao entrar na tela e a cada troca de rede |

- O conteúdo da tela fica num componente com `key={userId}`: se o usuário mudar sem desmontar a rota (outra aba), todo o estado local é descartado.
- Conectar e desconectar (`useConnectWallet`, `useDisconnectWallet`) gravam a `WalletConnection` da resposta na carteira em cache; uma falha invalida a lista.

### Formulário

- Campos do Figma: nome de exibição, nome de usuário, rede, nome do perfil, endereço da carteira, ENS ou carteira secundária (opcional), tipo de carteira, código de indicação, e-mail, nome ENS (com o sufixo `.eth` fixo), "Usar outra carteira?" e observação (opcional, até 500 caracteres).
- Preenchimento inicial: nome, usuário, e-mail e ENS do perfil; nome do perfil e código de indicação da carteira principal. Com uma carteira cadastrada selecionada, endereço, tipo e ENS secundário são os dela (somente leitura). "Usar outra carteira?" libera esses três campos e envia `payment.source = 'other'`.
- A validação no cliente usa as mesmas funções dos mocks (`src/lib/validation.ts`). Cada campo tem `label` visível com asterisco (`aria-hidden`) e `aria-required`, `aria-invalid` e `aria-describedby` com a mensagem. No envio, um resumo (`role="alert"`) é anunciado ("Revise 3 campos: Nome de exibição, E-mail e Carteira.") e o foco vai para o primeiro campo inválido, na ordem visual. Carteira sem conexão na rede escolhida é um erro do campo "Carteira", e o foco vai para o botão "Conectar" da carteira selecionada. O erro da carteira (do cliente ou o `WALLET_NOT_CONNECTED` da API) é exibido só enquanto a condição existir: assim que a carteira escolhida fica conectada na rede escolhida, ou "Usar outra carteira?" é marcado, a mensagem some. O resumo de erros também some quando não resta nenhum erro visível.
- `fieldErrors` da API (`collector.email`, `payment.address`, `note` etc.) são mapeados para os mesmos campos por `toCheckoutErrors`, com o mesmo resumo e foco; a revisão é fechada. Como a região `aria-live` global fica com `aria-hidden` enquanto o diálogo está aberto, o resumo é anunciado de novo depois que o diálogo fecha, junto com o foco no campo. Os itens do carrinho não mudam.

### Carteira e rede

- As carteiras cadastradas aparecem como rádios ("MetaMask · Principal", apelido, endereço abreviado e rede). Escolher uma carteira aplica a rede dela; a rede pode ser trocada no campo "Rede" (opções de `GET /api/networks`).
- Cada carteira mostra o estado da conexão, ligado ao rádio por `aria-describedby`: "Desconectada", "Conectando…", "Conectada na rede Ethereum" ou "Conectada na rede Polygon. Conecte na rede Ethereum para pagar.". O botão alterna entre "Conectar" (`POST /api/wallets/:id/connect` com a rede escolhida) e "Desconectar". Sucesso e falha são anunciados.
- Recusa (`wallet-rejected`): a mensagem da API aparece no cartão da carteira (`role="alert"`), com a orientação de confirmar na carteira e tentar de novo; o estado continua "Desconectada".
- Sem carteira cadastrada: aviso com o link "Cadastrar carteira" (`/wallets`); "Usar outra carteira?" continua disponível. No mobile, "Trocar carteira" também leva a `/wallets`.

### Cotação e resumo

- O resumo (itens com quantidade e total da linha, subtotal, desconto, taxa de rede, "Taxa estimada", total e "Cotação válida até HH:MM") mostra exatamente a cotação da API, sem recálculo no cliente. Avisos por linha vêm de `issue` (esgotada, disponibilidade, preço alterado).
- Enquanto a cotação carrega, as linhas e os valores são skeletons com as mesmas dimensões finais (uma linha por item do carrinho); o teste compara posição e altura. Ao recalcular, o resumo fica com opacidade reduzida e `aria-busy`. Falha: mensagem e "Tentar novamente".
- Cupom: "Tem um código promocional? Aplique aqui" leva ao carrinho, onde o cupom é aplicado. O cupom aplicado ou o erro do cupom (`couponError`) aparece no resumo.

### Revisão

"Confirmar compra" valida o formulário e abre o diálogo "Revise sua compra" (shadcn/ui `Dialog`: foco preso, Esc fecha e o foco volta ao botão). Ele mostra os dados do colecionador, carteira, endereço, conexão, rede, itens, totais, cotação (id, versão e validade) e a observação. O envio só acontece por "Confirmar e enviar pedido" dentro do diálogo. Durante o envio, o diálogo não fecha.

### Revalidação

`useAcceptedQuote` guarda a cotação aceita (a que o usuário está vendo na revisão) e compara com a cotação atual do cache:

- Uma cotação nova com a mesma `version` tem o mesmo conteúdo (a API só incrementa a versão quando itens, preços, disponibilidade, cupom, rede ou taxa mudam) e substitui a aceita sem pedir nada.
- Versão diferente na mesma rede significa mudança. Ela chega de três formas: `nft.updated` de qualquer NFT invalida a cotação (Socket.IO, `src/realtime/cache-updates.ts`) e a consulta é refeita; `409 QUOTE_OUTDATED` ou `409 AVAILABILITY_CONFLICT` trazem `details.currentQuote`, que é gravada no cache, e `details.quoteChanges`; ou a cotação expira.
- A mudança aparece como lista de/para (`describeQuoteChanges`): "Emerald Ape #042 (edição 1/50): preço de 1.19 ETH para 1.31 ETH.", "…: a edição esgotou.", "Taxa de rede: de X para Y.", "Cupom: de KURIO10 para nenhum." e "Total: de 2.396 ETH para 2.636 ETH.". Quando a API informa as mudanças, a lista usa `quoteChanges`; nos demais casos, a diferença é calculada entre as duas cotações.
- Na revisão, "Confirmar e enviar pedido" fica com `aria-disabled` e ignora cliques enquanto a cotação aceita estiver desatualizada. "Revisar nova cotação" troca os valores do diálogo pelos novos e devolve o foco ao título; só então a compra pode ser confirmada. Fora da revisão, o aviso aparece acima do resumo, que já mostra a nova cotação.
- Expiração: um timer no `expiresAt` da cotação aceita pede uma nova cotação. No formulário, ela substitui a anterior se o conteúdo for o mesmo; na revisão, a nova cotação sempre exige "Revisar nova cotação".
- Itens esgotados ou acima do disponível (`purchasable: false`) bloqueiam "Confirmar compra" e o envio, com o link "Ajustar o carrinho". O pedido nunca é enviado com uma cotação que o usuário não aceitou, e a API ainda revalida tudo no `POST /api/orders`.

### Idempotência e envio

`useOrderSubmission` (`src/components/checkout/use-order-submission.ts`):

- A tentativa de compra é `{ key, fingerprint, request, pending }`. `fingerprint` é o JSON canônico do corpo (`stableStringify`, o mesmo dos mocks). Ao confirmar, se a tentativa guardada tem o mesmo fingerprint, a chave é reaproveitada; se o conteúdo mudou (outra cotação confirmada, outros dados, outra carteira ou rede), uma chave nova é gerada com `crypto.randomUUID()`.
- A tentativa fica no rascunho do usuário em `sessionStorage` (ver "Rascunho"), então sobrevive ao refresh.
- Reentrada: um `ref` impede um segundo envio enquanto houver um em andamento, e o botão fica com `aria-disabled`, `aria-busy` e o texto "Enviando pedido…". Clique duplo gera uma única requisição.
- Falha transitória (`TIMEOUT`, `NETWORK_ERROR`, 5xx): a tela informa "Estamos verificando o seu pedido. Não é preciso enviar de novo…" e reenvia o mesmo corpo com a mesma chave depois de 1 s, 2 s e 4 s. A API devolve o pedido já criado (`Idempotent-Replayed`), sem duplicar. Esgotadas as tentativas, aparece "Verificar novamente", que repete com a mesma chave.
- Refresh com tentativa pendente: ao abrir a tela, a tentativa é reenviada com a mesma chave e a tela mostra "Verificando o seu pedido" até a resposta. Isso recupera o pedido mesmo que o carrinho já tenha sido esvaziado pela confirmação.
- Rejeição definitiva (409, 422, 404): a tentativa fica marcada como não pendente (a API não registra chaves de tentativas rejeitadas) e a tela trata o erro: revalidação, campos, carteira (`WALLET_NOT_CONNECTED` invalida as carteiras e foca a conexão) ou mensagem no diálogo.
- Sucesso: o pedido vai para `['user', id, 'orders', 'detail', orderId]`, as listas de pedidos são invalidadas, o rascunho é apagado, a criação é anunciada ("Pedido order-0001 enviado. Aguardando a confirmação do pagamento.") e a navegação vai para `/orders/$orderId` com `replace`.
- Em qualquer erro, os itens do carrinho permanecem: o cliente não altera o carrinho, e a API só remove itens na confirmação do pedido.

### Rascunho e expiração de sessão

- `useCheckoutDraft` guarda valores, carteira escolhida, rede e tentativa com `saveResumeDraft('checkout', userId, …)` a cada mudança, e também no `onSessionInterrupted`, que o `SessionWatcher` chama antes de levar ao login. O rascunho tem o `userId` do dono.
- Expiração durante o checkout: o próximo pedido à API (por exemplo, conectar a carteira) recebe 401 `SESSION_EXPIRED`, a sessão é encerrada e o usuário vai para `/login?redirect=/checkout&reason=expired`. Ao entrar de novo com o mesmo usuário, `readResumeDraft` devolve o rascunho: formulário, carteira e rede voltam, com o aviso "Recuperamos os dados que você tinha preenchido nesta compra.".
- Outro usuário: `readResumeDraft` só devolve rascunhos do mesmo `userId`, e o login apaga os rascunhos de outros usuários. O checkout de Bruno parte do perfil e das carteiras dele.
- Logout explícito ("Sair"): apaga o rascunho e a tentativa (chave de idempotência) do usuário, porque são dados privados. Ao entrar de novo, o checkout parte do perfil. Só a expiração (e a sessão recusada) preserva o rascunho para a retomada; o efeito que grava o rascunho só grava enquanto a sessão do dono estiver ativa, então nada é regravado depois do logout.
- Pedido pendente sem rascunho: a recuperação não depende só do `sessionStorage`. O checkout consulta `GET /api/orders?status=pending` (`usePendingOrders`, chave `['user', id, 'orders', 'list', { status: 'pending' }]`, invalidada pelo `order.updated`) e, se houver pedido aguardando liquidação, mostra "O pedido order-0001 está aguardando a confirmação do pagamento." com o link "Acompanhar pedido". A tela do pedido usa a mesma API.

### Estados

- Carregando: skeleton do formulário e do resumo. Carrinho vazio: "Seu carrinho está vazio" com "Explorar o catálogo". Erro do carrinho: mensagem e "Tentar novamente". Erro das carteiras: mensagem e "Tentar novamente".

### Testes (`e2e/checkout.spec.ts`)

Preenchimento pelo perfil e validação com resumo e foco; revisão com dados, carteira, rede, itens e totais, Esc com retorno do foco e envio até `/orders/order-0001`; recusa da carteira (`wallet-rejected`), conexão e desconexão; preço alterado por `__mocks.updateNft` durante a revisão, com de/para, bloqueio do envio e nova confirmação; `price-changed` (409 com chave nova para a nova cotação e um único pedido); `edition-sold-out` sem perder itens e compra depois de ajustar o carrinho; clique duplo com uma requisição e um pedido; `order-timeout` com `page.clock` (timeout aos 10 s, nova tentativa com a mesma chave e o mesmo pedido); expiração com restauração do rascunho; logout que apaga o rascunho e a chave guardada, sem restauração ao entrar de novo; erro de campo da API no pedido (`form-validation`) com foco, anúncio e carrinho intacto; isolamento ana → bruno; carrinho vazio; skeleton da cotação sem deslocamento com latência lenta.

## Pedido

Rota privada `/orders/$orderId` (`src/routes/_authenticated/orders.$orderId.tsx`), componentes em `src/components/order/`.

### Dados

- `useOrder(orderId)` (`src/hooks/use-orders.ts`) consulta `GET /api/orders/:id` na chave `['user', userId, 'orders', 'detail', orderId]`. O conteúdo fica num componente com `key` de usuário e pedido: trocar de usuário descarta o estado.
- `staleTime` é 0 enquanto o pedido está `pending` (montar a tela ou voltar a ela consulta a API) e infinito quando está `confirmed` ou `declined`. Não há polling: a atualização vem do `order.updated`, da reconciliação na reconexão do socket e do botão "Atualizar status".
- Terminais nunca regridem. `newestOrder(cached, incoming)` é aplicado a toda resposta REST: um pedido terminal em cache não é trocado por um `pending`, e uma versão menor não substitui uma maior (cobre uma consulta iniciada antes de o evento chegar). No socket, o `RealtimeClient` já descarta duplicatas (`id`), versões antigas e qualquer evento para um pedido terminal em cache.
- 404 (pedido inexistente ou de outro usuário, como Bruno abrindo um pedido de Ana) mostra "Pedido não encontrado" com "Voltar ao catálogo", sem nenhum dado do pedido. Outras falhas mostram a mensagem da API e "Tentar novamente".

### Estados

O estado exibido é sempre o `status` do pedido vindo da API ou do `order.updated`; o cliente nunca deduz confirmação.

- `pending`: "Aguardando confirmação do pagamento", com o número e a data do pedido, rede, carteira, itens e totais do snapshot. Uma linha informa o estado do tempo real ("A confirmação aparece aqui automaticamente, em tempo real." ou "A conexão em tempo real caiu. Estamos reconectando…"). "Atualizar status" consulta a API; se o pedido continua pendente, isso é anunciado.
- `confirmed`: recibo do Figma (ver abaixo).
- `declined`: "Pagamento recusado", com o motivo da API (`decline.reason`), o aviso de que os itens continuam no carrinho, "Voltar ao pagamento" e "Ver carrinho", e o resumo do pedido recusado. A nova tentativa no checkout parte de uma cotação nova e, como o rascunho foi apagado, de uma nova chave de idempotência.

### Chegada a um estado terminal

`useTerminalEffects` roda uma vez por estado terminal:

- invalida carrinho, cotações e listas de pedidos do usuário (na confirmação, o carrinho passa a mostrar só o que não foi comprado e o contador do header se atualiza);
- apaga o rascunho do checkout e a tentativa com a chave de idempotência;
- leva o foco ao título (`h1` com `tabIndex=-1`) do novo estado;
- anuncia o resultado uma única vez ("Pagamento confirmado. Seus NFTs agora estão na sua carteira. Pedido order-0001." ou "Pagamento recusado. <motivo> Os itens continuam no seu carrinho."), apenas quando a tela viu o pedido pendente antes. Abrir direto um pedido já terminal não gera anúncio; o foco no título informa o estado.
- Para não anunciar duas vezes, `applyOrderUpdated` só anuncia quando nenhuma tela observa o detalhe do pedido (por exemplo, se o usuário saiu da tela antes da liquidação).

### Recibo

- Todos os valores vêm de `order.receipt`, o snapshot gravado na criação: linhas (imagem, nome, token, edição, quantidade, subtotal da linha), subtotal, desconto (com o cupom, quando houver), taxa de rede, total, rede e carteira. Nada vem do catálogo ou do carrinho; o teste altera o preço do NFT comprado com `__mocks.updateNft` e confere que o recibo não muda, também após o refresh.
- Faixa de informações: ID da transação (abreviado, com o hash completo para leitores de tela e no `title`), data da confirmação, total e carteira. O botão de copiar usa a Clipboard API e anuncia "ID da transação copiado." (ou a falha, indicando onde ver o hash completo).
- "Ver no explorador (simulado)" abre um diálogo "Explorador simulado" com hash, status, rede, data, carteira, valor e o endereço simulado (`https://explorer.kurio.test/<rede>/tx/<hash>`), deixando claro que nenhuma rede ou explorador real foi consultado. Não há link para exploradores reais.
- Ações: "Voltar ao catálogo", "Ver carrinho" e o "X" do Figma (fechar e voltar ao catálogo).

### Recuperação

- Refresh com pedido pendente: a tela consulta a API e continua pendente; nada é reenviado.
- Queda do socket: durante a queda o evento é perdido; ao reconectar, `reconcileActiveQueries` invalida os pedidos e a consulta traz o estado atual, aplicando os mesmos efeitos terminais.
- O checkout também consulta `GET /api/orders?status=pending` e mostra o pedido em andamento (ver "Pagamento").

### Testes (`e2e/orders.spec.ts`)

Compra completa do catálogo ao recibo com `page.clock` (a liquidação de 3 s acontece no `fastForward`), com foco, anúncio, valores do snapshot, cópia do ID, explorador simulado, carrinho vazio e rascunho apagado; pagamento recusado com itens preservados, nova tentativa com chave nova e `order-0002`; refresh com pedido pendente e "Atualizar status"; queda do socket (`refuseRealtime`) com pedido liquidado durante a queda e retomada pela API; `order.updated` duplicado e antigo ignorados, sem regressão nem novo anúncio; recibo imutável após `updateNft`; remoção parcial do carrinho (itens adicionados depois da criação permanecem); Bruno recebe "Pedido não encontrado" para o pedido de Ana. Em `e2e/checkout.spec.ts`, clique duplo e `order-timeout` seguem até o recibo, com um único pedido.

## Perfil e carteiras

### Dados e chaves

- `useProfile` lê `GET /api/profile` em `['user', userId, 'profile']`. `useUpdateProfile`, `useUpdateAvatar` e `useRemoveAvatar` (`src/hooks/use-profile.ts`) gravam a resposta da API nessa chave e atualizam `displayName`, `username`, `email` e `avatarUrl` da sessão em `['user', userId, 'session']`, para que o header e a barra inferior mostrem o novo nome e o novo avatar sem nova consulta. A gravação é descartada se a sessão mudou de usuário durante a requisição.
- `useChangePassword` chama `POST /api/profile/password` e não toca no cache (a resposta é 204).
- `useSaveWallet` (`src/hooks/use-wallets.ts`) chama `PUT /api/wallets/{slot}`, substitui a carteira do slot em `['user', userId, 'wallets']` e invalida a lista, porque salvar a principal também atualiza a secundária espelhada no servidor. Pagamento e carteiras compartilham essa chave.
- As alterações só aparecem como salvas depois da resposta da API; o refresh relê tudo da API simulada, que persiste o banco no `localStorage`.

### Tela de perfil (`/profile`)

- Um único botão "Salvar", como no Figma, aplica em sequência: dados do perfil (só se algo mudou), avatar (se houver envio ou remoção pendente) e senha (só se algum campo de senha foi preenchido). A sequência para no primeiro erro; o que já foi confirmado aparece na mensagem de sucesso ("Dados do perfil salvos. Avatar atualizado.").
- Validação no cliente com as mesmas regras do servidor (`src/lib/validation.ts`): nome de exibição 2 a 50, nome de usuário no padrão do cadastro, e-mail, nome ENS e apelido 2 a 40. A senha valida a atual, a política da nova senha, a diferença em relação à atual e a confirmação.
- Erros da API (`fieldErrors`) aparecem no campo correspondente: e-mail ou nome de usuário em uso (409), senha atual incorreta, conteúdo do avatar que não é imagem e os erros do cenário `form-validation`.
- Avatar: "Alterar" abre o seletor de arquivo. O tipo (PNG, JPEG, WebP) e o tamanho (até 512 KB) são validados antes da prévia; a prévia usa `URL.createObjectURL` (revogada ao trocar ou desmontar). "Remover" marca a remoção, "Descartar" desfaz a prévia e "Desfazer" cancela a remoção. Nada é enviado antes de "Salvar". O servidor confere a assinatura dos bytes.
- Depois da troca de senha os campos são limpos; o servidor encerra as outras sessões do usuário e mantém a atual.

### Tela de carteiras (`/wallets`)

- Carteira principal e secundária em seções com título. Uma carteira cadastrada aparece como resumo (apelido, tipo, rede, endereço, ENS ou secundária e nome ENS) com a ação "Editar"; sem carteira, a ação é "Adicionar". Uma conta sem carteira principal abre o formulário direto, como no Figma.
- Formulário com os campos do Figma, pré-preenchido com a carteira ou, para uma nova, com os dados do perfil. O endereço é validado pela rede escolhida (Ethereum e Polygon `0x` + 40 hex; Solana base58 de 32 a 44 caracteres), no cliente e no servidor. O placeholder muda com a rede.
- "Igual à carteira principal" envia `{ sameAsPrimary: true }`; desmarcar abre o formulário para tornar a secundária independente. A secundária exige a principal: enquanto ela não existe, a opção e "Adicionar" ficam desabilitadas com a explicação ligada por `aria-describedby`.
- Ao salvar ou cancelar, o foco volta ao botão "Editar" da seção; ao abrir o formulário, vai para o primeiro campo.

### Menu lateral

- `AccountNav` (`src/components/account/account-nav.tsx`) é o "Meu perfil" do Figma: "Dados do perfil" e "Carteiras" levam às rotas, com `aria-current="page"` e barra laranja na atual; "Lista de interesse" leva a `/?favorites=true#catalog`; "Atividade", "Ofertas", "Arquivos baixados" e "Suporte" ficam fora do escopo e usam o aviso "em breve"; "Sair" faz logout.
- A partir de 1024 px o menu fica à esquerda (310 px). Abaixo disso vira uma faixa horizontal com rolagem própria acima do conteúdo, sem overflow da página em 390 e 768 px.

### Estados

- Enquanto perfil, carteiras ou redes carregam, um skeleton com shimmer mostra o título e os campos na mesma grade do formulário. Falha de carga mostra `role="alert"` com "Tentar novamente".
- Durante o envio, o botão fica desabilitado com "Salvando…" e os campos ficam somente leitura.

### Testes (`e2e/account.spec.ts`)

Menu lateral entre perfil e carteiras sem overflow horizontal; validação do perfil no cliente com resumo, foco no primeiro inválido e descrições, e-mail em uso (409) e erro de campo da API (`form-validation`), sem persistir nada; edição do perfil com o novo nome no header e persistência após refresh; avatar com tipo e tamanho recusados no cliente, conteúdo inválido recusado pela API, prévia, envio, persistência e remoção; senha atual ausente e incorreta, troca com sucesso, login com a senha antiga recusado e com a nova aceito; edição da carteira principal com endereço inválido para Ethereum e para Solana, erro da API e persistência após refresh; cadastro da secundária de Bruno com campos obrigatórios, endereço inválido, persistência e espelhamento da principal; cadastro da carteira principal de uma conta nova.

## Estado do catálogo na URL

A rota `/` valida os search params em `src/lib/catalog-search.ts` (`validateCatalogSearch`), sem biblioteca de validação: são poucos campos, todos com listas fechadas ou formatos já cobertos por `src/lib/eth.ts`.

| Parâmetro | Valores | Padrão | Valor inválido |
| --- | --- | --- | --- |
| `q` | texto, aparado, até 100 caracteres | `''` | cortado no limite |
| `category` | lista de categorias | `[]` | valores desconhecidos são descartados |
| `network` | lista de redes | `[]` | valores desconhecidos são descartados |
| `priceMin`, `priceMax` | string ETH não negativa (aceita vírgula) | ausente | descartado; se o mínimo for maior que o máximo, os dois são descartados |
| `segment` | `all`, `new`, `trending` | `all` | volta ao padrão |
| `sort` | `recent`, `price-asc`, `price-desc`, `name-asc`, `rating-desc` | `recent` | volta ao padrão |
| `page` | inteiro de 1 a 10 000 | `1` | volta a 1 |
| `favorites` | `true` ou `false` | `false` | volta a `false` |

- `favorites=true` mostra só os favoritos do usuário logado (ver "Favoritos"). Combina com busca, filtros, segmento, ordenação e paginação, que são enviados à API junto com `favorites=true`.

- O middleware `stripSearchParams` remove da URL os valores iguais ao padrão.
- Listas são escritas com valores separados por vírgula (`?category=photography,music&network=ethereum`). O router usa `parseSearch` e `stringifySearch` próprios (`src/lib/search-serialization.ts`): arrays de strings viram `a,b` e a vírgula não é codificada como `%2C`; os demais valores seguem a serialização JSON padrão do TanStack Router. Na leitura, o validador separa os valores pela vírgula. URLs antigas em JSON (`?category=["music"]`) continuam aceitas e passam ao formato novo na próxima navegação. Os valores de categoria e rede nunca contêm vírgula.
- O validador sempre devolve todas as chaves, inclusive `priceMin` e `priceMax` como `undefined`: o router mescla o resultado com os parâmetros crus da URL, e uma chave omitida manteria o valor inválido.
- As listas são normalizadas na ordem do contrato, então a mesma seleção gera sempre a mesma chave de cache, qualquer que seja a ordem dos cliques.
- Busca, filtros, segmento e ordenação reiniciam `page` para 1. Cada mudança cria uma entrada no histórico, assim voltar e avançar restauram a lista; a paginação também.
- Busca: o campo atualiza a URL 350 ms depois da última tecla. A primeira atualização de uma sessão de digitação (desde o foco) cria uma entrada no histórico e as seguintes a substituem (`replace`), então digitar uma palavra produz uma única entrada. Enter aplica na hora e rola até o catálogo. Fora da tela inicial (busca do header), só o Enter navega, para `/?q=…#catalogo`.
- No desktop e no tablet a busca fica no ícone do header (popover); no mobile, no campo "Explorar coleções" do topo da tela, como no Figma. A busca ativa aparece acima da grade ("Resultados para …") com a ação "Limpar busca".

## Detalhe do NFT

Rota `/nfts/$nftId` (`src/routes/nfts.$nftId.tsx`), componentes em `src/components/nft-detail/` e regras de edição e quantidade em `src/lib/nft-edition.ts`.

| Parâmetro | Valores | Padrão | Valor inválido |
| --- | --- | --- | --- |
| `edition` | id de uma edição do NFT (`unique`, `limited-10`, `limited-50`, `open`) | ausente | formato inválido é descartado; id que não existe no NFT cai no padrão |

- Sem `edition`, a tela usa a edição padrão da API (`defaultEditionId`) ou, se ela estiver esgotada, a primeira edição disponível. A edição resolvida na abertura fica fixa durante a visita: se esgotar em tempo real, continua selecionada e mostra o motivo, em vez de trocar sozinha.
- Escolher uma edição grava `edition` na URL com `replace` (sem nova entrada no histórico), e a escolha sobrevive ao refresh. Uma edição pedida pela URL é respeitada mesmo esgotada, com o estado de indisponível.
- Quantidade: inteiro de 1 até `min(available, maxPerOrder)` da edição. O motivo do limite aparece abaixo do controle e é anunciado: "Só restam N unidades da edição X." quando o estoque é o limite, "Limite de N unidades por pedido na edição X." quando é o teto por pedido e "A edição X está esgotada." quando não há estoque. A quantidade é estado local da tela (não vai para a URL) e é ajustada ao novo limite quando a edição muda.
- Dados: `useNftDetail(id)` (`src/hooks/use-nft-detail.ts`) usa a chave `['nfts', 'detail', id]`, `staleTime` de 30 s e o `signal` do Query no Axios. O `loader` da rota chama `prefetchQuery` sem `await`: com `defaultPreload: 'intent'`, passar o mouse ou focar o card do catálogo já busca o detalhe. No acesso direto, o loader dispara a mesma consulta e a tela mostra o skeleton até a resposta.
- Estados: um 404 da API mostra "NFT não encontrado" com o link "Voltar ao catálogo" (`/#catalogo`). Rede, timeout ou 5xx (depois das novas tentativas padrão) mostram `role="alert"` com a mensagem da API e "Tentar novamente".
- "Mais desta coleção": `GET /api/nfts?collection=<id>&sort=recent&pageSize=16`, na família `['nfts', 'list', …]` (por isso recebe `nft.updated`), sem o NFT aberto. Tem estados próprios de carregamento, erro com nova tentativa e vazio.
- Tempo real: o `nft.updated` atualiza `['nfts', 'detail', id]` pelo cache (ver "Reconciliação REST × Socket.IO"). A tela compara a edição selecionada antes e depois de cada nova versão e anuncia, numa única mensagem, a mudança de preço ("O preço de Emerald Ape #042 na edição 1/50 mudou de 1.19 ETH para 1.31 ETH."), a de disponibilidade e o ajuste da quantidade quando ela passa do novo limite. A troca de edição feita pelo próprio usuário não é anunciada como alteração.

## Estratégia de cache, retries e sincronização

### Padrões globais (`src/lib/query-client.ts`)

- `retry`: até 2 novas tentativas, apenas para falhas transitórias (`ApiError.isTransient`: rede, timeout ou 5xx). Erros 4xx não são repetidos, porque a repetição daria o mesmo resultado.
- `retryDelay`: exponencial, 1 s e 2 s (máximo de 4 s).

### Catálogo (`src/hooks/use-nft-list.ts`)

- `useNftList(params)` usa a chave `['nfts', 'list', params]`, com os parâmetros exatamente como enviados à API (`toNftListQuery`). Cada combinação tem a sua entrada de cache.
- O `signal` do TanStack Query é repassado ao Axios. Quando os parâmetros mudam, a query anterior perde o observador e a requisição em andamento é cancelada.
- Respostas fora de ordem não sobrescrevem o resultado atual: cada resposta é gravada na chave dos seus próprios parâmetros, e a tela só lê a chave dos parâmetros atuais. O teste "keeps the latest parameters when responses arrive out of order" verifica isso com o cenário `variable-latency`.
- `placeholderData: keepPreviousData`: ao trocar filtros, a lista anterior continua visível, com opacidade reduzida, e um indicador "Atualizando…" aparece sobre a grade sem mudar o layout. A região de resultados recebe `aria-busy`. O mesmo indicador aparece em refetches em segundo plano.
- `staleTime` de 30 s: voltar a uma combinação recente (histórico, paginação) mostra o cache na hora, sem nova requisição. Preço e estoque não dependem desse prazo, porque chegam pelo `nft.updated`, que atualiza os itens de todas as listas em cache; na reconexão do socket as listas ativas são refeitas.
- Imagens: a do banner (provável LCP) carrega com `fetchpriority="high"` e sem lazy; a primeira linha da grade carrega sem lazy; as demais imagens da tela usam `loading="lazy"`. Todas têm `width`, `height` e `srcset` com as larguras disponíveis.
- Destaques: `useFeaturedNfts` consulta `GET /api/nfts?featured=true&sort=recent&pageSize=4` (mesma família de chaves, então também recebe os eventos). O primeiro, o terceiro e o quarto destaques formam o carrossel do banner; o segundo é o "NFT em destaque" da barra lateral. Nenhum NFT é fixo nos componentes.

## Reconciliação REST × Socket.IO

A API REST é a fonte da verdade; os eventos só aceleram a atualização do cache. Toda a lógica fica em `src/realtime/`; componentes não escutam o socket diretamente.

### Ciclo de vida e troca de sessão

- Uma única instância de `RealtimeClient` (`src/realtime/client.ts`). `RealtimeBridge` (montado em `main.tsx`, dentro do `QueryClientProvider`) chama `start` com `{ token, userId }` da sessão atual e `stop` no cleanup do efeito.
- Toda mudança de identidade (login, logout, troca de usuário, expiração) passa por `stop` e `start`: os listeners do socket anterior são removidos (`removeAllListeners`), o socket é desconectado, os ids vistos e as versões de pedidos são descartados e um socket novo é criado com a identidade nova.
- Cada `start` recebe um número de geração. Eventos e mudanças de estado de um socket de geração anterior são descartados, inclusive se o `import()` do `socket.io-client` terminar depois de uma troca de sessão.
- Além do filtro do servidor, o cliente descarta qualquer evento privado cujo `userId` não seja o da sessão atual.

### Deduplicação e versão

- Ids de eventos já recebidos ficam num conjunto limitado aos 500 mais recentes; um evento repetido é ignorado.
- Para cada recurso (`nft:<id>`, `order:<id>`), a versão conhecida é a maior entre a última aplicada por evento e a que está no cache (detalhe, listas e favoritos para NFTs; detalhe para pedidos). Eventos com versão menor ou igual são ignorados, então um evento antigo nunca regride um estado mais recente nem reaplica efeitos (anúncios e invalidações).
- Pedidos `confirmed` ou `declined` em cache são terminais: nenhum evento os altera.
- Os patches no cache também comparam versões item a item, para não sobrescrever um dado mais novo que tenha chegado por REST.

### Atualização do cache

As chaves vêm de `src/lib/query-keys.ts`. Dados privados ficam sob `['user', userId, …]` e os do visitante sob `['guest', …]`, o que permite limpar tudo de um usuário por prefixo e impede que caches de usuários diferentes se misturem.

- `nft.updated`: atualiza `['nfts', 'detail', id]`, os itens correspondentes em todas as `['nfts', 'list', params]` no índice de favoritos e nas listas `['user', id, 'favorites', 'list', params]`; invalida o carrinho e a cotação do dono atual (`['user', id, 'cart']` ou `['guest', 'cart']`), que são recalculados pela API.
- `order.updated`: substitui `['user', userId, 'orders', 'detail', id]` e invalida as listas de pedidos. Na confirmação, invalida também carrinho e cotação, porque a API removeu os itens comprados.

### Reconexão

- O socket reconecta sozinho, com atraso entre 0,5 e 4 s. Durante a espera, o estado fica `reconnecting`.
- A cada reconexão (todo `connect` depois do primeiro), as queries ativas de NFTs, favoritos, carrinho, cotação e pedidos são invalidadas e refeitas pela API, cobrindo eventos perdidos durante a queda.
- Pedidos pendentes são retomados pela API (`GET /api/orders/:id` ou `GET /api/orders?status=pending`) e pelo próximo `order.updated`.

### Estado e feedback

- `useRealtimeStatus()` devolve `idle`, `connecting`, `connected`, `reconnecting` ou `disconnected`.
- `announce(message)` (`src/lib/announcer.ts`) publica mensagens numa região `aria-live="polite"` única (`LiveAnnouncer`, no layout raiz). A camada de tempo real anuncia mudanças de preço e disponibilidade na edição de cada item do carrinho ("Emerald Ape #042, edição 1/50, no carrinho: Preço alterado de 1.19 ETH para 1.31 ETH.") e a confirmação ou recusa do pagamento quando a tela do pedido não está aberta (com ela aberta, o anúncio é da tela, uma única vez). Com o detalhe do NFT aberto, o anúncio fica com a tela de detalhe, que conhece a edição selecionada; assim a mesma mudança não é anunciada duas vezes.

## Mocks e cenários

A API é simulada pelo MSW no navegador e ativada por `VITE_ENABLE_MOCKS=true` (também no build de demonstração, via `.env.production`). Componentes, hooks e o cliente Axios não conhecem os mocks: toda simulação acontece nos handlers.

### Estrutura

```
src/mocks/
  setup.ts            inicializa o banco, aplica a query string, inicia o worker e expõe window.__mocks
  browser.ts          setupWorker com os handlers
  endpoints.ts        identificador, método, caminho e exigência de sessão de cada endpoint
  scenarios.ts        cenários, latência, TTL de sessão e persistência dessas configurações
  control.ts          objeto global window.__mocks
  socket/             servidor Socket.IO simulado (ws.link + @mswjs/socket.io-binding) e ferramentas de teste
  changes.ts          barramento interno de mudanças (nft.updated e order.updated)
  responses.ts        respostas JSON, erro padronizado e falha de rede
  hex.ts              hex determinístico (contratos e hashes de transação)
  db/                 estado, persistência, seed, sessões e criptografia
  fixtures/           NFTs, usuários, cupons, redes, categorias e rótulos de carteira
  services/           regras compartilhadas: catálogo, carrinho, cupom, cotação e pedidos
  handlers/           handlers REST por recurso, guarda de sessão e validação
  panel/              painel flutuante de cenários
```

Cada handler é registrado por `apiRoute(endpoint, resolver)`, que aplica a latência ativa, a falha do cenário (quando houver) e converte exceções em `500 INTERNAL_ERROR`.

### Banco simulado

- Um único objeto (`MockDatabase`) com usuários, sessões, NFTs, redes, favoritos, carrinhos, cupons, cotações, pedidos, carteiras e conexões de carteira, salvo em `localStorage` na chave `kurio.mocks.db.v3` a cada alteração (v3: endereços do explorador simulado nas redes). A versão do esquema faz parte da chave; um esquema diferente é descartado e substituído pelo seed.
- Senhas são guardadas apenas como hash PBKDF2-SHA-256 (100 000 iterações) com salt por usuário, via Web Crypto. Tokens de sessão são aleatórios (32 bytes) e o banco guarda apenas o SHA-256 do token.
- Sessões têm expiração fixa (TTL padrão de 2 horas, configurável por `window.__mocks.setSessionTtl(segundos)`). Sessões expiradas continuam registradas por 24 horas para responder `SESSION_EXPIRED` em vez de `UNAUTHENTICATED`.
- Identificadores criados pela simulação usam contadores (`user-0001`, `cart-0001`, `item-0001`, `quote-0001`, `order-0001`, `wallet-0001`), o que mantém os testes determinísticos. Cada carrinho guarda as 5 cotações mais recentes.

### Reset

O reset cancela os timers de liquidação, recria o seed (catálogo, redes, usuários, carteiras, favoritos e cupons), apaga sessões, carrinhos, cotações, pedidos e conexões de carteira e volta ao cenário `success` com latência fixa e liquidação automática. Ele está disponível no painel ("Restaurar dados", que também recarrega a página) e em `await window.__mocks.reset()`.

### Fixtures

- 46 NFTs com as 4 imagens fornecidas, 9 categorias, 3 redes, 4 coleções e preços de 0.02 a 12.30 ETH. Os 9 primeiros reproduzem os nomes e preços do Figma (Emerald Ape #042 1.19 ETH, Neon Vessel #552 1.99 ETH com preço anterior 2.29 ETH, etc.).
- Estoques: Sage Nomad #009 e Midnight Patron #090 têm as edições `1/1` e `1/10` esgotadas; Neon Vessel #552, Boss Level #301, Coin Keeper #116 e Ember Scout #150 têm estoque baixo (2 unidades na edição `1/50`); Last Light #999 está totalmente esgotado.
- Limites por pedido: `1/1` = 1, `1/10` = 3, `1/50` = 10, `Aberta` = 20.
- Cupons: `KURIO10` (10%, válido), `GENESIS25` (25%, expirado em 31/01/2025). Qualquer outro código é inválido; códigos fora do formato `[A-Z0-9]{4,20}` são erro de validação.
- Taxa de rede estimada: Ethereum 0.016 ETH, Polygon 0.002 ETH, Solana 0.0008 ETH.

### Barramento de mudanças

`src/mocks/changes.ts` é um emissor interno da camada de mocks. Nenhum código fora de `src/mocks/` o importa. Toda alteração de preço ou disponibilidade de um NFT (`services/catalog.ts#updateNftEditions`) e toda mudança de estado de um pedido (criação e liquidação em `services/orders.ts`) publica uma mudança:

```ts
type MockChange =
  | { event: NftUpdatedEvent; userId: null }
  | { event: OrderUpdatedEvent; userId: string }

interface RealtimeEvent {
  id: string
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  occurredAt: string
  data: ...
}
```

- `id`: UUID único do evento.
- `version`: versão do recurso depois da mudança (`Nft.version` ou `Order.version`), sempre crescente.
- `data`: em `nft.updated`, `editions`, `price` e `compareAtPrice`; em `order.updated`, o `Order` completo.
- `userId`: dono do pedido, ou `null` para NFTs (evento público). O mesmo valor está em `event.userId`.

Os tipos dos eventos vêm de `src/api/contracts/events.ts`. Assinatura: `subscribeChanges(listener)`, que devolve a função de cancelamento.

### Servidor Socket.IO simulado

`src/mocks/socket/server.ts` registra `ws.link('/realtime/')`, que o MSW resolve contra a origem da página (ws ou wss), e envolve cada conexão com `toSocketIo` do `@mswjs/socket.io-binding`.

- Cada conexão se inscreve no barramento ao abrir e cancela a inscrição ao fechar; o mesmo acontece com o ping.
- O servidor envia o ping do Engine.IO (`2`) a cada 25 s, o intervalo anunciado no handshake do binding. Sem ele, o cliente fecharia a conexão por ping timeout após 30 s.
- O token é lido da mensagem crua do pacote CONNECT (`40{...}`), porque o binding só decodifica pacotes de evento.
- Ferramentas de teste (painel, seção "Tempo real", e `window.__mocks`): derrubar as conexões (o servidor fecha o websocket com 1012 e o cliente reconecta), recusar novas conexões por N segundos (cada tentativa recebe o handshake do Engine.IO e é fechada com 1013 logo depois, simulando queda de rede; fechar antes do handshake deixaria o cliente parado até o timeout de conexão de 20 s do Socket.IO, em vez de seguir o backoff de reconexão), reenviar o último evento com o mesmo `id` (duplicata) e enviar um evento com versão anterior à atual (para NFTs, com preço 0.01 ETH; para pedidos, com status `pending`).

### Credenciais fictícias

| Usuário | E-mail | Senha | Dados |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@kurio.test` | `Kurio#2026` | Carteira principal (MetaMask, Ethereum) e secundária (Coinbase, Polygon); favoritos: Emerald Ape #042 e Ivory Baron #088 |
| Bruno Tavares | `bruno@kurio.test` | `Kurio#2026` | Apenas carteira principal (WalletConnect, Polygon); favorito: Golden Beat #207 |

### Latência

| Modo | Atraso |
| --- | --- |
| `none` | 0 ms |
| `fixed` (padrão) | 300 ms |
| `slow` | 2,5 s |
| `variable` | entre 150 ms e 2 s, por uma sequência pseudoaleatória com semente fixa, reiniciada ao trocar cenário ou latência. Requisições em paralelo terminam fora de ordem, sempre na mesma ordem para a mesma sequência de chamadas. |

### Cenários

| Nome | Efeito |
| --- | --- |
| `success` | Tudo funciona normalmente (padrão). |
| `empty-catalog` | `GET /api/nfts` retorna zero itens e todo detalhe responde 404. |
| `variable-latency` | Força a latência `variable` (respostas fora de ordem). |
| `network-error` | Todas as requisições falham na rede (`HttpResponse.error()`). |
| `server-error` | Todas as requisições respondem 500. |
| `service-unavailable` | Todas as requisições respondem 503 até o cenário ser trocado. |
| `transient-failure` | As duas primeiras chamadas de cada endpoint respondem 503; as seguintes funcionam. |
| `session-expired` | Ao ser ativado, expira todas as sessões abertas; rotas privadas passam a responder 401 `SESSION_EXPIRED`. Novos logins funcionam. |
| `unauthorized` | Endpoints privados respondem 401 `UNAUTHENTICATED`. |
| `forbidden` | Endpoints privados respondem 403 `FORBIDDEN`. |
| `register-conflict` | O cadastro responde 409 `EMAIL_TAKEN` para qualquer e-mail. |
| `form-validation` | Formulários válidos no cliente recebem 422 com `fieldErrors` do servidor: cadastro e perfil (`username`), senha (`newPassword`), carteiras (`address`) e pedido (`collector.referralCode`, sem registrar a chave de idempotência). |
| `coupon-invalid` | Qualquer cupom responde 422 `COUPON_INVALID`; a cotação de um carrinho com cupom traz `couponError` do mesmo tipo. |
| `coupon-expired` | Qualquer cupom responde 422 `COUPON_EXPIRED`; idem na cotação. |
| `price-changed` | Na primeira tentativa de pedido após ativar o cenário, o preço da edição do primeiro item sobe 10% (com `nft.updated`) e o pedido responde 409 `QUOTE_OUTDATED` com a nova cotação. A tentativa seguinte, com a nova cotação, é aceita. |
| `edition-sold-out` | Na primeira tentativa de pedido após ativar, a edição do primeiro item esgota (com `nft.updated`) e o pedido responde 409 `AVAILABILITY_CONFLICT`. Depois de remover o item, o pedido é aceito. |
| `order-timeout` | O pedido é criado e liquidado normalmente, mas a resposta de criação leva 20 s, mais que o timeout do Axios (10 s). O reenvio com a mesma chave responde na hora com o mesmo pedido. |
| `payment-confirmed` | O pedido fica `pending` por 3 s e é confirmado, como no `success`. |
| `payment-declined` | O pedido fica `pending` por 3 s e é recusado; carrinho e estoque ficam intactos. |
| `favorite-failure` | Incluir ou remover favoritos responde 503 (rollback otimista). |
| `wallet-rejected` | Conectar carteira responde 409 `WALLET_CONNECTION_REJECTED`. |

Os cenários de falha genérica (`network-error`, `server-error`, `service-unavailable`, `transient-failure`, `unauthorized`, `forbidden`, `favorite-failure`, `wallet-rejected`) são aplicados por `apiRoute` antes do handler. Os demais são lidos pelos handlers e serviços. Os efeitos de `price-changed` e `edition-sold-out` acontecem uma vez por ativação; selecionar o cenário de novo (ou mudar a latência) os rearma.

### Como selecionar

- Query string: `?scenario=<nome>&latency=<modo>` em qualquer URL. Os valores são aplicados, persistidos e removidos da URL antes de o router iniciar.
- `localStorage`: chave `kurio.mocks.settings.v1` (`{ scenario, latency, sessionTtlSeconds, settlement }`). A escolha sobrevive ao refresh.
- Liquidação dos pedidos: `settlement=auto` (padrão: o pedido é liquidado 3 s depois da criação, por timer) ou `settlement=manual` (o pedido fica `pending` até `__mocks.advanceOrder`). Pode vir na query string (`?settlement=manual`) ou de `__mocks.setSettlement`; voltar a `auto` reagenda os pendentes. Os testes que precisam observar o estado pendente usam o modo manual; os sensíveis a tempo usam `page.clock` com o modo automático.
- Painel: botão redondo de 28 px, só com ícone e nome acessível ("Painel de simulação da API (cenário: …)"), no canto superior esquerdo da página. Ele não é fixo: fica na margem acima do conteúdo (antes do header no desktop e da busca no mobile) e rola junto com a página, então não cobre cards nem a barra inferior em nenhum viewport. Oferece seleção de cenário e latência; na seção "Tempo real", o estado do cliente, as conexões vistas pelo servidor, o último evento e as ferramentas do socket; e os botões "Expirar sessões" e "Restaurar dados". Ele só é carregado quando `VITE_ENABLE_MOCKS` é `"true"`, em um chunk separado.
- Visibilidade do painel: `?mockPanel=hidden` (ou `visible`) é gravado em `localStorage` (`kurio.mocks.panel`) e removido da URL antes de o router iniciar. Os testes Playwright abrem o app com `mockPanel=hidden` por padrão (`openApp` em `e2e/support/mocks.ts`), para que o painel não apareça nas capturas de regressão visual; um teste usa `mockPanel: 'visible'` para verificar que o botão não sobrepõe conteúdo.
- O worker do MSW inicia com `quiet: true`, sem registrar cada requisição no console.
- Testes: `window.__mocks`, disponível somente depois que o service worker assume as requisições:

```ts
await window.__mocks.reset()
window.__mocks.setScenario('payment-declined')
window.__mocks.setLatency('none')
window.__mocks.setSessionTtl(5)
window.__mocks.setSettlement('manual')
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

`updateNft` altera a edição indicada (a padrão, se omitida) e passa pelo barramento (`nft.updated`, versão +1). `advanceOrder` liquida um pedido pendente imediatamente, com o resultado planejado ou com o status informado, aplicando os mesmos efeitos da liquidação por tempo e emitindo `order.updated`.

## Acessibilidade

### Tela inicial

- O título do banner é o `h1`; catálogo, filtros, NFT em destaque, chamadas e Diário da Cunhagem são seções com títulos.
- Filtros (categorias e redes) e segmentos são botões com `aria-pressed`. O estado ativo também muda o peso da fonte, não só a cor. Cada opção informa a contagem ("Música, (6) resultados").
- Faixa de preço: slider de dois polegares operável pelas setas do teclado, com rótulos "Preço mínimo" e "Preço máximo". O filtro só é aplicado pelo botão "Aplicar".
- Ordenação: `Select` do shadcn/ui, rotulado por "Ordenar por:".
- Paginação: `nav` com botões "Página N" e `aria-current="page"` na atual.
- Quando a busca, os filtros, a ordenação ou a página mudam, a quantidade de resultados é anunciada pela região `aria-live` global ("2 NFTs encontrados.", com a página quando há mais de uma). A carga inicial não é anunciada.
- Erro do catálogo: `role="alert"` com a mensagem da API e o botão "Tentar novamente".
- Drawer de filtros (abaixo de 1024 px): `Dialog` do Radix (Sheet do shadcn/ui), com foco preso, Esc para fechar e retorno do foco ao botão que o abriu.
- Skeletons têm `aria-hidden` e as mesmas dimensões dos cards. O teste de carregamento lento compara posição e tamanho de todas as células da grade, antes e depois dos dados. Com `prefers-reduced-motion`, o brilho é removido e o skeleton fica estático.

### Detalhe do NFT

- O título do NFT é o `h1`. "Sobre este NFT", "Mais desta coleção" e as abas formam a estrutura da página. A trilha "Início / Mercado" é um `nav` com lista.
- Galeria: as miniaturas são botões "Mostrar imagem N de 4" com `aria-pressed`. A selecionada tem um anel afastado da borda (mudança de forma, não só de cor), e as demais ficam com opacidade reduzida. A imagem principal usa o texto alternativo da API para a posição escolhida. As miniaturas têm `alt=""`, porque o nome já está no botão. "Ampliar imagem" abre um `Dialog` do shadcn/ui, com foco preso, Esc para fechar e retorno do foco.
- Edição: `fieldset` com a legenda "Edição:" e rádios nativos (as setas trocam a opção). A edição selecionada tem borda e texto em destaque e também peso bold. As esgotadas ficam `disabled`, riscadas e com ", esgotada" no nome acessível. O motivo ("Esgotadas: 1/1, 1/10.") fica visível e ligado aos rádios por `aria-describedby`.
- Quantidade: campo "Quantidade" (só dígitos, `inputMode="numeric"`) entre "Diminuir quantidade" e "Aumentar quantidade". Nos limites, os botões ficam com `aria-disabled` e continuam focáveis, para o foco não se perder; acioná-los anuncia o motivo. A mensagem de limite é a descrição do campo.
- Abas: `Tabs` do shadcn/ui (Radix), com navegação pelas setas. No mobile, a segunda aba se chama "Avaliações (19)".
- "Mais desta coleção": lista com rolagem horizontal e snap. Os pontos são botões "Página N de M" com `aria-current`. Com `prefers-reduced-motion`, a rolagem pelos pontos é instantânea.
- O skeleton tem `aria-hidden` e usa as mesmas classes de layout da tela final, mais um `output` "Carregando NFT…" para leitores de tela.

### Favoritos

- Os botões de favorito são `button` com `aria-pressed` e nome que muda: "Favoritar Emerald Ape #042" ou "Remover Emerald Ape #042 dos favoritos". No desktop, o texto visível ("Favoritar"/"Remover") é o início do nome acessível. O estado também muda a forma (coração vazio ou preenchido), não só a cor.
- Enquanto a lista de favoritos do usuário carrega, o botão fica com `aria-disabled` (continua focável) e o clique é ignorado.
- No card, o botão fica fora do link do card (não há elemento interativo dentro de link). O círculo tem 28 px, como no Figma, e a área de toque é ampliada para 44 px.
- Sucesso e falha são anunciados (ver "Atualização otimista com rollback").

### Perfil e carteiras

- Formulários com `noValidate`, `label` visível em cada campo, `aria-invalid`, `aria-describedby` apontando para o erro e para a dica, e resumo em `role="alert"` com foco no primeiro campo inválido (inclusive erros da API). O sucesso aparece em um `output` e é anunciado pela região `aria-live` global.
- O avatar é um `fieldset` com legenda "Avatar"; o erro e a dica ficam ligados ao botão "Alterar". A prévia tem `alt` "Prévia do novo avatar"; sem avatar, o ícone tem o nome "Sem avatar".
- Os botões de mostrar senha têm `aria-pressed` e o nome "Mostrar senha atual", "Mostrar nova senha" etc.
- "Editar carteira principal" e "Adicionar carteira secundária" completam o nome acessível com a seção.

## Desvios do Figma e decisões de UX

### Tipografia

- O título do banner usa 43/70 a partir de 768 px e 19/29 abaixo disso, como no frame mobile. Com 43 px em 390 px, o título quebraria em muitas linhas.
- Onde o Figma define line-height "auto", foi usado `normal`.
- Carregamento da fonte: o `index.html` faz `preload` do arquivo latino da Roboto Mono (o Vite troca o caminho pelo mesmo arquivo com hash que o CSS usa, sem download duplicado), e o `main.tsx` só faz o primeiro render depois de `document.fonts.load`, em paralelo com a inicialização dos mocks e com limite de 1,5 s. Sem isso, o primeiro render usava a fonte de fallback, o título do hero ocupava uma linha a menos e, quando a Roboto Mono chegava (`font-display: swap`), o hero crescia 47 px no mobile e 24 px no tablet, empurrando o catálogo. Se a fonte passar do limite, a página renderiza com o fallback e a troca acontece depois.
- A descrição do banner usa 14/24 (`text-body-sm`), conforme o Figma.
- Tamanhos e raios foram medidos nas imagens exportadas, com margem de cerca de 1 px. O único valor confirmado diretamente no Figma é o título do banner (43/70).

### Links e ações fora do escopo

Criadores, Aprenda, o botão central da barra mobile, os itens de "Meu perfil" sem tela (Minha coleção, Atividade, Estúdio do criador), toda a "Central de ajuda", as redes sociais e a newsletter não fazem parte da entrega. Todos seguem o mesmo comportamento:

- são `<button>` com `aria-disabled="true"` e "(em breve)" no nome acessível, e não links, porque não há destino;
- ao serem acionados, exibem uma notificação "em breve" informando que o recurso não faz parte desta versão. A notificação é anunciada por uma região `aria-live="polite"`;
- a newsletter não envia nem armazena o e-mail: o envio do formulário apenas exibe a mesma notificação;
- o visual segue o Figma, sem estilo de item desabilitado, para não alterar a composição.

E-mail e telefone de contato do rodapé são fictícios e aparecem como texto, sem `mailto:` ou `tel:`.

### Navegação

- Mobile: não há header global, como no Figma. A navegação fica na barra inferior (Início, Favoritos, botão central, Carrinho e Perfil). Detalhes, carrinho e pagamento exibem botão de voltar ao lado do título, também como no Figma.
- Tablet (768 px): não há frame. É usado o header desktop, com espaçamento reduzido entre os itens de navegação; a barra inferior aparece apenas abaixo de 768 px.
- O item ativo do header segue a seção: "Início" na tela inicial e "Mercado" no catálogo, detalhes, carrinho, pagamento e pedidos. Nos frames de perfil e carteiras o Figma marca "Início"; aqui nenhum item fica ativo nessas telas.
- "Mercado" leva à seção de catálogo da tela inicial (`/#catalogo`). O ícone de busca do header abre um campo de busca (popover) que leva ao catálogo com `q`. Os links de "Coleções" do rodapé aplicam o filtro de categoria correspondente.
- O Figma não desenha o header logado (o frame de perfil ainda mostra "Entrar"). Logado, o botão "Entrar" dá lugar ao avatar (ou às iniciais) com o nome e um menu com Dados do perfil, Carteiras e Sair, nas cores do menu lateral do perfil. No mobile, a aba "Perfil" mostra o avatar e abre o mesmo menu.
- Em `/login` e `/register` o item "Início" do header fica ativo, como no Figma, porque o diálogo aparece sobre a tela inicial.
- O contador do carrinho (header, barra inferior mobile e barra do detalhe) mostra `itemCount` da API, a soma das quantidades; some quando o carrinho está vazio. O nome acessível inclui o número ("Carrinho, 2 itens").
- "Mercado" fica ativo no header também no carrinho, como no Figma.
- O ícone do botão central da barra mobile usa a cor Ink em vez de branco: branco sobre o laranja tem contraste de 2,45:1, abaixo do mínimo de 3:1 para elementos gráficos.
- O rodapé não aparece nos frames mobile, que mostram apenas a primeira tela. No mobile e no tablet as colunas são reorganizadas em uma ou duas colunas.

### Catálogo e dados

- Categoria e coleção são campos distintos. A barra lateral do Figma chama de "Coleções" a lista Arte digital, Fotografia, Música etc.; na API essas opções são categorias (`category`). A coleção (`collection`, por exemplo "Kurio Apes") é a que aparece no detalhe ("Coleção: Kurio Apes") e alimenta "Mais desta coleção".
- O Figma mostra apenas a ordenação "Listados recentemente" (`recent`). As ordenações preço crescente (`price-asc`), preço decrescente (`price-desc`), nome (`name-asc`) e avaliação (`rating-desc`) foram acrescentadas.
- O Figma desktop mostra só a página 1, com os botões 1 a 4 e "próxima". A paginação mostra a primeira e a última página, a atual e as vizinhas, com reticências, e o botão "anterior" a partir da página 2.
- Estados sem frame (vazio, erro, página inexistente, atualização em segundo plano, "Limpar filtros", "Esgotado") seguem os tokens do Figma: superfície Surface Card, títulos em Foreground e ações com o botão primário.
- No mobile os cards mostram o selo de raridade ("Raro", "Lendário") e o coração de favorito no canto superior direito da imagem, como no frame; no desktop o Figma não mostra nenhum dos dois, e lá o favorito fica no detalhe. No mobile, o selo "Esgotado" foi para o canto inferior esquerdo da imagem, porque o canto superior direito é do coração. No frame mobile a segunda coluna da grade aparece deslocada para baixo; aqui as duas colunas ficam alinhadas, para que cada fileira tenha os cards lado a lado e a leitura siga a ordem da lista. Os segmentos (Todos os NFTs, Novos lançamentos, Em alta) usam 14 px no mobile para caberem em uma linha a partir de 390 px.
- Abaixo de 1024 px a barra lateral de filtros vira um drawer, aberto pelo botão de filtros ao lado da busca (mobile, como no Figma) ou pelo botão "Filtros" da barra de ordenação (tablet). O "NFT em destaque" só aparece com a barra lateral (a partir de 1024 px); abaixo disso os destaques ficam no banner.
- No frame do Figma o texto da segunda chamada ("Arte digital selecionada…") aparece cortado; aqui ele é exibido inteiro.
- As chamadas "Lançamentos gênesis" e "Arte digital selecionada" levam ao catálogo com `segment=new` e `category=digital-art`. O Diário da Cunhagem é editorial e fora do escopo: o conteúdo é fixo e "Ler mais" segue o padrão "em breve".
- No mobile o banner mostra uma miniatura do próximo destaque sobre a imagem principal, como no frame. Os pontos do carrossel são botões que trocam o destaque; não há troca automática.
- A linha de preço do card tem altura fixa de uma linha (`h-6`, sem quebra), igual à do skeleton. Abaixo de 768 px o preço anterior riscado não aparece, como no frame mobile: nos cards de 2 colunas ele não cabe ao lado do preço e quebrava a linha, deixando a fileira 24 px mais alta que a do skeleton. O valor continua no texto para leitores de tela ("preço anterior 2.29 ETH") e aparece a partir de 768 px e no detalhe do NFT.
- O preço exibido no card é o da edição `1/50`, que é a edição padrão. Os preços das demais edições derivam dele: `1/1` = 5×, `1/10` = 2× e `Aberta` = 50%. A edição `Aberta` tem estoque inteiro de 1000 unidades.

### Detalhe do NFT

- "Comprar" (desktop) e "Comprar NFT" (mobile) adicionam ao carrinho e mostram uma notificação com "Ver carrinho", em vez de ir direto para o pagamento: o carrinho é onde ficam cupom, revisão e o "Conectar e finalizar". O botão redondo de carrinho da barra mobile leva ao carrinho e mostra o contador.
- Favoritar (desktop) fica à direita da quantidade, onde o Figma o mostra depois de "Comprar". Favoritado, o botão troca o texto para "Remover" e preenche o coração, para o estado não depender só de cor; o Figma não desenha esse estado. No mobile, o coração fica no topo, ao lado do botão de voltar, com o mesmo círculo dele.
- Foram acrescentadas as linhas "Criador: …" e "Disponível: N de M na edição X", que não estão no Figma: o enunciado pede o criador, e a disponibilidade explica o limite de quantidade e reflete o `nft.updated`.
- O preço exibido é o da edição selecionada. O Figma mostra o da `1/50`, que é a edição padrão. Quando há preço anterior, ele aparece riscado ao lado.
- No Figma, os rótulos "Contrato:" e "Direitos autorais:" aparecem trocados em relação ao conteúdo. Aqui "Contrato:" mostra o endereço abreviado e o padrão (`0x7A42...19E8 · Contrato inteligente ERC-721 verificado.`), e "Direitos autorais:" mostra o percentual do criador. O endereço completo fica no atributo `title`.
- A nota do mobile ("★ 4.8(19)") usa a média da API, com uma casa decimal. Nos dados, o Emerald Ape tem média 5.0.
- O conteúdo da aba "Avaliações" não tem frame. Ele lista autor, nota, data e comentário das avaliações retornadas pela API (até 3), com a nota "Mostrando as 3 avaliações mais recentes de 19."
- Mobile: o frame mostra só a primeira tela, sem miniaturas, compartilhamento, abas e "Mais desta coleção". Miniaturas e compartilhamento aparecem a partir de 768 px; abas e "Mais desta coleção" ficam abaixo das informações. A barra inferior mostra "Qtd." e o preço. Os botões de passo têm 28×40 px (20×28 no frame), para respeitar a área mínima de toque.
- Tablet (sem frame): a galeria (miniaturas e imagem) fica centralizada no topo, e as informações ocupam a largura total abaixo dela. As três colunas do desktop começam em 1024 px.
- "Mais desta coleção" mostra 5 cards por página no desktop, 3 no tablet e 2 no mobile, com os pontos calculados pela largura. Os itens vêm da coleção do NFT (`collection`), por isso diferem dos do Figma.
- Os ícones de compartilhamento são links reais: LinkedIn e Twitter abrem em nova aba, e o e-mail usa `mailto:`, sempre com o endereço da página.
- A lupa sobre a imagem (Figma) amplia a imagem num diálogo.

### Carrinho

- Desktop: o Figma mostra "ID do token" abaixo do nome; aqui também aparece a linha "Edição: 1/50", porque o mesmo NFT pode estar no carrinho em edições diferentes. O preço unitário é o da edição.
- Mobile: o Figma não mostra como remover um item (o ícone de lixeira aparece sobreposto ao "+" do terceiro item). Aqui a lixeira fica no canto superior direito do card, e o seletor de quantidade fica na linha do total. Os botões de quantidade têm 32 px, acima dos 30 px do frame, e o card tem 102 px de altura (94 no frame) para caber nome, edição e seletor sem sobreposição.
- O desconto mostra a unidade ("(-) 0.00 ETH"); o Figma mostra "(-) 00.00".
- O rótulo do desconto vem da cotação quando há cupom ("Desconto do lançamento" nas fixtures) e é "Desconto do lançamento" sem cupom, como no Figma.
- O título "Resumo da carteira" e o rótulo "Código promocional" ficam ocultos visualmente no mobile, como no frame, mas continuam disponíveis para leitores de tela. No desktop, o título "Carrinho de NFTs" é o `h1` oculto visualmente, porque o frame mostra só a trilha.
- Estados sem frame (cupom aplicado, erro do cupom, aviso de preço ou disponibilidade, item esgotado, erro de mutation, vazio e erro) seguem os tokens: Coral para erros, Accent para avisos, Surface Raised para o cupom aplicado.
- "Colecionadores também viram" usa os NFTs em alta da API, por isso difere dos itens do Figma. Aparece também no mobile, abaixo do resumo.

### Pagamento

- Desktop: o Figma não desenha a revisão. "Confirmar compra" abre o diálogo "Revise sua compra", e o envio acontece no botão "Confirmar e enviar pedido" dentro dele, para que a revisão seja uma etapa explícita.
- "Carteira e rede": o Figma mostra opções "MetaMask" e "Coinbase Wallet" e uma faixa "METAMASK · WALLETCONNECT · COINBASE". Aqui as opções são as carteiras cadastradas do usuário (as de Ana são MetaMask e Coinbase Wallet), com apelido, endereço, rede, estado da conexão e o botão Conectar/Desconectar; a faixa virou o selo "Carteiras compatíveis". Cada cartão fica mais alto que no frame para caber o estado da conexão.
- O campo "Nome ENS" usa um sufixo fixo `.eth` no lugar do seletor do Figma, porque só existe esse domínio. O campo "ENS ou carteira secundária" não tem rótulo visível, como no Figma; o rótulo fica visualmente oculto.
- A rede é escolhida no campo "Rede" do formulário (desktop e mobile). Ao escolher uma carteira, a rede dela é aplicada.
- Mobile: o frame mostra apenas carteiras, total e "Confirmar compra". O formulário e o resumo foram incluídos acima das carteiras (os dados são obrigatórios), e "Carteira conectada" e "Trocar carteira" seguem o frame. A lista "Carteira e rede" de provedores do frame mobile não foi reproduzida: as opções são as carteiras cadastradas.
- Itens do resumo: além de "ID do token", aparece a edição, porque o mesmo NFT pode estar em edições diferentes. O desconto mostra a unidade ("(-) 0.00 ETH").
- Estados sem frame (aviso de mudança da cotação, erros, verificação do pedido, carrinho vazio) seguem os tokens: Coral para erros, Accent para avisos.

### Confirmação de pedido

- O frame desktop mostra o recibo como um cartão sobre fundo escuro, sem header e footer. Aqui o cartão (580 px, faixa inferior laranja, "X" no canto) fica dentro do layout do site, com header e footer, para manter a navegação.
- Além de "Taxa de rede" e "Total", o recibo mostra "Subtotal" e "Desconto" (com o cupom), exigidos pelo enunciado. A coluna "Edições" mostra a quantidade e a edição comprada.
- "Ver no Etherscan" virou "Ver no explorador (simulado)" e abre um diálogo, porque o enunciado proíbe levar a um explorador real e pede que a simulação fique clara. O texto "Transação confirmada na Ethereum…" diz "Transação simulada confirmada na …".
- O ID da transação ganhou um botão de copiar. A faixa usa 14 px nos valores para caber em uma linha no cartão de 580 px.
- Mobile e tablet (sem frame): o mesmo cartão em largura total; a faixa de informações vira uma grade 2 × 2 e, abaixo de 640 px, quantidade e edição ficam sob o nome do item, com a coluna "Edições" oculta.
- Os estados pendente, recusado, não encontrado e erro não têm frame e seguem o mesmo cartão e os tokens (Coral para recusa).

### Login e cadastro

- Os campos não têm rótulo visível no Figma, só placeholders. Cada campo tem um `label` visualmente oculto; os placeholders seguem o Figma.
- O ícone de mostrar senha usa a cor Secondary em vez do marrom do Figma (Border Soft, cerca de 1,5:1), para atingir o contraste mínimo de 3:1 de elementos gráficos. É um botão com `aria-pressed`.
- O diálogo desktop não escurece a tela inicial, como no Figma: o overlay é transparente, mas continua bloqueando a interação com o fundo. Fica a 160 px do topo, como no frame, e sobe em telas mais baixas.
- No cadastro desktop, "Confirmar senha" não tem o ícone de olho, como no frame; no mobile, os dois campos de senha têm.
- No frame mobile do cadastro, o placeholder "Nome de usuário" aparece centralizado, diferente dos demais; aqui todos ficam alinhados à esquerda.
- O link "Crie uma conta"/"Entre" no rodapé da tela mobile é sublinhado, para não depender só do texto (no Figma tem a mesma cor do texto ao redor).
- Mensagens de erro (Coral), resumo do erro e aviso de sessão expirada não têm frame e seguem os tokens.
- A senha do cadastro tem uma dica só para leitores de tela ("pelo menos 8 caracteres, com letras e números"), sem texto visível, para não alterar a composição.
- Campos preenchidos pelo autocompletar do navegador mantêm o fundo e a cor de texto do tema: `:-webkit-autofill` (em `src/index.css`) fixa o texto em Foreground e adia a troca de fundo do navegador com `transition-delay`, que não é afetado pela regra de movimento reduzido.

### Mesclagem de classes

- `cn` (`src/lib/utils.ts`) foi configurado com a escala tipográfica do projeto (`text-display`, `text-body`, `text-body-sm` etc.). Sem isso, essas classes eram tratadas como cor: em `cn('text-body', 'text-primary-foreground')`, uma das duas era descartada. O efeito visível era o texto claro nos botões primários (EXPLORAR, Aplicar, Entrar), que no Figma é escuro, e tamanhos de fonte declarados que não eram aplicados (por exemplo, a lista de categorias passou dos 16 px herdados para os 14 px declarados). Os componentes de `src/components/ui/` passaram a importar o `cn` configurado.

### Substituição de assets

- Logo KURIO: implementado como texto estilizado (Roboto Mono bold com espaçamento entre letras), não como imagem.
- Imagens de NFT: convertidas de PNG para WebP com `sharp-cli` 6.1.0 via `npx` (qualidade 80), em duas larguras. `emerald-ape` tem versões de 400 e 800 px. `sage-nomad`, `ivory-baron` e `golden-beat` têm versões de 400 e 500 px, porque o original tem 500 px e não foi ampliado. O tamanho total caiu de 2,4 MB para cerca de 175 KB.
- SVGs do Google, do Facebook e o ícone "THANK YOU" da confirmação de pedido: otimizados com `svgo` 4.1.0 via `npx` e salvos em `src/assets/icons/` (o do pedido caiu de 1,9 KB para 1,2 KB). O ícone da confirmação é o original do Figma (`thank-you.svg`), usado como `<img>` com `alt=""`: é decorativo, e o título logo abaixo ("Seus NFTs agora estão na sua carteira") já transmite o resultado.
- Ícones de redes sociais: não foram fornecidos. Instagram, Twitter e YouTube vêm do Bootstrap Icons 1.13.2 (licença MIT). O ícone do LinkedIn usa apenas o glifo "in" desse pacote, como no Figma. O Facebook reutiliza o glifo do SVG fornecido.
- Fonte: Roboto Mono servida localmente pelo pacote `@fontsource-variable/roboto-mono` (licença OFL), sem Google Fonts.

## Limitações

- A API simulada roda no navegador: o estado é por origem e por perfil do navegador, e duas abas compartilham o mesmo `localStorage` sem sincronização entre elas.
- Web Crypto (hash de senha e tokens) exige contexto seguro: `localhost` ou HTTPS.
- A galeria do detalhe repete a imagem do NFT quatro vezes, como no Figma, porque há apenas uma imagem por obra.
- Cada aba tem o seu próprio servidor simulado (MSW roda na página). Eventos de uma aba nunca chegam a outra, e o isolamento por usuário entre abas é trivial; o filtro por usuário é exercitado por conexões diferentes no mesmo servidor.
- Como o token fica em `localStorage`, abas da mesma origem compartilham a sessão: um login em uma aba troca o usuário das outras (propagado pelo evento `storage`).

### Transporte Socket.IO nos mocks (`@mswjs/socket.io-binding` 0.2.0)

- Apenas o transporte `websocket`; não há long-polling nem upgrade. O cliente precisa usar `transports: ['websocket']`.
- O handshake é falso: o binding responde `0{sid:"test",upgrades:[],pingInterval:25000,pingTimeout:5000}` e `40{sid:"test"}` sem esperar o CONNECT do cliente. O `sid` é sempre `test`, então não há recuperação de estado de conexão do Socket.IO; a reconciliação é feita por REST. O CONNECT com `auth` chega depois da confirmação, e eventos privados só são entregues a partir dele.
- O binding não envia pings; o servidor simulado faz isso. Em abas em segundo plano, o navegador pode atrasar timers e o cliente pode reconectar.
- Só o namespace `/`; sem rooms, broadcast, acks nem payload binário. O filtro por usuário é manual, por conexão.
- O MSW remove o prefixo `/socket.io/` do caminho antes de casar a URL; com o caminho padrão o handler teria de casar `/`, capturando também o websocket do HMR do Vite. Por isso o caminho é `/realtime/`.
- O `engine.io-client` captura `globalThis.WebSocket` quando o módulo é avaliado. Por isso o `socket.io-client` é carregado por `import()` dinâmico depois de o worker do MSW iniciar (e fica num chunk separado, fora do bundle inicial).
- O fechamento pelo servidor usa códigos 1012 (reinício) e 1013 (tente mais tarde), aceitos pelo interceptor de WebSocket do MSW.
