import { Link } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="nf-code">404</div>
      <h1 className="nf-title">Page not found</h1>
      <p className="nf-message">This page does not exist or has been moved.</p>
      <Link to="/" className="nf-btn">Back to home</Link>
    </div>
  )
}
