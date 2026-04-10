import { useState, useEffect } from 'react'
import { getAboutPage } from '../api/staticPages'
import './About.css'

export default function About() {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const skeletonWidths = ['88%', '76%', '92%', '81%', '69%', '84%']

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
          <p className="page-subtitle">A place to discover and compare video game lists.</p>
        </div>
      </section>

      <div className="container static-page-body">
        {loading ? (
          <div className="static-skeleton">
            {skeletonWidths.map((width, i) => (
              <div key={i} className="skeleton static-skeleton-line" style={{ width }} />
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
        Open Video Game Data is a project for collecting and comparing ranked video game lists.
      </p>
      <p>
        Visitors can explore category rankings, open original source lists, search for games, and browse
        a video game history timeline.
      </p>
      <p>
        Open Video Game Data is maintained by André N. Darcie and Diego Penha as a hobby project.
      </p>
    </div>
  )
}
