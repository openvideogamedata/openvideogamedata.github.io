import './About.css'

export default function Privacy() {
  return (
    <div className="static-page">
      <section className="static-page-header">
        <div className="container">
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-subtitle">How we handle your data.</p>
        </div>
      </section>

      <div className="container static-page-body">
        <div className="static-content">
          <h2>What we collect</h2>
          <p>
            When you sign in with Google, we receive your name, email address, and profile picture
            from Google OAuth. We store only the information necessary to identify your account and
            display your public profile.
          </p>
          <p>
            We store your gaming activity — lists you contribute, games you track, and badges you
            earn. This data is public by default as part of the community experience.
          </p>

          <h2>What we do not collect</h2>
          <p>
            We do not collect payment information, run advertising trackers, or sell your data to
            third parties. We do not store passwords — authentication is handled entirely by Google.
          </p>

          <h2>Cookies</h2>
          <p>
            We use a single session cookie to maintain your login state. This cookie is marked
            <code> SameSite=None; Secure</code> to allow cross-domain authentication between our
            frontend (GitHub Pages) and backend (Render).
          </p>

          <h2>Data deletion</h2>
          <p>
            You can request deletion of your account and all associated data at any time by opening
            an issue on our GitHub repository or contacting us directly.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            This policy may be updated as the project evolves. Significant changes will be announced
            in the project's GitHub repository.
          </p>
        </div>
      </div>
    </div>
  )
}
