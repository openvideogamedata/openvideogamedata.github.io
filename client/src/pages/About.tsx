import { useState, useEffect } from 'react'
import { getAboutPage } from '../api/staticPages'
import './About.css'

export default function About() {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAboutPage()
      .then(res => { setContent(res.content); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="static-page">
      <section className="static-page-header">
        <div className="container">
          <h1 className="page-title">About OpenVGD</h1>
          <p className="page-subtitle">The open video game database built by the community.</p>
        </div>
      </section>

      <div className="container static-page-body">
        {loading ? (
          <div className="static-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 16, width: `${70 + Math.random() * 25}%`, marginBottom: 12, borderRadius: 4 }} />
            ))}
          </div>
        ) : content ? (
          <div className="static-content">
            {content.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <AboutFallback />
        )}
      </div>
    </div>
  )
}

function AboutFallback() {
  return (
    <div className="static-content">
      <p>
        OpenVGD is a community-driven platform that aggregates the best video game lists from critics,
        publications, and players around the world.
      </p>
      <p>
        Our goal is to create the most complete and unbiased view of video game history — not just the
        top sellers, but the games that defined generations, shaped culture, and stood the test of time.
      </p>
      <p>
        We collect data from hundreds of sources — from major gaming publications to niche forums — and
        combine them into a single, searchable database.
      </p>
      <p>
        Users can contribute their own lists, track their gaming progress, earn badges, and discover
        what games their friends are playing.
      </p>
      <h2>Open data</h2>
      <p>
        All aggregated data is available for export. We believe game history should be accessible to
        everyone — researchers, developers, and enthusiasts alike.
      </p>
      <h2>Community</h2>
      <p>
        OpenVGD is free and open source. Contributions, bug reports, and suggestions are welcome on
        GitHub.
      </p>
    </div>
  )
}
