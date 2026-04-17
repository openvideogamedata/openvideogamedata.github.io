import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface LoginButtonProps {
  onSuccess?: () => void
  text?: string
}

export default function LoginButton({ onSuccess, text = 'Sign in with Google' }: LoginButtonProps) {
  const { refresh } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div className="google-login-shell" aria-label={text}>
      <div className={`google-login-slot ${isSubmitting ? 'is-pending' : ''}`}>
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            setIsSubmitting(true)
            try {
              const { needsFill } = await loginWithGoogle(credentialResponse)
              refresh()
              showToast('Signed in successfully.', 'success')
              if (needsFill) navigate('/users/fill')
              else onSuccess?.()
            } catch {
              navigate('/auth/error?reason=auth_failed')
            } finally {
              setIsSubmitting(false)
            }
          }}
          onError={() => navigate('/auth/error?reason=auth_failed')}
          text="signin_with"
          width="100%"
        />
      </div>
      {isSubmitting && (
        <div className="google-login-feedback" role="status" aria-live="polite">
          <span className="google-login-spinner" aria-hidden="true" />
          <span>Finishing sign-in. Please wait a few seconds.</span>
        </div>
      )}
    </div>
  )
}
