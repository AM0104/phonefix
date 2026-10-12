import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { EmptyState, Loading } from '../components/ui.jsx'
import { formatDate } from '../api/constants.js'

export default function ArticleDetail() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)

    publicApi
      .article(slug)
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
          title="Статья не найдена"
          action={
            <Link className="btn btn--primary" to="/blog">
              Все статьи
            </Link>
          }
        />
      </div>
    )
  }

  const { data: article, related } = data

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <span className="badge badge--accent">{article.category}</span>
          <span className="card__meta">{formatDate(article.published_at)}</span>
        </div>

        <h1 style={{ fontSize: 36 }}>{article.title}</h1>

        {article.excerpt && (
          <p className="muted" style={{ fontSize: 18 }}>
            {article.excerpt}
          </p>
        )}

        <div className="stack" style={{ marginTop: 24 }}>
          {article.body.split('\n').map((line, index) =>
            line.trim() ? (
              <p key={index} style={{ margin: 0, lineHeight: 1.75 }}>
                {line}
              </p>
            ) : (
              <div key={index} style={{ height: 8 }} />
            ),
          )}
        </div>

        <div className="card card--accent row row--between" style={{ marginTop: 40 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Нужна помощь мастера?</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
              Запишитесь онлайн — диагностика бесплатная.
            </p>
          </div>
          <Link className="btn btn--primary" to="/booking">
            Записаться
          </Link>
        </div>

        {related?.length > 0 && (
          <div style={{ marginTop: 42 }}>
            <h2 style={{ fontSize: 24 }}>Читайте также</h2>
            <div className="grid grid--3">
              {related.map((item) => (
                <Link key={item.id} className="card card--hover" to={`/blog/${item.slug}`}>
                  <h3 className="card__title" style={{ fontSize: 16 }}>
                    {item.title}
                  </h3>
                  <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                    {item.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}