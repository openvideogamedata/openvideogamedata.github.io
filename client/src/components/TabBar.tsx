import './TabBar.css'

export interface Tab {
  key: string
  label: string
  count?: number
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-btn ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
