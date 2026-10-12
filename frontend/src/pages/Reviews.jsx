import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { useModal } from '../context/ModalContext.jsx'
import { EmptyState, Loading, Pagination, Stars } from '../components/ui.jsx'
import { formatDate } from '../api/constants.js'

export default function Reviews() {
  const { openCallback } = useModal()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    publicApi
      .reviews({ page })
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false))
  }, [page?.current_page])

  const loadPage = (number) => {
    publicApi.reviews({ page: number }).then(setPage)
  }

  const reviews = page?.data || []
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '5.0'

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Отзывы клиентов</h1>
            <p>Публикуем только отзывы по реально выполненным заявкам — после модерации администратором.</p>
          </div>
          <Link className="btn btn--primary btn--sm" to="/booking">
            Оставить заявку
          </Link>
        </div>

        {loading && <Loading />}

        {!loading && reviews.length === 0 && (
          <EmptyState
            title="Отзывов пока нет"
            text="Станьте первым — после ремонта вы сможете оставить отзыв в личном кабинете."
            action={
              <button type="button" className="btn btn--outline" onClick={() => openCallback('reviews')}>
                Задать вопрос
              </button>
            }
          />
        )}

        {!loading && reviews.length > 0 && (
          <>
            <div className="card card--accent row row--between" style={{ marginBottom: 26 }}>
              <div>
                <span className="card__meta">Средняя оценка на этой странице</span>
                <div className="row" style={{ gap: 12 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--pf-accent)' }}>{average}</span>
                  <Stars value={Number(average)} />
                </div>
              </div>
              <span className="muted" style={{ fontSize: 14 }}>
                Всего отзывов: {page.total}
              </span>
            </div>

            <div className="grid grid--3">
              {reviews.map((review) => (
                <article key={review.id} className="card">
                  <div className="row row--between">
                    <Stars value={review.rating} />
                    <span className="card__meta">{formatDate(review.created_at)}</span>
                  </div>
                  <p style={{ marginTop: 12 }}>{review.text}</p>
                  <span className="card__meta">
                    {review.user?.name}
                    {review.service?.title ? ` · ${review.service.title}` : ''}
                  </span>
                </article>
              ))}
            </div>

            <Pagination meta={page} onPage={loadPage} />
          </>
        )}
      </div>
    </section>
  )
}