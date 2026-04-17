import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '../api/auth'
import { useAuth } from '../context/AuthContext'

interface LoginButtonProps {
  onSuccess?: () => void
  text?: string
}

export default function LoginButton({ onSuccess, text = 'Sign in with Google' }: LoginButtonProps) {
  const { refresh } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="google-login-slot" aria-label={text}>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            const { needsFill } = await loginWithGoogle(credentialResponse)
            refresh()
            if (needsFill) navigate('/users/fill')
            else onSuccess?.()
          } catch {
            navigate('/auth/error?reason=auth_failed')
          }
        }}
        onError={() => navigate('/auth/error?reason=auth_failed')}
        text="signin_with"
      />
    </div>
  )
}
