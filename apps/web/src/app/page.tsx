import { redirect } from 'next/navigation'
import { DEFAULT_PROJECT_KEY } from '@/fresh/lib/project-routes'

export default function HomePage() {
  redirect(`/${DEFAULT_PROJECT_KEY}/dashboard`)
}
