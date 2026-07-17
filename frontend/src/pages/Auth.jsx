import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../api/client.js'

export default function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [identityType, setIdentityType] = useState('STRAIGHT') // 'STRAIGHT' | 'LGBTQ'
  const [gender, setGender] = useState('MALE') // 'MALE' | 'FEMALE' | 'NON_BINARY'
  const [orientationTag, setOrientationTag] = useState('QUEER') // LGBTQ Tags
  const [latitude, setLatitude] = useState(37.7749)
  const [longitude, setLongitude] = useState(-122.4194)

  // Fetch location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude)
          setLongitude(pos.coords.longitude)
        },
        () => { /* ignore, use default */ },
        { timeout: 5000 }
      )
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        const res = await api.login({ email, password })
        setToken(res.token)
        navigate('/')
      } else {
        const payload = {
          email,
          password,
          displayName,
          identityType,
          latitude,
          longitude,
        }
        if (identityType === 'STRAIGHT') {
          payload.gender = gender
        } else {
          payload.orientationTag = orientationTag
        }
        const res = await api.register(payload)
        setToken(res.token)
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at top, #1a1435 0%, #0e0a1a 80%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="eyebrow" style={{ color: 'var(--signal-teal)', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '12px', fontWeight: '600' }}>
            PROXIMITY CONNECT
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '600', color: 'var(--text)', marginTop: '8px', letterSpacing: '-0.02em' }}>
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '6px' }}>
            {isLogin ? 'Find and connect with people near you' : 'Join a secure local network'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 77, 0.1)',
            border: '1.5px solid #ff4d4d',
            color: '#ff4d4d',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: '1.5',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                width: '100%'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                width: '100%'
              }}
            />
          </div>

          {!isLogin && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>Identity Group</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIdentityType('STRAIGHT')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      background: identityType === 'STRAIGHT' ? 'rgba(43, 176, 154, 0.15)' : 'var(--surface-2)',
                      border: identityType === 'STRAIGHT' ? '1.5px solid var(--signal-teal)' : '1.5px solid var(--border)',
                      color: identityType === 'STRAIGHT' ? 'var(--signal-teal)' : 'var(--text)',
                      fontWeight: identityType === 'STRAIGHT' ? '600' : '400'
                    }}
                  >
                    📍 Straight
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentityType('LGBTQ')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      background: identityType === 'LGBTQ' ? 'rgba(217, 70, 239, 0.15)' : 'var(--surface-2)',
                      border: identityType === 'LGBTQ' ? '1.5px solid var(--signal-magenta)' : '1.5px solid var(--border)',
                      color: identityType === 'LGBTQ' ? 'var(--signal-magenta)' : 'var(--text)',
                      fontWeight: identityType === 'LGBTQ' ? '600' : '400'
                    }}
                  >
                    🌐 LGBTQ+
                  </button>
                </div>
              </div>

              {identityType === 'STRAIGHT' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>My Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%'
                    }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-binary</option>
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' }}>Orientation Tag</label>
                  <select
                    value={orientationTag}
                    onChange={(e) => setOrientationTag(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%'
                    }}
                  >
                    <option value="GAY">Gay</option>
                    <option value="LESBIAN">Lesbian</option>
                    <option value="BISEXUAL">Bisexual</option>
                    <option value="PANSEXUAL">Pansexual</option>
                    <option value="TRANSGENDER">Transgender</option>
                    <option value="NON_BINARY">Non-binary</option>
                    <option value="QUEER">Queer</option>
                    <option value="ASEXUAL">Asexual</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '12px',
              padding: '14px',
              borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--signal-teal), var(--signal-magenta))',
              color: '#0e0a1a',
              fontWeight: '600',
              border: 'none',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(43, 176, 154, 0.3)',
              transition: 'transform 0.15s ease'
            }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
