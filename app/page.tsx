import { redirect } from 'next/navigation'

// Root page — middleware handles auth redirect, but this catches direct visits.
export default function RootPage() {
  redirect('/dashboard')
}
