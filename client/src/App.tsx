import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Search from './pages/Search'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Timeline from './pages/Timeline'
import About from './pages/About'
import Privacy from './pages/Privacy'
import TopContributors from './pages/TopContributors'
import SourceListDetail from './pages/SourceListDetail'
import Badges from './pages/Badges'
import UserProfile from './pages/UserProfile'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:id" element={<GameDetail />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/top-contributors" element={<TopContributors />} />
            <Route path="/source-lists/:id" element={<SourceListDetail />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/users/:nickname" element={<UserProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
