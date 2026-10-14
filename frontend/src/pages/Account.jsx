import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi, clientApi } from '../api/client.js'
import { APPOINTMENT_STATUSES, formatDateTime } from '../api/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Alert, EmptyState, Field, Loading, Modal, Stars, StatusBadge } from '../components/ui.jsx'
import { emailError, phoneError } from '../api/format.js'

const REVIEW_STATUSES = {
  pending: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён',
}

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

  // Вкладка «Мои отзывы»
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Переписка по заявке
  const [chatFor, setChatFor] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatText, setChatText] = useState('')
  const [chatSending, setChatSending] = useState(false)

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

  const loadReviews = useCallback(() => {
    setReviewsLoading(true)

    clientApi
      .myReviews()
      .then((data) => setReviews(data.data || []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [])

  const openChat = async (appointment) => {
    setChatFor(appointment)
    setChatMessages([])
    setChatText('')
    setChatLoading(true)

    try {
      const data = await clientApi.messages(appointment.id)
      setChatMessages(data.data || [])
    } catch (error) {
      toast.error(error.message)
    } finally {
      setChatLoading(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()

    if (!chatFor || !chatText.trim()) {
      return
    }

    setChatSending(true)

    try {
      await clientApi.sendMessage(chatFor.id, chatText.trim())
      const data = await clientApi.messages(chatFor.id)
      setChatMessages(data.data || [])
      setChatText('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setChatSending(false)
    }
  }

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

      const emailIssue = emailError(payload.email)
      const phoneIssue = phoneError(payload.phone)

      if (emailIssue || phoneIssue) {
        setErrors({
          ...(emailIssue ? { email: [emailIssue] } : {}),
          ...(phoneIssue ? { phone: [phoneIssue] } : {}),
        })
        toast.error('Проверьте, пожалуйста, e-mail и телефон.')
        return
      }

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
          <button
            type="button"
            className={`chip${tab === 'reviews' ? ' chip--active' : ''}`}
            onClick={() => {
              setTab('reviews')
              loadReviews()
            }}
          >
            Мои отзывы
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
                      onChat={() => openChat(appointment)}
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
                      onChat={() => openChat(appointment)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'reviews' && (
          <>
            {reviewsLoading && <Loading label="Загружаем ваши отзывы…" />}

            {!reviewsLoading && reviews.length === 0 && (
              <EmptyState
                title="Отзывов пока нет"
                text="Отзыв можно оставить по выполненной заявке — на вкладке «Заявки»."
              />
            )}

            {!reviewsLoading && reviews.length > 0 && (
              <div className="stack">
                {reviews.map((review) => (
                  <article key={review.id} className="card stack" style={{ gap: 8 }}>
                    <div className="row row--between">
                      <strong>{review.service?.title || 'Услуга'}</strong>
                      <StatusBadge status={review.status} labels={REVIEW_STATUSES} />
                    </div>
                    <Stars value={review.rating} />
                    <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                      {review.text}
                    </p>
                    <span className="card__meta">{formatDateTime(review.created_at)}</span>
                  </article>
                ))}
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

              <Field label="Телефон *" error={errors.phone?.[0]} hint="Формат: +7 (912) 345-67-89">
                <input
                  value={profile.phone}
                  onChange={(event) => setProfile((c) => ({ ...c, phone: event.target.value }))}
                  placeholder="+7 (912) 345-67-89"
                  inputMode="tel"
                  required
                />
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

      {chatFor && (
        <Modal
          title={`Переписка по заявке №${chatFor.id}`}
          subtitle={`${chatFor.service?.title || ''} · ${formatDateTime(chatFor.scheduled_at)}`}
          onClose={() => setChatFor(null)}
        >
          <div className="stack" style={{ gap: 14 }}>
            {chatLoading && <Loading label="Загружаем переписку…" />}

            {!chatLoading && chatMessages.length === 0 && (
              <p className="muted" style={{ margin: 0 }}>
                Переписки пока нет. Напишите мастеру — ответ придёт сюда.
              </p>
            )}

            {!chatLoading && chatMessages.length > 0 && (
              <div className="stack" style={{ gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: message.is_from_admin ? 'flex-start' : 'flex-end',
                      background: message.is_from_admin ? 'var(--pf-surface-2)' : 'var(--pf-accent-soft)',
                      border: '1px solid var(--pf-line-soft)',
                      borderRadius: 14,
                      padding: '10px 14px',
                      maxWidth: '85%',
                    }}
                  >
                    <div className="card__meta" style={{ marginBottom: 4 }}>
                      {message.is_from_admin ? 'Мастер' : 'Вы'} · {formatDateTime(message.created_at)}
                    </div>
                    <div style={{ fontSize: 14.5 }}>{message.body}</div>
                  </div>
                ))}
              </div>
            )}

            <form className="stack" onSubmit={sendMessage} style={{ gap: 10 }}>
              <Field label="Ваше сообщение">
                <textarea
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  placeholder="Например: уточните, пожалуйста, стоимость замены экрана"
                  required
                  minLength={2}
                  style={{ minHeight: 90 }}
                />
              </Field>
              <button type="submit" className="btn btn--primary" disabled={chatSending || !chatText.trim()}>
                {chatSending ? 'Отправляем…' : 'Отправить'}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </section>
  )
}

function AppointmentRow({ appointment, onCancel, onReview, onChat }) {
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
        {onChat && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onChat}>
            Переписка
          </button>
        )}
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