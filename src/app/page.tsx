import { redirect } from 'next/navigation'

export default function Home() {
  // The app layout's gate sends signed-out visitors to /sign-in from here.
  redirect('/desk')
}
