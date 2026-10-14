import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api/client.js'
import { formatDateTime } from '../api/constants.js'

// Счётчики, которые показывает колокольчик в админке.
const COUNTERS = [
  { key: 'new_appointments', label: 'Новые заявки', to: '/admin/appointments' },
  { key: 'unread_messages', label: 'Сообщения от клиентов', to: '/admin/appointments' },
  { key: 'pending_reviews', label: 'Отзывы на модерации', to: '/admin/reviews' },
  { key: 'new_leads', label: 'Заявки на звонок', to: '/admin/leads' },
]

const TYPE_LABELS = {
  appointment: 'Заявка',
  message: 'Сообщение',
  review: 'Отзыв',
  lead: 'Звонок',
}

export default function AdminNotifications() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [coords, setCoords] = useState(null)
  const ref = useRef(null)

  const load = useCallback(() => {
    // Ошибки глушим: колокольчик не должен ломать админку, если API недоступен.
    adminApi
      .notifications()
      .then((response) => setData(response?.data || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()

    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Панель в стиле .dropdown, но с position: fixed — иначе её обрезает
  // прокручиваемый сайдбар админки (overflow у .admin-side).
  const toggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()

      setCoords({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
        bottom: Math.max(12, window.innerHeight - rect.top + 8),
      })

      load()
    }

    setOpen((value) => !value)
  }

  // Если бэкенд не прислал total — считаем сумму счётчиков сами.
  const total = Number(data?.total) || COUNTERS.reduce((sum, item) => sum + (Number(data?.[item.key]) || 0), 0)
  const recent = (data?.recent || []).slice(0, 5)

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={toggle} title="Уведомления" aria-label="Уведомления">
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
        {total > 0 && <span className="badge badge--accent">{total}</span>}
      </button>

      {open && coords && (
        <div
          className="dropdown"
          style={{
            position: 'fixed',
            left: coords.left,
            bottom: coords.bottom,
            top: 'auto',
            right: 'auto',
            minWidth: 282,
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {COUNTERS.map((item) => {
            const value = Number(data?.[item.key]) || 0

            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setOpen(false)}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <span>{item.label}</span>
                <strong style={{ color: value > 0 ? 'var(--pf-accent)' : 'var(--pf-text-dim)' }}>{value}</strong>
              </Link>
            )
          })}

          <div className="dropdown__divider" />

          {recent.length === 0 && (
            <span className="card__meta" style={{ display: 'block', padding: '8px 13px' }}>
              Новых событий нет
            </span>
          )}

          {recent.map((item, index) => (
            <div key={`${item.type || 'event'}-${index}`} style={{ padding: '8px 13px' }}>
              <div style={{ fontSize: 13.5 }}>
                {TYPE_LABELS[item.type] ? `${TYPE_LABELS[item.type]}: ` : ''}
                {item.title}
              </div>
              <span className="card__meta">{formatDateTime(item.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}