import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator.jsx'
import { api, setToken } from '../api/client.js'

const ORIENTATION_OPTIONS = [
  { value: 'GAY', label: 'Gay' },
  { value: 'LESBIAN', label: 'Lesbian' },
  { value: 'BISEXUAL', label: 'Bisexual' },
  { value: 'PANSEXUAL', label: 'Pansexual' },
  { value: 'TRANSGENDER', label: 'Transgender' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'QUEER', label: 'Queer' },
  { value: 'ASEXUAL', label: 'Asexual' },
  { value: 'OTHER', label: 'Other', sub: "Doesn't quite fit the list above" },
]

const TOTAL_STEPS = 3

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [identityType, setIdentityType] = useState(null)
  const [gender, setGender] = useState(null)
  const [orientationTag, setOrientationTag] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function goNext() { setError(null); setStep((s) => s + 1) }
  function goBack() { setError(null); setStep((s) => Math.max(1, s - 1)) }

  function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      )
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const location = await getLocation()
      const { token } = await api.register({
        email,
        password,
        displayName,
        identityType,
        gender,
        orientationTag: identityType === 'LGBTQ' ? orientationTag : null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      })
      setToken(token)
      navigate('/discover')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <StepIndicator total={TOTAL_STEPS} current={step} />

      {step === 1 && (
        <div>
          <div className="eyebrow">Step 1 of {TOTAL_STEPS}</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>How do you identify?</h1>
          <p style={{ marginBottom: 24 }}>This decides who we show you nearby — you can change it later.</p>
          <div className="choice-grid">
            <button
              className={`choice-card ${identityType === 'STRAIGHT' ? 'selected' : ''}`}
              onClick={() => { setIdentityType('STRAIGHT'); setOrientationTag(null) }}
            >
              Straight
              <span className="sub">We'll show you the opposite gender nearby</span>
            </button>
            <button
              className={`choice-card ${identityType === 'LGBTQ' ? 'selected' : ''}`}
              onClick={() => { setIdentityType('LGBTQ'); setGender(null) }}
            >
              LGBTQ+
              <span className="sub">Tell us your orientation, we'll match accordingly</span>
            </button>
          </div>
          <div style={{ marginTop: 28 }}>
            <button className="btn-primary" disabled={!identityType} onClick={goNext} style={{ width: '100%' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && identityType === 'STRAIGHT' && (
        <div>
          <div className="eyebrow">Step 2 of {TOTAL_STEPS}</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>What's your gender?</h1>
          <p style={{ marginBottom: 24 }}>We'll show you nearby profiles of the opposite gender.</p>
          <div className="choice-grid">
            {['MALE', 'FEMALE'].map((g) => (
              <button key={g} className={`choice-card ${gender === g ? 'selected' : ''}`} onClick={() => setGender(g)}>
                {g === 'MALE' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button className="btn-secondary" onClick={goBack}>Back</button>
            <button className="btn-primary" disabled={!gender} onClick={goNext} style={{ flex: 1 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && identityType === 'LGBTQ' && (
        <div>
          <div className="eyebrow">Step 2 of {TOTAL_STEPS}</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>How would you describe yourself?</h1>
          <p style={{ marginBottom: 24 }}>We'll show you nearby profiles with compatible identities.</p>
          <div className="choice-grid">
            {ORIENTATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`choice-card ${orientationTag === opt.value ? 'selected' : ''}`}
                onClick={() => setOrientationTag(opt.value)}
              >
                {opt.label}
                {opt.sub && <span className="sub">{opt.sub}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button className="btn-secondary" onClick={goBack}>Back</button>
            <button className="btn-primary" disabled={!orientationTag} onClick={goNext} style={{ flex: 1 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <div className="eyebrow">Step 3 of {TOTAL_STEPS}</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Create your account</h1>
          <p style={{ marginBottom: 24 }}>We'll also ask for your location to find people nearby.</p>

          {error && <div className="error-banner">{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="field" placeholder="Display name" value={displayName}
                   onChange={(e) => setDisplayName(e.target.value)} required />
            <input className="field" type="email" placeholder="Email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
            <input className="field" type="password" placeholder="Password (min. 8 characters)" value={password}
                   onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" className="btn-secondary" onClick={goBack}>Back</button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Creating account…' : 'Find people nearby'}
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--signal-teal)' }}>Log in</a>
          </p>
        </form>
      )}
    </div>
  )
}
