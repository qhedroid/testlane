'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TestlaneMark } from '../assets/TestlaneMark'
import { DEFAULT_PROJECT_KEY, projectPath } from '../lib/project-routes'

export function LoginScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Incorrect email or password.')
        return
      }

      const callbackUrl = searchParams.get('callbackUrl') ?? projectPath(DEFAULT_PROJECT_KEY, 'dashboard')
      router.push(callbackUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div>
          <div className="login-brand">
            <TestlaneMark size={44} />
            <div>
              <div className="login-wordmark">Testlane</div>
              <div className="login-tagline">Test Management</div>
            </div>
          </div>
        </div>
        <ul className="login-bullets">
          <li>
            <i className="ti ti-circle-check" aria-hidden />
            Plan, execute and trace testing in one place
          </li>
          <li>
            <i className="ti ti-circle-check" aria-hidden />
            Requirements and defects linked to every case
          </li>
          <li>
            <i className="ti ti-circle-check" aria-hidden />
            Reports your auditors will actually read
          </li>
        </ul>
        <div className="login-copy">© 2026 Noel Quadri · Testlane portfolio demo</div>
      </div>
      <div className="login-right">
        <div className="login-form-wrap">
          <h2 className="login-title">Sign In</h2>
          <p className="login-desc">Use a seeded demo account to continue to Testlane.</p>
          <form onSubmit={handleSubmit}>
            {error ? <p className="form-error" style={{ marginBottom: 12 }}>{error}</p> : null}
            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="inp login-inp"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="login-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="inp login-inp"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="login-forgot">
              <button type="button" className="login-link">Forgot Password?</button>
            </div>
            <button type="submit" className="btn btn-p login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <div className="login-divider">
            <span />
            <span>or</span>
            <span />
          </div>
          <button
            type="button"
            className="btn btn-neutral login-sso"
            title="Coming soon"
            disabled
          >
            <i className="ti ti-world" aria-hidden />
            Continue with SSO
          </button>
          <p className="login-footnote">Local demo — seeded accounts share password <code>testlane-demo-2026</code>.</p>
        </div>
      </div>
    </div>
  )
}
