export default function StepIndicator({ total, current }) {
  return (
    <div className="step-indicator">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`step-dash ${i < current ? 'done' : ''}`} />
      ))}
    </div>
  )
}
