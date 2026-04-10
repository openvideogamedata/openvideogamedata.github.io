import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-icon">◈</span>
          <span className="footer-name">Open Video Game Data</span>
        </div>
        <nav className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <a href="https://github.com/openvideogamedata/gamelist-aggregator" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
        <p className="footer-copy">
          Community-curated. Open data.
        </p>
      </div>
    </footer>
  )
}
