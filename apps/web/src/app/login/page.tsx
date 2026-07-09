import { Suspense } from 'react'
import { LoginScreen } from '@/fresh/screens/LoginScreen'
import '@/fresh/styles/fresh.css'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}
