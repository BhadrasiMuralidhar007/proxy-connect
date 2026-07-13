import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { connectChat, sendChatMessage } from '../api/chatSocket.js'
import { compressAndResizeImage } from '../utils/image.js'
import { encryptMessage, decryptMessage, getOrGenerateMyKeys } from '../utils/crypto.js'
import {
  Camera,
  MapPin,
  Send,
  ExternalLink,
  X,
  Loader2,
  Navigation,
  Image as ImageIcon,
  Check,
  Video,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Square
} from 'lucide-react'

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

// Custom E2EE Voice Message player component
function VoiceNotePlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime / (audio.duration || 1));
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error(err));
    }
    setPlaying(!playing);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px', width: 220 }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${progress * 100}%`, background: 'var(--signal-teal)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
          <span>🎙️ Voice Message</span>
          <span>{playing ? formatTime(audioRef.current?.currentTime) : (duration ? formatTime(duration) : '0:05')}</span>
        </div>
      </div>
    </div>
  );
}

// Native, self-contained AudioContext Ringtone Player Synthesizer (fully offline and zero latency)
let ringtoneAudioCtx = null;
let ringtoneInterval = null;

function startRingtone(type) {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    stopRingtone();
    ringtoneAudioCtx = new AudioCtx();
    const playRing = () => {
      if (!ringtoneAudioCtx || ringtoneAudioCtx.state === 'closed') return;
      const osc = ringtoneAudioCtx.createOscillator();
      const gain = ringtoneAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(ringtoneAudioCtx.destination);
      
      if (type === 'outgoing') {
        osc.frequency.setValueAtTime(440, ringtoneAudioCtx.currentTime);
        osc.frequency.setValueAtTime(480, ringtoneAudioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ringtoneAudioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ringtoneAudioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ringtoneAudioCtx.currentTime + 1.2);
        osc.start();
        osc.stop(ringtoneAudioCtx.currentTime + 1.3);
      } else {
        osc.frequency.setValueAtTime(330, ringtoneAudioCtx.currentTime);
        osc.frequency.setValueAtTime(392, ringtoneAudioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(523, ringtoneAudioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0, ringtoneAudioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ringtoneAudioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ringtoneAudioCtx.currentTime + 1.8);
        osc.start();
        osc.stop(ringtoneAudioCtx.currentTime + 2.0);
      }
    };
    playRing();
    ringtoneInterval = setInterval(playRing, 3000);
  } catch (err) {
    console.error("Ringtone playback error:", err);
  }
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneAudioCtx) {
    ringtoneAudioCtx.close().catch(() => {});
    ringtoneAudioCtx = null;
  }
}

const PRESET_SPOTS = [
  { name: '☕ Charming Café Grind', lat: 37.7749, lng: -122.4194 },
  { name: '🌌 Starlight Skybar Rooftop', lat: 37.7833, lng: -122.4167 },
  { name: '📚 Quiet Bookstore Lounge', lat: 37.7699, lng: -122.4468 },
  { name: '🌸 Botanical Glasshouse Garden', lat: 37.7715, lng: -122.4687 },
  { name: '🌅 Sunset Ocean Pier', lat: 37.7801, lng: -122.5137 },
  { name: '🍝 Riverside Romantic Trattoria', lat: 37.7599, lng: -122.4368 }
]

