import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { connectChat, sendChatMessage } from '../api/chatSocket.js'

// Decoded once from the JWT payload so we know which messages are "mine"
// vs. "theirs" without a separate API call.
function currentUserId() {
  const token = localStorage.getItem('pc_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Number(payload.sub)
  } catch {
    return null
  }
}

export default function Chat() {
  const { id: otherUserId } = useParams()
  const navigate = useNavigate()
  const selfId = currentUserId()

  const [otherProfile, setOtherProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  const clientRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.profileById(otherUserId).then(setOtherProfile).catch((err) => setError(err.message))
    api.chatHistory(otherUserId).then(setMessages).catch((err) => setError(err.message))

    const client = connectChat(
      (incoming) => {
        // Only append messages that belong to this specific conversation -
        // the personal queue carries messages from every chat, not just this one.
        const belongsHere =
          (String(incoming.senderId) === String(otherUserId) && String(incoming.recipientId) === String(selfId)) ||
          (String(incoming.senderId) === String(selfId) && String(incoming.recipientId) === String(otherUserId))
        if (belongsHere) {
          setMessages((prev) => [...prev, incoming])
        }
      },
      () => setConnected(true)
    )
    clientRef.current = client

    return () => {
      client.deactivate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !clientRef.current) return
    sendChatMessage(clientRef.current, Number(otherUserId), draft.trim())
    setDraft('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn-secondary" onClick={() => navigate(-1)}>←</button>
        <div>
          <div style={{ fontWeight: 600 }}>{otherProfile?.displayName || 'Loading…'}</div>
          <div style={{ fontSize: 12, color: connected ? 'var(--signal-teal)' : 'var(--text-dim)' }}>
            {connected ? 'Connected' : 'Connecting…'}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
        {messages.map((m, i) => {
          const mine = String(m.senderId) === String(selfId)
          return (
            <div
              key={m.id ?? i}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: mine ? 'linear-gradient(135deg, var(--signal-teal), var(--signal-magenta))' : 'var(--surface)',
                color: mine ? '#0e0a1a' : 'var(--text)',
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 14,
              }}
            >
              {m.content}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="field"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!connected}>Send</button>
      </form>
    </div>
  )
}
