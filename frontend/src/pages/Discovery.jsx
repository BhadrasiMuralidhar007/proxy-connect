import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard.jsx'
import { api, clearToken } from '../api/client.js'

export default function Discovery() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    refreshLocationThenLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refreshLocationThenLoad() {
    setLoading(true)
    setError(null)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.updateLocation(pos.coords.latitude, pos.coords.longitude)
          } catch { /* non-fatal: fall through to loading with last known location */ }
          loadNearby()
        },
        () => loadNearby(), // location denied - try with whatever's already on file
        { timeout: 5000 }
      )
    } else {
      loadNearby()
    }
  }

  async function loadNearby() {
    try {
      const results = await api.nearby()
      setProfiles(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Nearby</div>
          <h1 style={{ fontSize: 24 }}>People around you</h1>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>Log out</button>
      </div>

      {loading && (
        <div style={{ marginTop: 60 }}>
          <div className="ping-wrap">
            <div className="ping-ring" />
            <div className="ping-ring" />
            <div className="ping-ring" />
            <div className="ping-dot" />
          </div>
          <p style={{ textAlign: 'center', marginTop: 20 }}>Scanning for people nearby…</p>
        </div>
      )}

      {!loading && error && <div className="error-banner">{error}</div>}

      {!loading && !error && profiles.length === 0 && (
        <div style={{ marginTop: 60, textAlign: 'center' }}>
          <p>No one nearby yet. Check back soon, or widen your search radius in settings.</p>
        </div>
      )}

      {!loading && !error && profiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profiles.map((p) => <ProfileCard key={p.id} profile={p} />)}
        </div>
      )}
    </div>
  )
}
