import { useNavigate } from 'react-router-dom'

const TAG_LABELS = {
  GAY: 'Gay', LESBIAN: 'Lesbian', BISEXUAL: 'Bisexual', PANSEXUAL: 'Pansexual',
  TRANSGENDER: 'Transgender', NON_BINARY: 'Non-binary', QUEER: 'Queer',
  ASEXUAL: 'Asexual', OTHER: 'Other',
}
const GENDER_LABELS = { MALE: 'Male', FEMALE: 'Female', NON_BINARY: 'Non-binary' }

export default function ProfileCard({ profile }) {
  const navigate = useNavigate()
  const subtitle = profile.identityType === 'LGBTQ'
    ? TAG_LABELS[profile.orientationTag] || profile.orientationTag
    : GENDER_LABELS[profile.gender] || profile.gender

  const initial = profile.displayName?.charAt(0)?.toUpperCase() || '?'

  const distanceStr = profile.distanceKm !== undefined
    ? `${profile.distanceKm} km away`
    : 'global'

  return (
    <div
      className="profile-card"
      onClick={() => navigate(`/profile/${profile.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="profile-avatar">{initial}</div>
      <div className="profile-info">
        <div className="profile-name">{profile.displayName}</div>
        <div className="profile-tag">{subtitle} · {distanceStr}</div>
      </div>
    </div>
  )
}
