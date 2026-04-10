import { useSearchParams, Link } from 'react-router-dom'
import { login } from '../api/auth'
import './AuthError.css'

interface ErrorInfo {
  title: string
  description: string
  detail: string
}

const ERROR_MAP: Record<string, ErrorInfo> = {
  access_denied: {
    title: 'Sign-in cancelled',
    description: 'You closed the Google sign-in window or denied access.',
    detail:
      'This happens when you click "Cancel" on the Google consent screen, or close the window before completing the sign-in. No data was shared.',
  },
  provider_error: {
    title: 'Google reported an error',
    description: 'Google returned an error during the authentication process.',
    detail:
      'This is usually a temporary issue on Google\'s side. Please try again in a few moments. If the problem persists, check that your Google account is active and not restricted.',
  },
  auth_failed: {
    title: 'Authentication failed',
    description: 'The sign-in process completed but your session could not be established.',
    detail:
      'This can happen due to a browser cookie issue, an expired session token, or a temporary server problem. Try clearing your browser cookies for this site and signing in again.',
  },
}

const FALLBACK: ErrorInfo = {
  title: 'Sign-in failed',
  description: 'An unexpected error occurred during sign-in.',
  detail:
    'Something went wrong. Please try again. If the issue keeps happening, try using a different browser or clearing your cookies.',
}

export default function AuthError() {
  const [params] = useSearchParams()
  const reason = params.get('reason') ?? ''
  const info = ERROR_MAP[reason] ?? FALLBACK

  return (
    <div className="auth-error-page">
      <section className="auth-error-header">
        <div className="container">
          <div className="auth-error-icon">✕</div>
          <h1 className="auth-error-title">{info.title}</h1>
          <p className="auth-error-desc">{info.description}</p>
        </div>
      </section>

      <div className="container auth-error-body">
        <div className="auth-error-card">
          <h2 className="auth-error-card-title">What happened?</h2>
          <p className="auth-error-card-text">{info.detail}</p>

          {reason === 'auth_failed' && (
            <div className="auth-error-steps">
              <p className="auth-error-steps-label">Try these steps:</p>
              <ol className="auth-error-step-list">
                <li>Clear cookies for this site in your browser settings</li>
                <li>Disable any browser extensions that might block cookies</li>
                <li>Make sure third-party cookies are not blocked for this domain</li>
                <li>Try signing in from a private/incognito window</li>
              </ol>
            </div>
          )}
        </div>

        <div className="auth-error-actions">
          <button className="btn-primary" onClick={() => login()}>
            Try signing in again
          </button>
          <Link to="/" className="auth-error-home-link">
            Back to home
          </Link>
        </div>

        <p className="auth-error-note">
          OpenVGD only uses your Google account name and email to identify you.
          See our <Link to="/privacy" className="auth-error-privacy-link">Privacy Policy</Link> for details.
        </p>
      </div>
    </div>
  )
}
