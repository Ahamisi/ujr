import type { Metadata } from 'next'
import { HomeLive } from './home-live'

export const metadata: Metadata = {
  title: 'UNILAG Journal of Engineering Research',
  description: 'Open-access engineering research from the University of Lagos.',
}

export default function JournalHome() {
  return <HomeLive />
}
