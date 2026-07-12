import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../api/client.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { token } = await api.login({ email, password })
      setToken(token)
      navigate('/discover')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 60 }}>
      <div className="eyebrow">Welcome back</div>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Log in</h1>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="field" type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 20 }}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>

      <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
        New here? <a href="/onboarding" style={{ color: 'var(--signal-teal)' }}>Create an account</a>
      </p>
    </form>
  )
}
