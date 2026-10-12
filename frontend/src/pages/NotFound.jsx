import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="card card--accent text-center" style={{ padding: 60 }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: 'var(--pf-accent)' }}>404</span>
          <h1 style={{ marginTop: 10 }}>Страница не найдена</h1>
          <p className="muted">Возможно, адрес изменился. Вернитесь на главную или посмотрите список услуг.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--primary" to="/">
              На главную
            </Link>
            <Link className="btn btn--ghost" to="/services">
              Услуги
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}