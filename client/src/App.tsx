import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Search from './pages/Search'
import Lists from './pages/Lists'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Timeline from './pages/Timeline'
import About from './pages/About'
import Privacy from './pages/Privacy'
import TopContributors from './pages/TopContributors'
import SourceListDetail from './pages/SourceListDetail'
import Badges from './pages/Badges'
import ListDetail from './pages/ListDetail'
import UserProfile from './pages/UserProfile'
import UserLists from './pages/UserLists'
import UserTrackers from './pages/UserTrackers'
import Friends from './pages/Friends'
import Notifications from './pages/Notifications'
import ListSuggestions from './pages/ListSuggestions'
import ListSuggestionForm from './pages/ListSuggestionForm'
import FillUserInfo from './pages/FillUserInfo'
import BadgesPromo from './pages/BadgesPromo'
import UsersSearch from './pages/UsersSearch'
import UserListForm from './pages/UserListForm'
import AdminUsers from './pages/AdminUsers'
import AdminNewMasterList from './pages/AdminNewMasterList'
import AdminEditMasterList from './pages/AdminEditMasterList'
import AdminListSuggestions from './pages/AdminListSuggestions'
import Login from './pages/Login'
import AuthError from './pages/AuthError'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Phase 1 — Public */}
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:id" element={<GameDetail />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/list/:slug" element={<ListDetail />} />
            <Route path="/list/:slug/:mode" element={<ListDetail />} />
            <Route path="/source-lists/:id" element={<SourceListDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />

            {/* Phase 2 — Public profiles */}
            <Route path="/users/:nickname" element={<UserProfile />} />
            <Route path="/users/:nickname/lists" element={<UserLists />} />
            <Route path="/users/:nickname/trackers" element={<UserTrackers />} />
            <Route path="/top-contributors" element={<TopContributors />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/badges/promo" element={<BadgesPromo />} />

            {/* Phase 3 — Authenticated */}
            <Route path="/users" element={<UsersSearch />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/list-suggestions" element={<ListSuggestions />} />
            <Route path="/new-list/:slug" element={<ListSuggestionForm />} />
            <Route path="/users/fill" element={<FillUserInfo />} />
            <Route path="/lists/new" element={<UserListForm />} />
            <Route path="/lists/:id/edit" element={<UserListForm />} />

            {/* Phase 4 — Admin */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/lists/new" element={<AdminNewMasterList />} />
            <Route path="/admin/lists/:slug/edit" element={<AdminEditMasterList />} />
            <Route path="/admin/list-suggestions" element={<AdminListSuggestions />} />

            <Route path="/auth/error" element={<AuthError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
