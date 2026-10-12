import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { EmptyState, Loading, Stars } from '../components/ui.jsx'

export default function Technicians() {
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicApi
      .technicians()
      .then((data) => setTechnicians(data.data || []))
      .catch(() => setTechnicians([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Мастера PhoneFix</h1>
            <p>
              Каждый мастер отвечает за своё направление: микропайка плат, замена дисплеев, комплектующие и программное
              обеспечение.
            </p>
          </div>
        </div>

        {loading && <Loading />}

        {!loading && technicians.length === 0 && (
          <EmptyState title="Список мастеров обновляется" text="Позвоните нам — подберём мастера под вашу задачу." />
        )}

        <div className="grid grid--3">
          {technicians.map((technician) => (
            <article key={technician.id} className="card card--hover stack">
              <div className="row row--between">
                <div className="logo__mark" style={{ fontSize: 17 }}>
                  {technician.full_name.split(' ').map((part) => part.charAt(0)).join('')}
                </div>
                <span className="badge badge--accent">Опыт {technician.experience_years} лет</span>
              </div>

              <div>
                <h3 className="card__title" style={{ marginBottom: 2 }}>
                  {technician.full_name}
                </h3>
                <span className="card__meta">{technician.position}</span>
              </div>

              <Stars value={technician.rating} />

              <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
                {technician.bio || technician.specialization}
              </p>

              <span className="card__meta">{technician.specialization}</span>

              <Link className="btn btn--primary btn--sm" to="/booking" style={{ alignSelf: 'flex-start' }}>
                Записаться к мастеру
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}