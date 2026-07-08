'use client'

import { useRouter } from 'next/navigation'
import { DEFAULT_PROJECT_KEY, projectPath } from '../lib/project-routes'

export function LoginScreen() {
  const router = useRouter()

  function signIn() {
    router.push(projectPath(DEFAULT_PROJECT_KEY, 'dashboard'))
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div>
          <div className="login-wordmark">Relay</div>
          <div className="login-tagline">Test Management</div>
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
        <div className="login-copy">© 2026 TransPerfect · Trial Interactive</div>
      </div>
      <div className="login-right">
        <div className="login-form-wrap">
          <h2 className="login-title">Sign In</h2>
          <p className="login-desc">Use your TransPerfect account to continue to Relay.</p>
          <label className="login-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="inp login-inp"
            type="email"
            placeholder="you@transperfect.com"
            autoComplete="username"
          />
          <label className="login-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="inp login-inp"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <div className="login-forgot">
            <button type="button" className="login-link">Forgot Password?</button>
          </div>
          <button type="button" className="btn btn-p login-submit" onClick={signIn}>
            Sign In
          </button>
          <div className="login-divider">
            <span />
            <span>or</span>
            <span />
          </div>
          <button type="button" className="btn btn-neutral login-sso" onClick={signIn}>
            <i className="ti ti-world" aria-hidden />
            Continue with TransPerfect SSO
          </button>
          <p className="login-footnote">Internal tool — access is provisioned by IT.</p>
        </div>
      </div>
    </div>
  )
}
