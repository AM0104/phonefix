import { Link } from 'react-router-dom'
import { formatPrice } from '../api/constants.js'
import { Badge } from './ui.jsx'

export default function ServiceCard({ service, onBook }) {
  return (
    <article className="card card--hover stack" style={{ justifyContent: 'space-between' }}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row row--between">
          <Badge tone="accent">{service.category_label || ''}</Badge>
          {service.is_popular && <Badge>Хит</Badge>}
        </div>

        <h3 className="card__title" style={{ margin: 0 }}>
          {service.title}
        </h3>

        <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
          {service.short_description}
        </p>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="row row--between" style={{ alignItems: 'baseline' }}>
          <span className="card__price">{service.price_label || formatPrice(service.price_from)}</span>
          <span className="card__meta">{service.duration_minutes} мин</span>
        </div>

        {service.warranty && <span className="card__meta">Гарантия: {service.warranty}</span>}

        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onBook?.(service)}>
            Записаться
          </button>
          <Link className="btn btn--ghost btn--sm" to={`/services/${service.slug}`}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  )
}