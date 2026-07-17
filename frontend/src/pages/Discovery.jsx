import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import ProfileCard from '../components/ProfileCard.jsx'
import { api, clearToken } from '../api/client.js'

export default function Discovery() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [radiusKm, setRadiusKm] = useState(100)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    refreshLocationThenLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, radiusKm])

  function refreshLocationThenLoad() {
    setLoading(true)
    setError(null)

    if (!showAll && navigator.geolocation) {
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
      const results = await api.nearby(radiusKm, showAll)
      setProfiles(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownloadZip() {
    setIsDownloading(true)
    try {
      const response = await fetch('/api/download-zip')
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'proximity-connect.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Failed to generate and download the ZIP file. Please use the direct link or refresh.')
    } finally {
      setIsDownloading(false)
    }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  // Live clientside search filtering
  const filteredProfiles = profiles.filter((p) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return (
      (p.displayName && p.displayName.toLowerCase().includes(query)) ||
      (p.gender && p.gender.toLowerCase().includes(query)) ||
      (p.orientationTag && p.orientationTag.toLowerCase().includes(query)) ||
      (p.identityType && p.identityType.toLowerCase().includes(query))
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="eyebrow">{showAll ? 'Global' : 'Nearby'}</div>
          <h1 style={{ fontSize: 24 }}>People around you</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="/api/download-zip"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'var(--text)'
            }}
            title="Download full project source code as ZIP"
          >
            <Download size={14} />
            <span>Download ZIP</span>
          </a>
          <button
            className="btn-secondary"
            onClick={handleLogout}
            style={{ padding: '8px 12px', fontSize: 13 }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Discovery Mode Selector & Search Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="btn-secondary"
            style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 16px',
              borderRadius: 'var(--radius)',
              background: !showAll ? 'rgba(43, 176, 154, 0.15)' : 'var(--surface)',
              border: !showAll ? '1.5px solid var(--signal-teal)' : '1.5px solid var(--border)',
              color: !showAll ? 'var(--signal-teal)' : 'var(--text)',
              fontWeight: !showAll ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            📍 Nearby Matches
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="btn-secondary"
            style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 16px',
              borderRadius: 'var(--radius)',
              background: showAll ? 'rgba(217, 70, 239, 0.15)' : 'var(--surface)',
              border: showAll ? '1.5px solid var(--signal-magenta)' : '1.5px solid var(--border)',
              color: showAll ? 'var(--signal-magenta)' : 'var(--text)',
              fontWeight: showAll ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            🌐 Global Discovery
          </button>
        </div>

        {!showAll && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>
                📍 Discovery Radius:
              </span>
              <span style={{ fontSize: 13, color: 'var(--signal-teal)', fontWeight: 600 }}>
                {radiusKm === 999999 ? 'Everywhere (Unlimited Distance)' : `${radiusKm} km`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {[10, 25, 50, 100, 500, 2000, 999999].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 20,
                    cursor: 'pointer',
                    background: radiusKm === km ? 'rgba(43, 176, 154, 0.2)' : 'var(--surface-2)',
                    color: radiusKm === km ? 'var(--signal-teal)' : 'var(--text-dim)',
                    border: radiusKm === km ? '1.5px solid var(--signal-teal)' : '1.5px solid var(--border)',
                    fontWeight: radiusKm === km ? 600 : 400,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {km === 999999 ? 'Everywhere' : `${km} km`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="field"
            placeholder={showAll ? "Search users by name, identity, tag..." : "Search nearby matches..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 12,
              paddingRight: 40,
              height: 44,
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              color: 'var(--text)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 40 }}>
          <div className="ping-wrap">
            <div className="ping-ring" />
            <div className="ping-ring" />
            <div className="ping-ring" />
            <div className="ping-dot" />
          </div>
          <p style={{ textAlign: 'center', marginTop: 20 }}>
            {showAll ? 'Fetching global registry…' : 'Scanning for people nearby…'}
          </p>
        </div>
      )}

      {!loading && error && <div className="error-banner">{error}</div>}

      {!loading && !error && filteredProfiles.length === 0 && (
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)' }}>
            {searchQuery 
              ? 'No matching users found for your search criteria.' 
              : showAll 
                ? 'No registered users found in the system yet.' 
                : 'No compatible matches nearby yet. Try switching to Global Discovery above!'}
          </p>
        </div>
      )}

      {!loading && !error && filteredProfiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredProfiles.map((p) => <ProfileCard key={p.id} profile={p} />)}
        </div>
      )}
    </div>
  )
}
