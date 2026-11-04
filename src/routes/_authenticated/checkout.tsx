import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/components/checkout/checkout-page'

export const Route = createFileRoute('/_authenticated/checkout')({
  staticData: { hideMobileTabBar: true },
  component: CheckoutPage,
})
