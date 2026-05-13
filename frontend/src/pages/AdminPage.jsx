import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function AdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    if (!user.is_admin) { navigate('/watch'); return }
    loadVideos()
  }, [user])

  const loadVideos = () => {
    fetch('/api/videos').then(r => r.json()).then(setVideos)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title.trim()) { setError('Укажите название и выберите файл'); return }
    setError(''); setSuccess('')
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title)
    fd.append('description', description)

    try {
      const r = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Ошибка загрузки')
      setSuccess(`Видео "${data.title}" успешно загружено!`)
      setTitle(''); setDescription(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      loadVideos()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (videoId, videoTitle) => {
    if (!window.confirm(`Удалить видео "${videoTitle}"?`)) return
    const r = await fetch(`/api/admin/videos/${videoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (r.ok) {
      setVideos(prev => prev.filter(v => v.id !== videoId))
      setSuccess(`Видео удалено.`)
    }
  }

  return (
    <>
      <div className="bg-pattern" />
      <div className="page">
      <header className="header">
        <a href="/" className="logo"><Logo /></a>
        <div className="header-right">
          <div className="header-user">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{user?.first_name} {user?.last_name}</span>
          </div>
          <button className="btn-register" onClick={() => navigate('/watch')} style={{ marginRight: 8 }}>
            Плеер
          </button>
          <button className="icon-btn" onClick={logout}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="admin-content">
        <h1 className="admin-title">Панель администратора</h1>

        {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

        <div className="admin-grid">
          {/* Upload form */}
          <div className="admin-card">
            <div className="admin-card-title">Загрузить видео</div>
            <form className="upload-form" onSubmit={handleUpload}>
              {error && <div className="global-error">{error}</div>}

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
                  Название *
                </label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Название видео"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
                  Описание
                </label>
                <textarea
                  className="admin-input"
                  placeholder="Описание видео (необязательно)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="file-input-wrap">
                <label className="file-input-label" htmlFor="video-file">
                  {file ? `✓ ${file.name}` : '+ Выбрать видеофайл (MP4, WebM...)'}
                </label>
                <input
                  id="video-file"
                  ref={fileRef}
                  className="file-input"
                  type="file"
                  accept="video/*"
                  onChange={e => setFile(e.target.files[0])}
                />
              </div>

              <button className="btn-primary" type="submit" disabled={uploading}>
                {uploading ? 'Загрузка...' : 'Загрузить видео'}
              </button>
            </form>
          </div>

          {/* Video list */}
          <div className="admin-card">
            <div className="admin-card-title">
              Видео на платформе ({videos.length})
            </div>
            <div className="video-list">
              {videos.length === 0 ? (
                <div className="empty-state">Видео не загружены</div>
              ) : (
                videos.map(v => (
                  <div key={v.id} className="video-item">
                    <div className="video-item-info">
                      <div className="video-item-title">{v.title}</div>
                      <div className="video-item-date">
                        {v.created_at ? new Date(v.created_at).toLocaleDateString('ru-RU') : ''}
                      </div>
                    </div>
                    <button className="btn-delete" onClick={() => handleDelete(v.id, v.title)}>
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
