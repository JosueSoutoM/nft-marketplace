import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto flex max-w-[75rem] flex-col items-start gap-6 px-6 py-16 md:px-10">
      <h1 className="text-display-sm md:text-display">
        SEJA DONO DO FUTURO DA ARTE DIGITAL
      </h1>
      <p className="max-w-[34rem] text-body text-muted-foreground">
        Descubra NFTs selecionados de criadores emergentes e consagrados.
        Colecione arte digital rara, apoie artistas e tenha uma parte da cultura
        da internet.
      </p>
      <button
        type="button"
        className="h-10 rounded-md bg-primary px-7 text-body font-medium text-primary-foreground transition-colors hover:bg-primary-dark"
      >
        EXPLORAR
      </button>
    </main>
  )
}