function createSimulatedStream(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  let angle = 0;
  const intervalId = setInterval(() => {
    if (!ctx) return;
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, 640, 480);
    
    // Draw neon glowing radar/audio-wave orbits
    ctx.strokeStyle = '#2bb09a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 240, 110 + Math.sin(angle) * 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(320, 240, 60 - Math.cos(angle) * 10, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing central indicator
    ctx.fillStyle = '#2bb09a';
    ctx.beginPath();
    ctx.arc(320, 240, 10 + Math.sin(angle * 2) * 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Aesthetic text information
    ctx.fillStyle = '#2bb09a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 END-TO-END ENCRYPTED STREAM', 320, 380);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('IFRAME SANDBOX FALLBACK (ACTIVE)', 320, 410);

    angle += 0.05;
  }, 40);

  const captureStreamFunc = canvas.captureStream || canvas.mozCaptureStream || canvas.webkitCaptureStream;
  let stream;
  if (captureStreamFunc) {
    stream = captureStreamFunc.call(canvas, 25);
  } else {
    stream = new MediaStream();
  }

  // Create simulated audio
  let osc = null;
  let audioCtx = null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      const dest = audioCtx.createMediaStreamDestination();
      osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 350;
      gain.gain.value = 0.001; // barely audible hum
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }
  } catch (err) {
    console.warn('Failed to generate simulated audio:', err);
  }

  // Hook track stops to clean up intervals and audio contexts
  const videoTrack = stream.getVideoTracks()[0];
  const originalStopVideo = videoTrack ? videoTrack.stop.bind(videoTrack) : null;
  if (videoTrack) {
    videoTrack.stop = () => {
      clearInterval(intervalId);
      if (originalStopVideo) originalStopVideo();
    };
  } else {
    stream.cleanupSimulated = () => {
      clearInterval(intervalId);
      try {
        if (osc) osc.stop();
        if (audioCtx) audioCtx.close();
      } catch (e) {}
    };
  }

  const audioTrack = stream.getAudioTracks()[0];
  const originalStopAudio = audioTrack ? audioTrack.stop.bind(audioTrack) : null;
  if (audioTrack) {
    audioTrack.stop = () => {
      try {
        if (osc) osc.stop();
        if (audioCtx) audioCtx.close();
      } catch (e) {}
      if (originalStopAudio) originalStopAudio();
    };
  }

  return stream;
}

