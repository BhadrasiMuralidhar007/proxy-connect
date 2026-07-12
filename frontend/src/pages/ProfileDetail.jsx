import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client.js'

const TAG_LABELS = {
  GAY: 'Gay', LESBIAN: 'Lesbian', BISEXUAL: 'Bisexual', PANSEXUAL: 'Pansexual',
  TRANSGENDER: 'Transgender', NON_BINARY: 'Non-binary', QUEER: 'Queer',
  ASEXUAL: 'Asexual', OTHER: 'Other',
}
const GENDER_LABELS = { MALE: 'Male', FEMALE: 'Female', NON_BINARY: 'Non-binary' }

export default function ProfileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.profileById(id).then(setProfile).catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <div>
        <div className="error-banner">{error}</div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ marginTop: 60 }}>
        <div className="ping-wrap">
          <div className="ping-ring" />
          <div className="ping-ring" />
          <div className="ping-ring" />
          <div className="ping-dot" />
        </div>
      </div>
    )
  }

  const subtitle = profile.identityType === 'LGBTQ'
    ? TAG_LABELS[profile.orientationTag] || profile.orientationTag
    : GENDER_LABELS[profile.gender] || profile.gender

  const initial = profile.displayName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div>
      <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          className="profile-avatar"
          style={{ width: 88, height: 88, fontSize: 32, margin: '0 auto 16px' }}
        >
          {initial}
        </div>
        <h1 style={{ fontSize: 24 }}>{profile.displayName}</h1>
        <p style={{ marginTop: 4 }}>{subtitle} · nearby</p>
      </div>

      <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/chat/${profile.id}`)}>
        Message {profile.displayName}
      </button>
    </div>
  )
}
