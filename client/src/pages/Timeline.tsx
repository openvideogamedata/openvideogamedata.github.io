import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ListCard, { fromCategoryDto } from '../components/ListCard'
import { getTimeline } from '../api/timeline'
import type { TimelineGeneration } from '../types'
import './Timeline.css'

const GEN_DESCRIPTIONS: Record<number, string> = {
  1: 'The first generation marks the inception of the video game industry with simple Pong-style games, often built into the console itself.',
  2: 'This era introduced programmable systems with colorful graphics and richer stories. Popular consoles included the Atari 2600.',
  3: 'The 8-bit era, with consoles like the NES, marking the rise of iconic franchises and the first golden age of home gaming.',
  4: 'The 16-bit revolution — Super Nintendo and Sega Genesis led the market with deeper gameplay and landmark soundtracks.',
  5: 'Video games entered the 3D era with PlayStation, Nintendo 64 and Sega Saturn, featuring complex graphics and deeper mechanics.',
  6: 'DVD technology and internet connectivity arrived. PlayStation 2, Xbox and GameCube expanded multimedia and online gaming.',
  7: 'HD graphics and motion gaming with Xbox 360, PlayStation 3 and Wii. Online ecosystems became integral to console gaming.',
  8: 'PlayStation 4, Xbox One and Nintendo Switch brought advanced graphics, expansive networks and innovative game designs.',
  9: 'PlayStation 5 and Xbox Series X|S focus on ultra-fast SSDs, ray tracing, and seamless next-gen experiences.',
}

export default function Timeline() {
  const [searchParams, setSearchParams] = useSearchParams()
  const genParam = searchParams.get('gen') ? Number(searchParams.get('gen')) : null
  const [data, setData] = useState<TimelineGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGen, setActiveGen] = useState<number | null>(genParam)

  useEffect(() => {
    getTimeline()
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function selectGen(gen: number | null) {
    setActiveGen(gen)
    if (gen) setSearchParams({ gen: String(gen) })
    else setSearchParams({})
  }

  const visibleGens = activeGen ? data.filter(g => g.generation === activeGen) : data

  return (
    <div className="timeline-page">
      <section className="timeline-header">
        <div className="container">
          <h1 className="page-title">Video Game History</h1>
          <p className="page-subtitle">
            The history of video games narrated through the best games of each console generation.
          </p>
        </div>
      </section>

      <div className="container timeline-body">
        {/* Generation picker */}
        {!loading && data.length > 0 && (
          <div className="gen-picker">
            <button
              className={`gen-pill ${activeGen === null ? 'active' : ''}`}
              onClick={() => selectGen(null)}
            >All</button>
            {data.map(g => (
              <button
                key={g.generation}
                className={`gen-pill ${activeGen === g.generation ? 'active' : ''}`}
                onClick={() => selectGen(g.generation)}
              >
                Gen {g.generation}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <TimelineSkeleton />
        ) : (
          visibleGens.map(gen => (
            <GenerationSection key={gen.generation} gen={gen} />
          ))
        )}
      </div>
    </div>
  )
}

function GenerationSection({ gen }: { gen: TimelineGeneration }) {
  return (
    <section className="gen-section">
      <div className="gen-section-header">
        <div className="gen-badge">Generation {gen.generation}</div>
        <h2 className="gen-title">{gen.title}</h2>
        {GEN_DESCRIPTIONS[gen.generation] && (
          <p className="gen-description">{GEN_DESCRIPTIONS[gen.generation]}</p>
        )}
      </div>

      {gen.lists.length > 0 ? (
        <div className="gen-lists-grid">
          {gen.lists.map(list => (
            <ListCard
              key={list.id}
              list={fromCategoryDto(list)}
            />
          ))}
        </div>
      ) : (
        <p className="gen-empty">No lists available yet for this generation.</p>
      )}
    </section>
  )
}

function TimelineSkeleton() {
  return (
    <div className="timeline-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="gen-section">
          <div className="skeleton" style={{ height: 20, width: 120, marginBottom: 10, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 28, width: 260, marginBottom: 12, borderRadius: 6 }} />
          <div className="gen-lists-grid">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j}>
                <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius)' }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 10, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
