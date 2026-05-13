import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function AuthPage() {
  const [tab, setTab] = useState('register') // register | access
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password || !firstName || !lastName) {
      setError('Заполните все обязательные поля')
      return
    }
    setLoading(true)
    try {
      await register(email, password, firstName, lastName)
      navigate('/watch')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/watch')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-pattern" />
      <div className="page">
      <header className="header">
        <a href="/" className="logo"><Logo /></a>
      </header>

      <main className="auth-page">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}
          >
            Регистрация
          </button>
          <button
            className={`auth-tab ${tab === 'access' ? 'active' : ''}`}
            onClick={() => { setTab('access'); setError('') }}
          >
            Войти
          </button>
        </div>

        {tab === 'register' ? (
          <div className="auth-card">
            <form onSubmit={handleRegister}>
              <div className="auth-section-title">Данные для авторизации</div>

              {error && <div className="global-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Электронная почта *</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="my_email@mail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Пароль *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Ваш пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ marginTop: 20, marginBottom: 16 }} className="auth-section-title">
                Прочие данные
              </div>

              <div className="form-group">
                <label className="form-label">Фамилия *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ваша фамилия"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Имя *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ваше имя"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить'}
              </button>
              <p className="form-note">* поле, обязательное для заполнения</p>
            </form>
          </div>
        ) : (
          <div className="auth-card">
            <form onSubmit={handleLogin}>
              <div className="auth-section-title">Вход в аккаунт</div>
              {error && <div className="global-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Электронная почта</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="mail@mail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Пароль</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Ваш пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
    </>
  )
}
