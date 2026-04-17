import { Link, Navigate } from 'react-router-dom'
import LoginButton from '../components/LoginButton'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { user, loading } = useAuth()

  if (!loading && user) {
    return <Navigate to={`/users/${user.nickname}`} replace />
  }

  return (
    <section className="login-page">
      <div className="container login-shell">
        <div className="login-copy">
          <span className="login-kicker">OpenVGD Account</span>
          <h1 className="login-title">Log in or create your account in one step.</h1>
          <p className="login-lead">
            Use your Google account to unlock lists, badges, trackers, notifications, and your public profile.
          </p>

          <div className="login-highlights">
            <div className="login-highlight-card">
              <span className="login-highlight-label">What we use</span>
              <p>
                We only use your Google account name and email to identify your account and keep your OpenVGD profile connected to you.
              </p>
            </div>
            <div className="login-highlight-card">
              <span className="login-highlight-label">What we do not use</span>
              <p>
                We do not ask for your Google password, contacts, Drive files, or any data unrelated to your OpenVGD account.
              </p>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-glow" aria-hidden="true" />
          <div className="login-card">
            <span className="login-card-eyebrow">Secure sign-in</span>
            <h2>Continue with Google</h2>
            <p>
              Create your OpenVGD account or sign in to an existing one using the same Google identity.
            </p>

            <div className="login-button-wrap">
              <LoginButton text="Continue with Google" />
            </div>

            <p className="login-privacy-note">
              By continuing, you agree to use your Google account only for authentication on OpenVGD.
            </p>

            <div className="login-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/about">About OpenVGD</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
