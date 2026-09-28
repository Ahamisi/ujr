import type { Metadata } from 'next'
import { ProductionLive } from './production-live'

export const metadata: Metadata = { title: 'Production' }

export default function ProductionPage() {
  return <ProductionLive />
}
