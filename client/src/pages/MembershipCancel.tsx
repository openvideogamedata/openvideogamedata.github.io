import { Link } from 'react-router-dom'
import './MembershipReturn.css'

export default function MembershipCancel() {
  return (
    <div className="membership-return-page">
      <section className="membership-return-header membership-return-header-cancel">
        <div className="container membership-return-container">
          <div className="membership-return-badge">NO</div>
          <h1 className="membership-return-title">Membership checkout canceled</h1>
          <p className="membership-return-text">
            No charge was made. You can start checkout again whenever you want to create personal lists.
          </p>
          <div className="membership-return-actions">
            <Link to="/lists/new" className="membership-return-primary">
              Try again
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