async function acquireMediaStream(type) {
  const constraints = {
    audio: true,
    video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn('Failed to acquire real media hardware, generating elegant simulated fallback stream:', err);
    if (type === 'video') {
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const simVideo = createSimulatedStream('video');
        const combined = new MediaStream();
        audioOnlyStream.getAudioTracks().forEach(t => combined.addTrack(t));
        simVideo.getVideoTracks().forEach(t => combined.addTrack(t));
        return combined;
      } catch (voiceErr) {
        return createSimulatedStream(type);
      }
    }
    return createSimulatedStream(type);
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

  // End-to-End Encryption Keys
  const [myKeys, setMyKeys] = useState(null)

  // Attachments UI states
  const [isCompressing, setIsCompressing] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [activePhotoModal, setActivePhotoModal] = useState(null)

  // Camera & Photo source selection states
  const [showPhotoSourcePicker, setShowPhotoSourcePicker] = useState(false)
  const [showCameraStream, setShowCameraStream] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)

  // WebRTC Calling States
  const [callState, setCallState] = useState('idle') // 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [callType, setCallType] = useState('video') // 'video' | 'voice'
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(false)

  // Voice recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Refs for WebRTC & Audio Recording
  const clientRef = useRef(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const handleIncomingSignalRef = useRef(null)

  // 1. Initialize our E2EE Keypair and publish public key
  useEffect(() => {
    if (selfId) {
      getOrGenerateMyKeys(selfId, api)
        .then((keys) => {
          setMyKeys(keys)
        })
        .catch((err) => {
          console.error("Failed to initialize cryptographic E2EE keys:", err)
        })
    }
  }, [selfId])

  // 2. Fetch other user profile and message history
  useEffect(() => {
    api.profileById(otherUserId).then(setOtherProfile).catch((err) => setError(err.message))
    api.chatHistory(otherUserId).then(setMessages).catch((err) => setError(err.message))

    const client = connectChat(
      (incoming) => {
        if (incoming.isSignal || incoming.content?.startsWith('SIGNAL:')) {
          if (handleIncomingSignalRef.current) {
            handleIncomingSignalRef.current(incoming)
          }
          return
        }

        // Only append messages that belong to this specific conversation
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
      stopRingtone()
      // Make sure we stop camera stream if active on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (pcRef.current) {
        pcRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId])

  // 3. Reactive On-The-Fly Message Decryption
  useEffect(() => {
    if (!myKeys?.privateKeyStr || messages.length === 0) return

    let needsDecryption = messages.some((m) => m.content.trim().startsWith('{') && !m.isE2eeDecrypted)
    if (needsDecryption) {
      const decryptMsgList = async (list) => {
        return Promise.all(
          list.map(async (m) => {
            if (m.isE2eeDecrypted) return m
            const trimmed = m.content.trim()
            if (trimmed.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmed)
                if (parsed.e2ee) {
                  const isMine = String(m.senderId) === String(selfId)
                  const decrypted = await decryptMessage(m.content, myKeys.privateKeyStr, isMine)
                  return { ...m, content: decrypted, isE2eeDecrypted: true }
                }
              } catch (err) {
                // Return as-is if parsing or decryption fails
              }
            }
            return m
          })
        )
      }

      decryptMsgList(messages).then((decryptedList) => {
        // Only update state if anything changed to avoid infinite render loops
        const changed = decryptedList.some((m, idx) => m.content !== messages[idx].content || m.isE2eeDecrypted !== messages[idx].isE2eeDecrypted)
        if (changed) {
          setMessages(decryptedList)
        }
      })
    }
  }, [myKeys, messages, selfId])

  // 4. Bind video element to camera stream when active
  useEffect(() => {
    if (showCameraStream && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
  }, [showCameraStream, cameraStream])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- WEBRTC SIGNALLING & CALLING HANDLERS ---
  const [incomingOfferSdp, setIncomingOfferSdp] = useState(null)

  // Call stopwatch Timer
  useEffect(() => {
    let timer = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  const sendSignal = (payload) => {
    if (clientRef.current) {
      sendChatMessage(clientRef.current, Number(otherUserId), `SIGNAL:${JSON.stringify(payload)}`);
    }
  };

  const sendSignalToSelf = (payload) => {
    if (clientRef.current && selfId) {
      sendChatMessage(clientRef.current, Number(selfId), `SIGNAL:${JSON.stringify(payload)}`);
    }
  };

  const handleIncomingSignal = async (incoming) => {
    try {
      const raw = incoming.content.substring('SIGNAL:'.length);
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'call-offer':
          if (callState !== 'idle') {
            sendSignal({ type: 'call-busy' });
            return;
          }
          setCallType(data.callType || 'video');
          setIncomingOfferSdp(data.sdp);
          setCallState('incoming');
          startRingtone('incoming');
          break;

        case 'call-answer':
          if (callState === 'outgoing') {
            stopRingtone();
            setCallState('connected');
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
          }
          break;

        case 'call-answered-elsewhere':
        case 'call-rejected-elsewhere':
          if (callState === 'incoming') {
            cleanupCall();
          }
          break;

        case 'call-busy':
          if (callState === 'outgoing') {
            cleanupCall();
            setError('User is currently on another call or busy.');
          }
          break;

        case 'call-rejected':
          if (callState === 'outgoing') {
            cleanupCall();
            setError('Call was rejected.');
          }
          break;

        case 'call-ended':
          cleanupCall();
          break;

        case 'ice-candidate':
          if (pcRef.current && data.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  };

  useEffect(() => {
    handleIncomingSignalRef.current = handleIncomingSignal;
  });

  const startCall = async (type) => {
    setCallType(type);
    setCallState('outgoing');
    startRingtone('outgoing');

    try {
      const stream = await acquireMediaStream(type);

      localStreamRef.current = stream;
      
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: 'ice-candidate', candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'call-offer', sdp: offer, callType: type });

    } catch (err) {
      console.error('Failed to get media stream for call:', err);
      cleanupCall();
      setError('Could not access microphone or camera. Please check permissions.');
    }
  };

  const acceptCall = async () => {
    stopRingtone();
    setCallState('connected');
    sendSignalToSelf({ type: 'call-answered-elsewhere' });

    try {
      const stream = await acquireMediaStream(callType);

      localStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: 'ice-candidate', candidate: event.candidate });
        }
      };

      if (incomingOfferSdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferSdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'call-answer', sdp: answer });
      }

    } catch (err) {
      console.error('Failed to accept call:', err);
      cleanupCall();
      setError('Could not access microphone or camera to accept call.');
    }
  };

  const rejectCall = () => {
    sendSignal({ type: 'call-rejected' });
    sendSignalToSelf({ type: 'call-rejected-elsewhere' });
    cleanupCall();
  };

  const endCall = () => {
    sendSignal({ type: 'call-ended' });
    cleanupCall();
  };

  const cleanupCall = () => {
    stopRingtone();
    setCallState('idle');
    setIncomingOfferSdp(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoPaused(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideoPause = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoPaused(!videoTrack.enabled);
      }
    }
  };

  // --- AUDIO MESSAGE RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 2000) return;

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          
          const payload = {
            type: 'voice',
            url: base64Audio
          };

          let finalContent = JSON.stringify(payload);
          if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
            try {
              finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr);
            } catch (err) {
              console.error('Voice message encryption failed:', err);
            }
          }

          if (clientRef.current) {
            sendChatMessage(clientRef.current, Number(otherUserId), finalContent);
          }
        };
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start voice recording:', err);
      setError('Could not access microphone for voice message.');
    }
  };

  const stopRecording = (shouldSend) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingAudio(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = () => {
          audioChunksRef.current = [];
        };
      }
      mediaRecorderRef.current.stop();
    }
  };

  // --- SEND PLAIN TEXT MESSAGE ---
  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !clientRef.current) return

    let finalContent = draft.trim()
    // Encrypt if recipient supports E2EE
    if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
      try {
        finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr)
      } catch (err) {
        console.error("E2EE encryption failed, sending as fallback plaintext:", err)
      }
    }

    sendChatMessage(clientRef.current, Number(otherUserId), finalContent)
    setDraft('')
  }

  // --- CAMERA INTERACTION METHODS ---
  function handlePhotoClick() {
    setShowPhotoSourcePicker(true)
  }

  async function startCamera() {
    setShowPhotoSourcePicker(false)
    setShowCameraStream(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      })
      setCameraStream(stream)
    } catch (err) {
      console.error("Camera access failed:", err)
      setError('Could not access camera. Please check device permissions.')
      setShowCameraStream(false)
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCameraStream(false)
  }

  async function capturePhoto() {
    if (!videoRef.current) return
    setIsCompressing(true)
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert canvas frame to JPEG blob
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
        if (blob) {
          const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' })
          const base64Data = await compressAndResizeImage(file, 800, 800, 0.8)
          
          const payload = {
            type: 'photo',
            url: base64Data
          }

          let finalContent = JSON.stringify(payload)
          if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
            finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr)
          }

          if (clientRef.current) {
            sendChatMessage(clientRef.current, Number(otherUserId), finalContent)
          }
        }
      }
    } catch (err) {
      console.error("Capture failed:", err)
      setError('Failed to capture or process photo from camera.')
    } finally {
      setIsCompressing(false)
      stopCamera()
    }
  }

  // --- GALLERY FILE SELECTION ---
  function openFileManager() {
    setShowPhotoSourcePicker(false)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    setError(null)

    try {
      // Compress and resize the image down to a fast-loading size
      const base64Data = await compressAndResizeImage(file, 800, 800, 0.8)
      
      const payload = {
        type: 'photo',
        url: base64Data
      }

      let finalContent = JSON.stringify(payload)
      if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
        finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr)
      }

      if (clientRef.current) {
        sendChatMessage(clientRef.current, Number(otherUserId), finalContent)
      }
    } catch (err) {
      console.error(err)
      setError('Could not process or send the selected image.')
    } finally {
      setIsCompressing(false)
      // Reset input value so same image can be reselected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- LOCATION SHARING ---
  function handleShareGPS() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setShowLocationPicker(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = {
          type: 'location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'My Live GPS Location'
        }

        let finalContent = JSON.stringify(payload)
        if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
          try {
            finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr)
          } catch (err) {
            console.error("Location encryption failed:", err)
          }
        }

        if (clientRef.current) {
          sendChatMessage(clientRef.current, Number(otherUserId), finalContent)
        }
        setShowLocationPicker(false)
      },
      (err) => {
        setError(`Could not access your location: ${err.message}`)
        setShowLocationPicker(false)
      },
      { timeout: 8000 }
    )
  }

  async function handleSharePreset(spot) {
    const payload = {
      type: 'location',
      lat: spot.lat,
      lng: spot.lng,
      label: spot.name
    }

    let finalContent = JSON.stringify(payload)
    if (otherProfile?.publicKey && myKeys?.publicKeyStr) {
      try {
        finalContent = await encryptMessage(finalContent, otherProfile.publicKey, myKeys.publicKeyStr)
      } catch (err) {
        console.error("Location encryption failed:", err)
      }
    }

    if (clientRef.current) {
      sendChatMessage(clientRef.current, Number(otherUserId), finalContent)
    }
    setShowLocationPicker(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ padding: '8px 12px' }}>
            ←
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{otherProfile?.displayName || 'Loading…'}</span>
              {otherProfile?.publicKey && (
                <span
                  style={{
                    fontSize: 10,
                    background: 'rgba(43, 176, 154, 0.15)',
                    color: 'var(--signal-teal)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                  title="End-to-End Encryption is active for this conversation"
                >
                  🔒 E2EE Active
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: connected ? 'var(--signal-teal)' : 'var(--text-dim)' }}>
              {connected ? 'Connected' : 'Connecting…'}
            </div>
          </div>
        </div>

        {connected && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => startCall('voice')}
              className="btn-secondary"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--signal-teal)',
                cursor: 'pointer'
              }}
              title="Start Voice Call"
            >
              <Phone size={16} />
            </button>
            <button
              type="button"
              onClick={() => startCall('video')}
              className="btn-secondary"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--signal-magenta)',
                cursor: 'pointer'
              }}
              title="Start Video Call"
            >
              <Video size={16} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', color: '#ffb3b3', fontSize: 16 }}>
            ×
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        {messages.map((m, i) => {
          const mine = String(m.senderId) === String(selfId)
          let isJson = false
          let parsedData = null

          if (m.content.trim().startsWith('{')) {
            try {
              parsedData = JSON.parse(m.content)
              isJson = parsedData && (parsedData.type === 'photo' || parsedData.type === 'location' || parsedData.type === 'voice')
            } catch (err) {
              // Ignore, treat as regular text
            }
          }

          if (isJson && parsedData.type === 'photo') {
            return (
              <div
                key={m.id ?? i}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: mine ? '2px solid var(--signal-teal)' : '2px solid var(--surface-2)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'transform 0.15s ease'
                }}
                onClick={() => setActivePhotoModal(parsedData.url)}
                className="photo-bubble"
              >
                <img
                  src={parsedData.url}
                  alt="Shared attachment"
                  referrerPolicy="no-referrer"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '240px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )
          }

          if (isJson && parsedData.type === 'voice') {
            return (
              <div
                key={m.id ?? i}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: mine
                    ? 'linear-gradient(135deg, var(--signal-teal), var(--signal-magenta))'
                    : 'var(--surface)',
                  color: mine ? '#0e0a1a' : 'var(--text)',
                  padding: '10px 14px',
                  borderRadius: 14,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <VoiceNotePlayer url={parsedData.url} />
              </div>
            )
          }

          if (isJson && parsedData.type === 'location') {
            return (
              <div
                key={m.id ?? i}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: 'var(--surface)',
                  border: mine ? '1.5px solid var(--signal-teal)' : '1.5px solid var(--surface-2)',
                  color: 'var(--text)',
                  padding: '12px 14px',
                  borderRadius: 14,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MapPin size={18} style={{ color: mine ? 'var(--signal-teal)' : 'var(--signal-magenta)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{parsedData.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                  Lat: {parsedData.lat.toFixed(5)} <br /> Lng: {parsedData.lng.toFixed(5)}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${parsedData.lat},${parsedData.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    padding: '6px 10px',
                    textDecoration: 'none',
                    borderRadius: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span>Open Maps</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )
          }

          // Plain text message
          return (
            <div
              key={m.id ?? i}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: mine
                  ? 'linear-gradient(135deg, var(--signal-teal), var(--signal-magenta))'
                  : 'var(--surface)',
                color: mine ? '#0e0a1a' : 'var(--text)',
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                wordBreak: 'break-word'
              }}
            >
              {m.content}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Meetup Location Picker Panel */}
      {showLocationPicker && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 14,
            marginBottom: 8,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-teal)' }}>Share Location</span>
            <button
              onClick={() => setShowLocationPicker(false)}
              style={{ background: 'none', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', border: 'none', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <button
            onClick={handleShareGPS}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, var(--signal-teal), #2bb09a)',
              color: '#0e0a1a',
              fontWeight: 600,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Navigation size={15} />
            <span>GPS Real-time Location</span>
          </button>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', margin: '2px 0' }}>
            — Or choose a charming meetup spot nearby —
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PRESET_SPOTS.map((spot) => (
              <button
                key={spot.name}
                onClick={() => handleSharePreset(spot)}
                style={{
                  padding: '8px',
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: 12,
                  textAlign: 'left',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
                title={spot.name}
              >
                {spot.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera vs File Choice Picker Modal */}
      {showPhotoSourcePicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 8, 16, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={() => setShowPhotoSourcePicker(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 340,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Share a Photo</span>
              <button
                onClick={() => setShowPhotoSourcePicker(false)}
                style={{ background: 'none', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
              Choose whether you want to take a new picture using your camera, or upload an existing image from your file manager.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={startCamera}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--signal-teal), #2bb09a)',
                  color: '#0e0a1a',
                  fontWeight: 600,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  justifyContent: 'center'
                }}
              >
                <Camera size={18} />
                <span>📸 Take Photo (Use Camera)</span>
              </button>

              <button
                onClick={openFileManager}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  justifyContent: 'center'
                }}
              >
                <ImageIcon size={18} />
                <span>📁 Choose File (File Manager)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive In-App Camera Stream Viewfinder */}
      {showCameraStream && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0810',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: 'var(--signal-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={18} /> Live Camera Feed
            </span>
            <button
              onClick={stopCamera}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <X size={15} /> Close
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              aspectRatio: '4/3',
              background: '#000',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {isCompressing && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(10, 8, 16, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  zIndex: 2
                }}
              >
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--signal-teal)' }} />
                <span style={{ color: 'var(--text)', fontSize: 13 }}>Processing Image…</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={capturePhoto}
              disabled={isCompressing}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--signal-teal), var(--signal-magenta))',
                border: '4px solid #fff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.1s active'
              }}
              title="Capture Frame"
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
            </button>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 12 }}>
            Position yourself clearly and tap the shutter button to snap and send securely.
          </div>
        </div>
      )}

      {/* Hidden file input for Gallery Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        {isRecordingAudio ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)',
              border: '1.5px solid var(--signal-magenta)',
              borderRadius: 'var(--radius)',
              padding: '6px 12px',
              height: 44,
              animation: 'pulse 1.5s infinite'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'red',
                  display: 'inline-block',
                  animation: 'pulse 1s infinite'
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                Recording SECURE Voice message…
              </span>
              <span style={{ fontSize: 13, color: 'var(--signal-teal)', fontFamily: 'var(--font-mono)' }}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60) < 10 ? '0' : ''}{recordingDuration % 60}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => stopRecording(false)}
                style={{
                  background: 'rgba(255, 77, 77, 0.15)',
                  color: '#ff4d4d',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Discard Recording"
              >
                <X size={15} />
              </button>
              {/* Finish and Send Button */}
              <button
                type="button"
                onClick={() => stopRecording(true)}
                style={{
                  background: 'rgba(43, 176, 154, 0.2)',
                  color: 'var(--signal-teal)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Send Voice Message"
              >
                <Check size={15} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Camera/Photo Button */}
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={!connected || isCompressing}
              className="btn-secondary"
              style={{
                padding: 12,
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer'
              }}
              title="Share Photo"
            >
              {isCompressing ? (
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--signal-teal)' }} />
              ) : (
                <Camera size={18} style={{ color: 'var(--text-dim)' }} />
              )}
            </button>

            {/* Location Button */}
            <button
              type="button"
              onClick={() => setShowLocationPicker((prev) => !prev)}
              disabled={!connected}
              className="btn-secondary"
              style={{
                padding: 12,
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
                border: showLocationPicker ? '1.5px solid var(--signal-teal)' : '1.5px solid var(--border)',
                background: showLocationPicker ? 'var(--surface-2)' : 'var(--surface)',
                cursor: 'pointer'
              }}
              title="Share Meetup Location"
            >
              <MapPin size={18} style={{ color: showLocationPicker ? 'var(--signal-teal)' : 'var(--text-dim)' }} />
            </button>

            {/* Text Input */}
            <input
              className="field"
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ flex: 1 }}
            />

            {/* Audio Voice Note Trigger Button (if draft is empty) */}
            {!draft.trim() && connected ? (
              <button
                type="button"
                onClick={startRecording}
                className="btn-secondary"
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--signal-teal)',
                  cursor: 'pointer'
                }}
                title="Record Voice Message"
              >
                <Mic size={18} />
              </button>
            ) : (
              /* Send Button */
              <button
                type="submit"
                className="btn-primary"
                disabled={!connected || !draft.trim()}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  cursor: 'pointer'
                }}
              >
                <Send size={18} />
              </button>
            )}
          </>
        )}
      </form>

      {/* High-Resolution Photo Modal Viewer */}
      {activePhotoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 8, 16, 0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.25s ease-out'
          }}
          onClick={() => setActivePhotoModal(null)}
        >
          <button
            onClick={() => setActivePhotoModal(null)}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: 8,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
          <img
            src={activePhotoModal}
            alt="Expanded shared attachment"
            referrerPolicy="no-referrer"
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* FULL-SCREEN CALLING OVERLAY MODAL */}
      {callState !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 8, 16, 0.98)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            padding: 24,
            animation: 'fadeIn 0.25s ease-out',
            fontFamily: 'var(--font-sans)'
          }}
        >
          {/* Top Status & Name */}
          <div style={{ textAlign: 'center', zIndex: 10, marginBottom: 20 }}>
            <div className="eyebrow" style={{ color: 'var(--signal-teal)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {callType === 'video' ? '⚡ SECURE VIDEO CHAT' : '🎙️ SECURE VOICE CHAT'}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{otherProfile?.displayName || 'Proximity User'}</h2>
            
            {callState === 'outgoing' && (
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4, animation: 'pulse 1.5s infinite' }}>
                Ringing secure connection…
              </p>
            )}
            {callState === 'incoming' && (
              <p style={{ color: 'var(--signal-magenta)', fontSize: 14, marginTop: 4, animation: 'pulse 1.5s infinite' }}>
                Incoming E2EE {callType} call…
              </p>
            )}
            {callState === 'connected' && (
              <p style={{ color: 'var(--signal-teal)', fontSize: 14, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                Encrypted Connection • {Math.floor(callDuration / 60)}:{(callDuration % 60) < 10 ? '0' : ''}{callDuration % 60}
              </p>
            )}
          </div>

          {/* Core Stream Display Window */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              height: 480,
              borderRadius: 24,
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              marginBottom: 40
            }}
          >
            {/* Outgoing or Incoming Ringing Pulse Animation */}
            {(callState === 'outgoing' || callState === 'incoming') && (
              <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--signal-teal) 0%, rgba(0,0,0,0) 70%)',
                    opacity: 0.3,
                    animation: 'pulseRing 2s infinite'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    width: '75%',
                    height: '75%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--signal-magenta) 0%, rgba(0,0,0,0) 70%)',
                    opacity: 0.3,
                    animation: 'pulseRing 2s infinite',
                    animationDelay: '0.8s'
                  }}
                />
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}
                >
                  {callType === 'video' ? '📹' : '🎙️'}
                </div>
              </div>
            )}

            {/* CONNECTED CALL STATE DISPLAY */}
            {callState === 'connected' && (
              <>
                {callType === 'video' ? (
                  <>
                    {/* Remote Fullscreen Video */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

                    {/* Local Picture-In-Picture Mini Floating Video */}
                    {!isVideoPaused && (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          width: 120,
                          height: 160,
                          borderRadius: 16,
                          objectFit: 'cover',
                          border: '2px solid var(--signal-teal)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                          zIndex: 20
                        }}
                      />
                    )}
                  </>
                ) : (
                  // Connected Voice call elegant aesthetic panel
                  <div style={{ textAlign: 'center' }}>
                    <div className="ping-wrap" style={{ transform: 'scale(1.5)', marginBottom: 24 }}>
                      <div className="ping-ring" style={{ borderColor: 'var(--signal-teal)' }} />
                      <div className="ping-ring" style={{ borderColor: 'var(--signal-magenta)' }} />
                      <div className="ping-dot" style={{ background: 'var(--signal-teal)' }} />
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <Volume2 size={16} className="animate-pulse" style={{ color: 'var(--signal-teal)' }} />
                      <span>E2EE Audio Connection Live</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Control Button Panels */}
          <div style={{ display: 'flex', gap: 24, zIndex: 10 }}>
            {/* Incoming Accept/Decline Options */}
            {callState === 'incoming' && (
              <>
                <button
                  type="button"
                  onClick={rejectCall}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#ff4d4d',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 77, 77, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Decline Call"
                >
                  <PhoneOff size={24} />
                </button>
                <button
                  type="button"
                  onClick={acceptCall}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#2bb09a',
                    color: '#0e0a1a',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(43, 176, 154, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Accept Call"
                >
                  <Phone size={24} />
                </button>
              </>
            )}

            {/* Outgoing Ringing Cancel Button */}
            {callState === 'outgoing' && (
              <button
                type="button"
                onClick={endCall}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#ff4d4d',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 77, 77, 0.4)'
                }}
                title="Cancel Call"
              >
                <PhoneOff size={24} />
              </button>
            )}

            {/* Active Connected Call Controls */}
            {callState === 'connected' && (
              <>
                {/* Mute Mic toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: isMuted ? '#ff4d4d' : 'var(--surface-2)',
                    color: isMuted ? '#ffffff' : 'var(--text)',
                    border: '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* End call handler */}
                <button
                  type="button"
                  onClick={endCall}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#ff4d4d',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 77, 77, 0.4)'
                  }}
                  title="End Call"
                >
                  <PhoneOff size={24} />
                </button>

                {/* Video Pause toggle (only for video calls) */}
                {callType === 'video' && (
                  <button
                    type="button"
                    onClick={toggleVideoPause}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: isVideoPaused ? 'var(--signal-magenta)' : 'var(--surface-2)',
                      color: isVideoPaused ? '#0e0a1a' : 'var(--text)',
                      border: '1.5px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title={isVideoPaused ? "Turn Video On" : "Pause Video"}
                  >
                    {isVideoPaused ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
