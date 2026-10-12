import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { formatPrice } from '../api/constants.js'
import { EmptyState, Loading, Stars } from '../components/ui.jsx'

export default function ServiceDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)

    publicApi
      .service(slug)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="container section">
        <Loading />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="container section">
        <EmptyState
          title="Услуга не найдена"
          text="Возможно, она была снята с публикации."
          action={
            <Link className="btn btn--primary" to="/services">
              Все услуги
            </Link>
          }
        />
      </div>
    )
  }

  const { data: service, technicians, reviews, related } = data

  return (
    <section className="section">
      <div className="container">
        <div className="row" style={{ gap: 8, marginBottom: 18 }}>
          <Link className="card__meta" to="/services">
            Услуги
          </Link>
          <span className="card__meta">/</span>
          <span className="accent-text">{service.category_label}</span>
        </div>

        <div className="grid grid--2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <h1 style={{ fontSize: 34 }}>{service.title}</h1>
            <p className="muted" style={{ fontSize: 17 }}>
              {service.short_description}
            </p>

            {(service.description || '').split('\n').map((line, index) =>
              line.trim() ? (
                <p key={index} className="muted">
                  {line}
                </p>
              ) : null,
            )}

            <div className="grid grid--3" style={{ marginTop: 8 }}>
              <InfoTile label="Срок выполнения" value={`${service.duration_minutes} мин`} />
              <InfoTile label="Гарантия" value={service.warranty || 'по договору'} />
              <InfoTile label="Категория" value={service.category_label} />
            </div>
          </div>

          <aside className="card card--accent stack">
            <span className="card__meta">Стоимость</span>
            <span className="card__price" style={{ fontSize: 30 }}>
              {service.price_label || formatPrice(service.price_from)}
            </span>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              Точная цена — после бесплатной диагностики. Мастер согласует смету до начала работ.
            </p>

            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate(`/booking?service=${service.id}`)}>
              Записаться на услугу
            </button>

            <div className="stack" style={{ gap: 8 }}>
              <span className="card__meta">Мастера по направлению</span>
              {technicians.slice(0, 3).map((technician) => (
                <div key={technician.id} className="row row--between">
                  <span style={{ fontSize: 14 }}>{technician.full_name}</span>
                  <Stars value={technician.rating} />
                </div>
              ))}
            </div>
          </aside>
        </div>

        {reviews.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2>Отзывы об услуге</h2>
            <div className="grid grid--3">
              {reviews.map((review) => (
                <article key={review.id} className="card">
                  <Stars value={review.rating} />
                  <p style={{ marginTop: 10 }}>{review.text}</p>
                  <span className="card__meta">{review.user?.name}</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2>Похожие услуги</h2>
            <div className="grid grid--3">
              {related.map((item) => (
                <Link key={item.id} className="card card--hover" to={`/services/${item.slug}`}>
                  <h3 className="card__title">{item.title}</h3>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
                    {item.short_description}
                  </p>
                  <span className="card__price">{item.price_label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="card card--flat">
      <span className="card__meta">{label}</span>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}