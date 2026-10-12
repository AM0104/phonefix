import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Alert, Field } from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')

    try {
      const user = await login(form)
      toast.success(`Добро пожаловать, ${user.name}!`)

      const target = location.state?.from || (user.role === 'admin' ? '/admin' : '/account')
      navigate(target, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="card stack">
          <div>
            <h1 style={{ fontSize: 28 }}>Вход в личный кабинет</h1>
            <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
              Отслеживайте статус ремонта, отменяйте визиты и оставляйте отзывы.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form className="stack" onSubmit={submit}>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="client@phonefix.ru"
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Пароль">
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••"
                required
                autoComplete="current-password"
              />
            </Field>

            <button type="submit" className="btn btn--primary btn--block" disabled={sending}>
              {sending ? 'Входим…' : 'Войти'}
            </button>
          </form>

          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            Нет аккаунта? <Link className="accent-text" to="/register">Зарегистрироваться</Link>
          </p>

          <div className="alert alert--info" style={{ fontSize: 13.5 }}>
            <strong>Демо-доступы (из сидеров):</strong>
            <br />
            Клиент: client@phonefix.ru / password
            <br />
            Администратор: admin@phonefix.ru / admin123
          </div>
        </div>
      </div>
    </section>
  )
}