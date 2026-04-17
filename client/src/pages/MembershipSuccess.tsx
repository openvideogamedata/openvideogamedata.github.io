import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { refreshAuthToken } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import './MembershipReturn.css'

const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

export default function MembershipSuccess() {
  const { refresh } = useAuth()
  const [syncState, setSyncState] = useState<'syncing' | 'ready' | 'delayed' | 'failed'>('syncing')

  useEffect(() => {
    let canceled = false

    async function syncMembershipToken() {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await refreshAuthToken()
          const profile = await refresh()
          if (canceled) return

          if (profile?.isMember) {
            setSyncState('ready')
            return
          }
        } catch {
          if (canceled) return
          setSyncState('failed')
          return
        }

        if (attempt === 2) {
          setSyncState('delayed')
        }
        await sleep(1500)
      }

      if (!canceled) {
        setSyncState('failed')
      }
    }

    syncMembershipToken()
    return () => { canceled = true }
  }, [refresh])

  return (
    <div className="membership-return-page">
      <section className="membership-return-header membership-return-header-success">
        <div className="container membership-return-container">
          <div className="membership-return-badge">OK</div>
          <h1 className="membership-return-title">You are a member now</h1>
          <p className="membership-return-text">
            Thanks for supporting OpenVGD. Your membership is active and personal lists are available.
          </p>
          {syncState === 'syncing' && (
            <p className="membership-return-status">Updating your session...</p>
          )}
          {syncState === 'delayed' && (
            <p className="membership-return-status">Waiting for Stripe to confirm your membership...</p>
          )}
          {syncState === 'failed' && (
            <p className="membership-return-status">
              Your payment completed, but your session was not updated yet. Refresh this page in a few seconds.
            </p>
          )}
          <div className="membership-return-actions">
            <Link to="/lists/new" className="membership-return-primary">
              Create a list
            </Link>
            <Link to="/" className="membership-return-secondary">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
