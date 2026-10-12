import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { REVIEW_STATUSES, formatDateTime } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, Loading, Pagination, Stars, StatusBadge } from '../../components/ui.jsx'

export default function AdminReviews() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .reviews({ status: status || undefined, page })
      .then(setData)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [status, page, toast])

  useEffect(() => {
    load()
  }, [load])

  const moderate = async (review, newStatus) => {
    try {
      const response = await adminApi.updateReview(review.id, { status: newStatus })
      toast.success(response.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async (review) => {
    if (!window.confirm('Удалить отзыв безвозвратно?')) return

    try {
      const response = await adminApi.deleteReview(review.id)
      toast.success(response.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Модерация отзывов</h1>
          <p>Публикуем отзывы только по выполненным заявкам. Проверьте текст и подтвердите публикацию.</p>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 20 }}>
        <button type="button" className={`chip${status === '' ? ' chip--active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>
          Все
        </button>
        {Object.entries(REVIEW_STATUSES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip${status === value ? ' chip--active' : ''}`}
            onClick={() => { setStatus(value); setPage(1) }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && data?.data?.length === 0 && <EmptyState title="Отзывов нет" text="Как только клиенты оставят отзывы, они появятся здесь." />}

      {!loading && data?.data?.length > 0 && (
        <>
          <div className="stack">
            {data.data.map((review) => (
              <article key={review.id} className="card stack">
                <div className="row row--between">
                  <div className="row" style={{ gap: 12 }}>
                    <Stars value={review.rating} />
                    <StatusBadge status={review.status} labels={REVIEW_STATUSES} />
                  </div>
                  <span className="card__meta">{formatDateTime(review.created_at)}</span>
                </div>

                <p style={{ margin: 0 }}>{review.text}</p>

                <div className="row row--between">
                  <span className="card__meta">
                    {review.user?.name} ({review.user?.email})
                    {review.service?.title ? ` · ${review.service.title}` : ''}
                    {review.technician?.full_name ? ` · ${review.technician.full_name}` : ''}
                  </span>

                  <div className="row" style={{ gap: 6 }}>
                    {review.status !== 'published' && (
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => moderate(review, 'published')}>
                        Опубликовать
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => moderate(review, 'rejected')}>
                        Отклонить
                      </button>
                    )}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(review)}>
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <Pagination meta={data} onPage={setPage} />
        </>
      )}
    </>
  )
}