# Arquitetura

## Visão geral

Kurio é um marketplace de NFTs construído como SPA com React, TypeScript e Vite. O roteamento usa TanStack Router com rotas baseadas em arquivos, o estado remoto usa TanStack Query e todas as chamadas REST passam por um cliente Axios. A API e os eventos em tempo real são simulados na camada de rede com MSW, ativada pela variável `VITE_ENABLE_MOCKS`. A interface usa Tailwind CSS e componentes shadcn/ui adaptados aos tokens do Figma.

## Estrutura de pastas

```
public/
  images/nfts/            imagens dos NFTs em WebP, servidas pela API simulada
  mockServiceWorker.js    service worker do MSW (gerado por `msw init`)
src/
  api/                    cliente Axios e chamadas REST
  assets/icons/           SVGs otimizados (Google e Facebook)
  components/
    icons/                ícones de redes sociais em SVG inline
    layout/               header, footer, barra inferior mobile, 404 e utilitários de layout
    ui/                   componentes shadcn/ui adaptados aos tokens
  lib/                    QueryClient, utilitários e saneamento de redirect
  mocks/                  worker e handlers do MSW
  routes/                 rotas do TanStack Router (uma rota por arquivo)
    _authenticated/       rotas privadas agrupadas em layout próprio
  index.css               tokens do design system e estilos globais
  main.tsx                inicialização dos mocks, Query e Router
  router.ts               instância do router e tipagem de `staticData`
  routeTree.gen.ts        árvore de rotas gerada pelo plugin do TanStack Router
```

## Rotas

| Caminho | Arquivo | Tela | Acesso |
| --- | --- | --- | --- |
| `/` | `routes/index.tsx` | Início | Público |
| `/nfts/$nftId` | `routes/nfts.$nftId.tsx` | Detalhes do NFT | Público |
| `/cart` | `routes/cart.tsx` | Carrinho | Público |
| `/login` | `routes/login.tsx` | Login | Público |
| `/register` | `routes/register.tsx` | Cadastro | Público |
| `/checkout` | `routes/_authenticated/checkout.tsx` | Pagamento | Privado |
| `/orders/$orderId` | `routes/_authenticated/orders.$orderId.tsx` | Confirmação de pedido | Privado |
| `/profile` | `routes/_authenticated/profile.tsx` | Perfil do colecionador | Privado |
| `/wallets` | `routes/_authenticated/wallets.tsx` | Carteiras | Privado |
| qualquer outro | `notFoundComponent` da raiz | Página não encontrada | Público |

- As rotas privadas ficam sob o layout `_authenticated`, que não altera a URL. A proteção será implementada nesse layout.
- `/login` aceita o search param `redirect`. Apenas caminhos internos são aceitos (iniciados por `/` e não por `//`); qualquer outro valor é descartado. O botão "Entrar" do header envia a URL atual como `redirect`.
- `staticData.hideMobileTabBar` oculta a barra inferior no mobile nas telas que, no Figma, têm barra de ação própria ou ocupam a tela inteira: detalhes, carrinho, pagamento, login e cadastro.
- O acesso direto e o refresh funcionam em qualquer rota: no desenvolvimento e no preview pelo fallback de SPA do Vite, e na Vercel pelo rewrite de `vercel.json`.

## Contratos REST

_A preencher._

## Eventos Socket.IO

_A preencher._

## Sessão

_A preencher._

## Carrinho

_A preencher._

## Estratégia de cache, retries e sincronização

_A preencher._

## Reconciliação REST × Socket.IO

_A preencher._

## Mocks e cenários

_A preencher._

## Acessibilidade

_A preencher._

## Desvios do Figma e decisões de UX

### Tipografia

- O título do banner usa 43/70 a partir de 768 px e 19/29 abaixo disso, como no frame mobile. Com 43 px em 390 px, o título quebraria em muitas linhas.
- Onde o Figma define line-height "auto", foi usado `normal`.
- A descrição do banner usa 14/24 (`text-body-sm`), conforme o Figma.
- Tamanhos e raios foram medidos nas imagens exportadas, com margem de cerca de 1 px. O único valor confirmado diretamente no Figma é o título do banner (43/70).

### Links e ações fora do escopo

Criadores, Aprenda, Favoritos, o botão central da barra mobile, os itens de "Meu perfil" sem tela (Minha coleção, Atividade, Estúdio do criador, Lista de interesse), toda a "Central de ajuda", as redes sociais e a newsletter não fazem parte da entrega. Todos seguem o mesmo comportamento:

- são `<button>` com `aria-disabled="true"` e "(em breve)" no nome acessível, e não links, porque não há destino;
- ao serem acionados, exibem uma notificação "em breve" informando que o recurso não faz parte desta versão. A notificação é anunciada por uma região `aria-live="polite"`;
- a newsletter não envia nem armazena o e-mail: o envio do formulário apenas exibe a mesma notificação;
- o visual segue o Figma, sem estilo de item desabilitado, para não alterar a composição.

E-mail e telefone de contato do rodapé são fictícios e aparecem como texto, sem `mailto:` ou `tel:`.

### Navegação

- Mobile: não há header global, como no Figma. A navegação fica na barra inferior (Início, Favoritos, botão central, Carrinho e Perfil). Detalhes, carrinho e pagamento exibem botão de voltar ao lado do título, também como no Figma.
- Tablet (768 px): não há frame. É usado o header desktop, com espaçamento reduzido entre os itens de navegação; a barra inferior aparece apenas abaixo de 768 px.
- O item ativo do header segue a seção: "Início" na tela inicial e "Mercado" no catálogo, detalhes, carrinho, pagamento e pedidos. Nos frames de perfil e carteiras o Figma marca "Início"; aqui nenhum item fica ativo nessas telas.
- "Mercado", o ícone de busca e os links de "Coleções" do rodapé levam à seção de catálogo da tela inicial (`/#catalogo`). Busca e filtro por coleção serão ligados aos search params na tarefa do catálogo.
- O contador do carrinho no header só será exibido com dados reais do carrinho; o valor fixo do Figma não é reproduzido.
- O ícone do botão central da barra mobile usa a cor Ink em vez de branco: branco sobre o laranja tem contraste de 2,45:1, abaixo do mínimo de 3:1 para elementos gráficos.
- O rodapé não aparece nos frames mobile, que mostram apenas a primeira tela. No mobile e no tablet as colunas são reorganizadas em uma ou duas colunas.

### Substituição de assets

- Logo KURIO: implementado como texto estilizado (Roboto Mono bold com espaçamento entre letras), não como imagem.
- Imagens de NFT: convertidas de PNG para WebP com `sharp-cli` 6.1.0 via `npx` (qualidade 80), em duas larguras. `emerald-ape` tem versões de 400 e 800 px. `sage-nomad`, `ivory-baron` e `golden-beat` têm versões de 400 e 500 px, porque o original tem 500 px e não foi ampliado. O tamanho total caiu de 2,4 MB para cerca de 175 KB.
- SVGs do Google e do Facebook: otimizados com `svgo` 4.1.0 via `npx` e salvos em `src/assets/icons/`.
- Ícones de redes sociais: não foram fornecidos. Instagram, Twitter e YouTube vêm do Bootstrap Icons 1.13.2 (licença MIT). O ícone do LinkedIn usa apenas o glifo "in" desse pacote, como no Figma. O Facebook reutiliza o glifo do SVG fornecido.
- Fonte: Roboto Mono servida localmente pelo pacote `@fontsource-variable/roboto-mono` (licença OFL), sem Google Fonts.

## Limitações

_A preencher._
