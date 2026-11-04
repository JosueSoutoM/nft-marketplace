import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/components/order/order-page'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderPage orderId={orderId} />
}
