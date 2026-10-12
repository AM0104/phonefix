import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicApi, clientApi } from '../api/client.js'
import { PROBLEM_TYPES, formatPrice } from '../api/constants.js'
import { Alert, Field, Loading, Stars } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './Toast.jsx'

const STEPS = ['Услуга', 'Мастер', 'Дата и время', 'Контакты и устройство']

export default function BookingWizard({ initialServiceId = null }) {
  const { isAuthenticated, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [services, setServices] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [slotsData, setSlotsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(null)

  const [selection, setSelection] = useState({
    service: null,
    technician: null,
    date: null,
    slot: null,
  })

  const [form, setForm] = useState({
    device_model: '',
    problem_type: 'screen',
    problem_description: '',
  })

  useEffect(() => {
    let active = true

    Promise.all([publicApi.services(), publicApi.technicians()])
      .then(([servicesResponse, techniciansResponse]) => {
        if (!active) return

        const serviceList = servicesResponse.data || []
        setServices(serviceList)
        setTechnicians(techniciansResponse.data || [])

        if (initialServiceId) {
          const preset = serviceList.find((item) => String(item.id) === String(initialServiceId))
          if (preset) {
            setSelection((current) => ({ ...current, service: preset }))
            setForm((current) => ({ ...current, problem_type: preset.category }))
            setStep(1)
          }
        }
      })
      .catch(() => setError('Не удалось загрузить список услуг.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [initialServiceId])

  const loadSlots = useCallback(async (technicianId, date = null) => {
    setSlotsLoading(true)

    try {
      const data = await publicApi.slots(technicianId, date ? { date } : undefined)
      setSlotsData(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  const chooseService = (service) => {
    setSelection((current) => ({ ...current, service }))
    setForm((current) => ({ ...current, problem_type: service.category }))
    setStep(1)
  }

  const chooseTechnician = async (technician) => {
    setSelection((current) => ({ ...current, technician, date: null, slot: null }))
    await loadSlots(technician.id)
    setStep(2)
  }

  const chooseDate = async (date) => {
    setSelection((current) => ({ ...current, date, slot: null }))
    await loadSlots(selection.technician.id, date)
  }

  const summary = useMemo(() => {
    const parts = []

    if (selection.service) parts.push(selection.service.title)
    if (selection.technician) parts.push(selection.technician.full_name)
    if (selection.date && selection.slot) parts.push(`${selection.date}, ${selection.slot.time}`)

    return parts
  }, [selection])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setErrors({})

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/booking' } })
      return
    }

    try {
      const data = await clientApi.createAppointment({
        service_id: selection.service.id,
        technician_id: selection.technician.id,
        starts_at: selection.slot.starts_at,
        device_model: form.device_model,
        problem_type: form.problem_type,
        problem_description: form.problem_description,
      })

      toast.success(data.message)
      setSuccess(data.data)
    } catch (requestError) {
      setErrors(requestError.errors || {})
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading label="Готовим форму записи…" />
  }

  if (success) {
    return (
      <div className="card card--accent stack" style={{ maxWidth: 620 }}>
        <h2 style={{ marginBottom: 4 }}>Заявка №{success.id} создана</h2>
        <p className="muted">
          {success.service?.title} · {success.technician?.full_name} · {success.scheduled_at?.replace('T', ' ').slice(0, 16)}
        </p>
        <Alert type="success">
          Мы позвоним по номеру {user?.phone || 'из вашего профиля'}, чтобы подтвердить запись. Отменить визит можно в личном
          кабинете.
        </Alert>
        <div className="row">
          <Link className="btn btn--primary" to="/account/appointments">
            Мои заявки
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
            Записать ещё
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="row" style={{ gap: 10 }}>
        {STEPS.map((label, index) => (
          <span key={label} className={`chip${index === step ? ' chip--active' : ''}`} onClick={() => index < step && setStep(index)}>
            {index + 1}. {label}
          </span>
        ))}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {step === 0 && (
        <div className="grid grid--3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              className="card card--hover"
              style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              onClick={() => chooseService(service)}
            >
              <span className="badge badge--accent">{service.category_label}</span>
              <h3 className="card__title" style={{ marginTop: 10 }}>
                {service.title}
              </h3>
              <p className="muted" style={{ fontSize: 14 }}>
                {service.short_description}
              </p>
              <div className="row row--between" style={{ marginTop: 10 }}>
                <span className="card__price">{service.price_label || formatPrice(service.price_from)}</span>
                <span className="card__meta">{service.duration_minutes} мин</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <Alert type="info">Выбрана услуга: {selection.service?.title}</Alert>
          <div className="grid grid--3">
            {technicians.map((technician) => (
              <button
                key={technician.id}
                type="button"
                className="card card--hover"
                style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                onClick={() => chooseTechnician(technician)}
              >
                <div className="row row--between">
                  <strong>{technician.full_name}</strong>
                  <Stars value={technician.rating} />
                </div>
                <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
                  {technician.specialization}
                </p>
                <span className="card__meta">Опыт: {technician.experience_years} лет</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setStep(0)}>
            ← Назад к услугам
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <Alert type="info">
            Мастер: {selection.technician?.full_name}. Выберите свободную дату и время — данные берутся из расписания сервиса.
          </Alert>

          {slotsLoading && <Loading label="Смотрим свободное время…" />}

          {!slotsLoading && slotsData && (
            <>
              <div className="row" style={{ gap: 10 }}>
                {slotsData.dates.length === 0 && <span className="muted">На ближайшие две недели свободных окон нет.</span>}
                {slotsData.dates.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={`chip${selection.date === day.date ? ' chip--active' : ''}`}
                    onClick={() => chooseDate(day.date)}
                  >
                    {day.label} · {day.slots_count}
                  </button>
                ))}
              </div>

              <div className="row" style={{ gap: 10 }}>
                {(slotsData.slots || []).map((slot) => (
                  <button
                    key={slot.starts_at}
                    type="button"
                    className={`chip${selection.slot?.starts_at === slot.starts_at ? ' chip--active' : ''}`}
                    onClick={() => setSelection((current) => ({ ...current, slot }))}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              <div className="row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep(1)}>
                  ← Другой мастер
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!selection.slot}
                  onClick={() => setStep(3)}
                >
                  Продолжить
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <form className="card stack" onSubmit={submit}>
          <SummaryBlock summary={summary} />

          {!isAuthenticated && (
            <Alert type="info">
              Чтобы закрепить запись за вами, нужно войти или зарегистрироваться. <Link className="accent-text" to="/login">Войти</Link>
            </Alert>
          )}

          <div className="form-grid">
            <Field label="Модель телефона *" error={errors.device_model?.[0]}>
              <input
                value={form.device_model}
                onChange={(event) => setForm((current) => ({ ...current, device_model: event.target.value }))}
                placeholder="Например, iPhone 13 Pro"
                required
              />
            </Field>

            <Field label="Тип неисправности *" error={errors.problem_type?.[0]}>
              <select
                value={form.problem_type}
                onChange={(event) => setForm((current) => ({ ...current, problem_type: event.target.value }))}
              >
                {Object.entries(PROBLEM_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Опишите проблему" error={errors.problem_description?.[0]} full>
              <textarea
                value={form.problem_description}
                onChange={(event) => setForm((current) => ({ ...current, problem_description: event.target.value }))}
                placeholder="Когда появилась проблема, что уже пробовали сделать"
              />
            </Field>
          </div>

          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => setStep(2)}>
              ← Назад
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Отправляем…' : isAuthenticated ? 'Записаться на ремонт' : 'Войти и записаться'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function SummaryBlock({ summary }) {
  return (
    <div className="card card--flat">
      <span className="card__meta">Ваша запись</span>
      <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{summary.join(' · ') || 'Заполните шаги выше'}</p>
    </div>
  )
}