import { useEffect } from 'react'

export function Badge({ children, tone = 'default' }) {
  const className = tone === 'default' ? 'badge' : `badge badge--${tone}`
  return <span className={className}>{children}</span>
}

export function Stars({ value = 5, input = false, onChange }) {
  const rounded = Math.round(Number(value) || 0)

  if (input) {
    return (
      <div className="stars stars--input" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            role="radio"
            aria-checked={rounded === star}
            className={star <= rounded ? '' : 'stars--off'}
            onClick={() => onChange?.(star)}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  return (
    <span className="stars" title={`${value} из 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rounded ? '' : 'stars--off'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function Modal({ title, subtitle, onClose, children, wide = false, footer }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <div>
            <h3 style={{ marginBottom: subtitle ? 6 : 0 }}>{title}</h3>
            {subtitle && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{subtitle}</p>}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 22 }}>{footer}</div>}
      </div>
    </div>
  )
}

export function Loading({ label = 'Загружаем данные…' }) {
  return (
    <div className="loading-block">
      <div className="spinner" />
      <p style={{ marginTop: 14 }}>{label}</p>
    </div>
  )
}

export function EmptyState({ title = 'Пока пусто', text, action }) {
  return (
    <div className="empty">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {text && <p className="muted" style={{ marginBottom: action ? 18 : 0 }}>{text}</p>}
      {action}
    </div>
  )
}

export function Field({ label, error, hint, children, full = false }) {
  return (
    <div className={`field${full ? ' field--full' : ''}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

export function Alert({ type = 'info', children }) {
  return <div className={`alert alert--${type}`}>{children}</div>
}

export function StatusBadge({ status, labels }) {
  const toneByStatus = {
    new: 'accent',
    confirmed: 'accent',
    in_progress: 'info',
    done: 'success',
    canceled: 'danger',
    pending: 'info',
    published: 'success',
    rejected: 'danger',
    in_work: 'accent',
    closed: 'success',
  }

  return <Badge tone={toneByStatus[status] || 'default'}>{labels?.[status] || status}</Badge>
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null

  const pages = Array.from({ length: meta.last_page }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === meta.last_page || Math.abs(page - meta.current_page) <= 2,
  )

  return (
    <div className="pagination">
      <button type="button" disabled={meta.current_page === 1} onClick={() => onPage(meta.current_page - 1)}>
        ←
      </button>
      {pages.map((page, index) => (
        <span key={page} style={{ display: 'contents' }}>
          {index > 0 && page - pages[index - 1] > 1 && <span className="muted">…</span>}
          <button type="button" className={page === meta.current_page ? 'active' : ''} onClick={() => onPage(page)}>
            {page}
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={meta.current_page === meta.last_page}
        onClick={() => onPage(meta.current_page + 1)}
      >
        →
      </button>
    </div>
  )
}