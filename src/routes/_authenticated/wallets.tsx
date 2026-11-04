import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/components/wallets/wallets-page'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})
