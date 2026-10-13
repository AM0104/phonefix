import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Alert, Field } from '../components/ui.jsx'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })

  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    setErrors({})

    try {
      await register(form)
      toast.success('Регистрация выполнена. Добро пожаловать в PhoneFix!')
      navigate('/account', { replace: true })
    } catch (requestError) {
      setErrors(requestError.errors || {})
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <div>
            <h1 style={{ fontSize: 28 }}>Регистрация клиента</h1>
            <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
              Создайте аккаунт, чтобы записываться онлайн и следить за историей ремонтов.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form className="stack" onSubmit={submit}>
            <Field label="Имя и фамилия *" error={errors.name?.[0]}>
              <input value={form.name} onChange={update('name')} placeholder="Иван Петров" required minLength={2} />
            </Field>

            <Field label="E-mail *" error={errors.email?.[0]}>
              <input type="email" value={form.email} onChange={update('email')} placeholder="mail@example.com" required />
            </Field>

            <Field label="Телефон" error={errors.phone?.[0]} hint="Нужен, чтобы подтвердить запись">
              <input value={form.phone} onChange={update('phone')} placeholder="+7 (___) ___-__-__" inputMode="tel" />
            </Field>

            <div className="form-grid">
              <Field label="Пароль *" error={errors.password?.[0]} hint="Минимум 8 символов">
                <input type="password" value={form.password} onChange={update('password')} required minLength={8} />
              </Field>

              <Field label="Повторите пароль *">
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={update('password_confirmation')}
                  required
                  minLength={8}
                />
              </Field>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required />
              <span>
                Я согласен с{' '}
                <Link className="accent-text" to="/privacy" target="_blank" rel="noreferrer">
                  политикой конфиденциальности
                </Link>{' '}
                и на обработку персональных данных
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--block" disabled={sending || !agreed}>
              {sending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            Уже есть аккаунт? <Link className="accent-text" to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </section>
  )
}