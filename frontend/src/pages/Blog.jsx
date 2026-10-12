import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { EmptyState, Loading } from '../components/ui.jsx'
import { formatDate } from '../api/constants.js'

export default function Blog() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicApi
      .articles()
      .then((data) => setArticles(data.data || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Блог и советы мастеров</h1>
            <p>Разбираем типовые поломки, рассказываем, как ухаживать за телефоном и когда пора в сервис.</p>
          </div>
        </div>

        {loading && <Loading />}

        {!loading && articles.length === 0 && <EmptyState title="Статей пока нет" text="Мы готовим новые материалы." />}

        <div className="grid grid--3">
          {articles.map((article) => (
            <Link key={article.id} className="card card--hover stack" to={`/blog/${article.slug}`}>
              <div className="row row--between">
                <span className="badge badge--accent">{article.category}</span>
                <span className="card__meta">{formatDate(article.published_at)}</span>
              </div>
              <h3 className="card__title">{article.title}</h3>
              <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
                {article.excerpt}
              </p>
              <span className="accent-text" style={{ fontWeight: 700, fontSize: 14 }}>
                Читать →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}