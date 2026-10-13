import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi, clientApi } from '../api/client.js'
import { APPOINTMENT_STATUSES, formatDateTime } from '../api/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Alert, EmptyState, Field, Loading, Modal, Stars, StatusBadge } from '../components/ui.jsx'

export default function Account() {
  const { user, refresh } = useAuth()
  const toast = useToast()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('appointments')
  const [reviewFor, setReviewFor] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: '',
    current_password: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)

    clientApi
      .appointments()
      .then((data) => setAppointments(data.data || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        password_confirmation: '',
        current_password: '',
      })
    }
  }, [user])

  const cancel = async (appointment) => {
    if (!window.confirm(`Отменить заявку №${appointment.id}?`)) return

    try {
      const data = await clientApi.cancelAppointment(appointment.id)
      toast.success(data.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      const data = await clientApi.createReview(reviewFor.id, reviewForm)
      toast.success(data.message)
      setReviewFor(null)
      setReviewForm({ rating: 5, text: '' })
      load()
    } catch (error) {
      setErrors(error.errors || {})
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      const payload = { ...profile }

      if (!payload.password) {
        delete payload.password
        delete payload.password_confirmation
      }

      // Текущий пароль спрашиваем только когда меняется пароль или e-mail.
      const changingEmail = payload.email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase()
      const needsCurrentPassword = Boolean(payload.password) || changingEmail

      if (!needsCurrentPassword) {
        delete payload.current_password
      } else if (!payload.current_password) {
        setErrors({ current_password: ['Укажите текущий пароль.'] })
        toast.error('Укажите текущий пароль, чтобы изменить пароль или e-mail.')
        return
      }

      const data = await authApi.updateProfile(payload)
      toast.success(data.message)
      setProfile((current) => ({ ...current, password: '', password_confirmation: '', current_password: '' }))
      await refresh()
    } catch (error) {
      setErrors(error.errors || {})
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const active = appointments.filter((item) => ['new', 'confirmed', 'in_progress'].includes(item.status))
  const history = appointments.filter((item) => ['done', 'canceled'].includes(item.status))

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Личный кабинет</h1>
            <p>
              {user?.name} · {user?.email}
            </p>
          </div>
          <Link className="btn btn--primary" to="/booking">
            Новая запись
          </Link>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 26 }}>
          <button type="button" className={`chip${tab === 'appointments' ? ' chip--active' : ''}`} onClick={() => setTab('appointments')}>
            Заявки ({appointments.length})
          </button>
          <button type="button" className={`chip${tab === 'profile' ? ' chip--active' : ''}`} onClick={() => setTab('profile')}>
            Профиль
          </button>
        </div>

        {tab === 'appointments' && (
          <>
            {loading && <Loading label="Загружаем историю заявок…" />}

            {!loading && appointments.length === 0 && (
              <EmptyState
                title="Заявок пока нет"
                text="Запишитесь на бесплатную диагностику — это займёт пару минут."
                action={
                  <Link className="btn btn--primary" to="/booking">
                    Записаться
                  </Link>
                }
              />
            )}

            {!loading && active.length > 0 && (
              <div style={{ marginBottom: 34 }}>
                <h2 style={{ fontSize: 22 }}>Активные записи</h2>
                <div className="stack">
                  {active.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onCancel={() => cancel(appointment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && history.length > 0 && (
              <div>
                <h2 style={{ fontSize: 22 }}>История</h2>
                <div className="stack">
                  {history.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onReview={() => {
                        setReviewFor(appointment)
                        setReviewForm({ rating: 5, text: '' })
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'profile' && (
          <form className="card stack" style={{ maxWidth: 640 }} onSubmit={saveProfile}>
            <h2 style={{ fontSize: 22 }}>Данные профиля</h2>

            <div className="form-grid">
              <Field label="Имя" error={errors.name?.[0]}>
                <input value={profile.name} onChange={(event) => setProfile((c) => ({ ...c, name: event.target.value }))} />
              </Field>

              <Field label="Телефон" error={errors.phone?.[0]}>
                <input value={profile.phone} onChange={(event) => setProfile((c) => ({ ...c, phone: event.target.value }))} />
              </Field>

              <Field label="E-mail" error={errors.email?.[0]}>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile((c) => ({ ...c, email: event.target.value }))}
                />
              </Field>
            </div>

            <div className="form-grid">
              <Field label="Новый пароль" error={errors.password?.[0]} hint="Оставьте пустым, чтобы не менять">
                <input
                  type="password"
                  value={profile.password}
                  onChange={(event) => setProfile((c) => ({ ...c, password: event.target.value }))}
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Повторите пароль">
                <input
                  type="password"
                  value={profile.password_confirmation}
                  onChange={(event) => setProfile((c) => ({ ...c, password_confirmation: event.target.value }))}
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <Field
              label="Текущий пароль"
              error={errors.current_password?.[0]}
              hint="Нужен при смене пароля или e-mail — так украденный токен не даст захватить аккаунт"
            >
              <input
                type="password"
                value={profile.current_password}
                onChange={(event) => setProfile((c) => ({ ...c, current_password: event.target.value }))}
                autoComplete="current-password"
              />
            </Field>

            <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
          </form>
        )}
      </div>

      {reviewFor && (
        <Modal
          title="Отзыв о ремонте"
          subtitle={`${reviewFor.service?.title} · ${formatDateTime(reviewFor.scheduled_at)}`}
          onClose={() => setReviewFor(null)}
        >
          <form className="stack" onSubmit={submitReview}>
            {errors.rating && <Alert type="error">{errors.rating[0]}</Alert>}

            <div className="field">
              <label>Оценка</label>
              <Stars
                input
                value={reviewForm.rating}
                onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
              />
            </div>

            <Field label="Текст отзыва" error={errors.text?.[0]}>
              <textarea
                value={reviewForm.text}
                onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
                placeholder="Что понравилось, как быстро сделали ремонт"
                required
                minLength={10}
              />
            </Field>

            <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
              {saving ? 'Отправляем…' : 'Отправить отзыв'}
            </button>

            <p className="field__hint" style={{ margin: 0 }}>
              Отзыв появится на сайте после модерации администратором.
            </p>
          </form>
        </Modal>
      )}
    </section>
  )
}

function AppointmentRow({ appointment, onCancel, onReview }) {
  return (
    <article className="card row row--between" style={{ alignItems: 'flex-start', gap: 18 }}>
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 10 }}>
          <strong>Заявка №{appointment.id}</strong>
          <StatusBadge status={appointment.status} labels={APPOINTMENT_STATUSES} />
        </div>
        <span className="muted" style={{ fontSize: 14.5 }}>
          {appointment.service?.title} · {appointment.technician?.full_name}
        </span>
        <span className="card__meta">
          {appointment.device_model} · {formatDateTime(appointment.scheduled_at)}
        </span>
        {appointment.problem_label && <span className="card__meta">{appointment.problem_label}</span>}
        {appointment.final_price && (
          <span className="accent-text" style={{ fontWeight: 700 }}>
            Итог: {Number(appointment.final_price).toLocaleString('ru-RU')} ₽
          </span>
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        {onCancel && (
          <button type="button" className="btn btn--danger btn--sm" onClick={onCancel}>
            Отменить
          </button>
        )}
        {onReview && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onReview}>
            Оставить отзыв
          </button>
        )}
      </div>
    </article>
  )
}