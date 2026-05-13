import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? '#ef5350' : 'none'} stroke={filled ? '#ef5350' : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export default function WatchPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [chatTab, setChatTab] = useState('chat')
  const [msgText, setMsgText] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/videos')
      .then(r => r.json())
      .then(data => {
        setVideos(data)
        if (data.length > 0) setCurrentVideo(data[0])
      })
  }, [])

  useEffect(() => {
    if (currentVideo) {
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      fetch(`/api/videos/${currentVideo.id}/comments`, { headers })
        .then(r => r.json())
        .then(setComments)
    }
  }, [currentVideo])

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments])

  const sendComment = async () => {
    if (!msgText.trim() || !currentVideo) return
    const token = localStorage.getItem('token')
    const r = await fetch(`/api/videos/${currentVideo.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: msgText })
    })
    if (r.ok) {
      const c = await r.json()
      setComments(prev => [...prev, c])
      setMsgText('')
    }
  }

  const likeComment = async (commentId) => {
    if (!user) { navigate('/auth'); return }
    const token = localStorage.getItem('token')
    const r = await fetch(`/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (r.ok) {
      const data = await r.json()
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, likes: data.likes, liked_by_me: data.liked } : c
      ))
    }
  }

  return (
    <>
      <div className="bg-pattern" />
      <div className="page">
      <header className="header">
        <a href="/" className="logo"><Logo /></a>
        <div className="header-right">
          {user ? (
            <>
              <div className="header-user">
                <UserIcon />
                <span>{user.first_name} {user.last_name}</span>
              </div>
              {user.is_admin && (
                <button className="btn-register" onClick={() => navigate('/admin')}
                  style={{ marginRight: 8 }}>
                  Админка
                </button>
              )}
              <button className="icon-btn" onClick={logout} title="Выйти">
                <LogoutIcon />
              </button>
            </>
          ) : (
            <>
              <button className="btn-register" onClick={() => navigate('/auth')}>
                Регистрация
              </button>
              <button className="icon-btn" onClick={() => navigate('/auth')}>
                <UserIcon />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="video-page-content">
        {/* Video selector */}
        {/* {videos.length > 0 && (
          <div className="video-selector">
            <select
              value={currentVideo?.id || ''}
              onChange={e => setCurrentVideo(videos.find(v => v.id === Number(e.target.value)))}
            >
              {videos.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>
        )} */}

        {currentVideo && (
          <div>
            <div className="video-title-display">{currentVideo.title}</div>
            {currentVideo.description && (
              <div className="video-description">{currentVideo.description}</div>
            )}
          </div>
        )}

        <div className="video-area">
          {/* Player */}
          <div className="video-player-wrap">
            {currentVideo ? (
              <video
                key={currentVideo.id}
                controls
                style={{ width: '100%', height: '100%', background: '#000' }}
              >
                <source src={`/api/videos/${currentVideo.id}/stream`} type="video/mp4" />
              </video>
            ) : (
              <div className="video-placeholder">
                <div className="play-icon-large">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <span>Нет доступных видео</span>
              </div>
            )}
          </div>

          {/* Chat panel */}
          <div className="chat-panel">
            <div className="chat-tabs">
              <button
                className={`chat-tab ${chatTab === 'chat' ? 'active' : ''}`}
                onClick={() => setChatTab('chat')}
              >Чат</button>
            </div>

            <div className="chat-messages">
              {comments.length === 0 ? (
                <div className="empty-state" style={{ color: 'rgba(255,255,255,0.2)', padding: '32px 16px' }}>
                  Сообщений пока нет
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="chat-message">
                    <div className="chat-message-header">
                      <span className="chat-username">{c.user_name}</span>
                      <button
                        className={`chat-like-btn ${c.liked_by_me ? 'liked' : ''}`}
                        onClick={() => likeComment(c.id)}
                      >
                        <HeartIcon filled={!!c.liked_by_me} />
                        {c.likes}
                      </button>
                    </div>
                    <div className="chat-text">{c.text}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {user ? (
              <div className="chat-send-area">
                <div className="chat-input-row">
                  <textarea
                    className="chat-input"
                    placeholder="Текст"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                    rows={1}
                  />
                  <button className="chat-send-btn" onClick={sendComment}>Отправить</button>
                </div>
                <div className="chat-name-row">
                  Имя в чате: <strong>{user.chat_name || user.first_name}</strong>
                </div>
              </div>
            ) : (
              <div className="chat-cta" onClick={() => navigate('/auth')}>
                Хотите отправить сообщение?<br />
                Войдите в аккаунт.
              </div>
            )}
          </div>
        </div>

        {/* Video selector  */}
        <div className="video-carousel">
          {videos.map(v => (
            <div key={v.id} className="carousel-item" onClick={() => setCurrentVideo(v)}>
              <div className="carousel-preview">
                <video src={`/api/videos/${v.id}/stream#t=10`} preload="metadata" />
                <div className="play-overlay">▶</div>
              </div>
              <div className="carousel-info">
                <div className="carousel-title">{v.title}</div>
                <div className="carousel-date">
                  {new Date(v.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
    </>
  )
}
