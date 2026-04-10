import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <nav className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <a href="https://github.com/openvideogamedata/gamelist-aggregator" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
