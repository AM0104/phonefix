import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { useSite } from '../context/SiteContext.jsx'
import ServiceCard from '../components/ServiceCard.jsx'
import { EmptyState, Loading } from '../components/ui.jsx'

export default function Services() {
  const { categories } = useSite()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.get('search') || '')

  const category = params.get('category') || ''

  useEffect(() => {
    setLoading(true)

    publicApi
      .services({ category: category || undefined, search: params.get('search') || undefined })
      .then((data) => setServices(data.data || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [category, params])

  const setCategory = (value) => {
    const next = new URLSearchParams(params)

    if (value) {
      next.set('category', value)
    } else {
      next.delete('category')
    }

    setParams(next, { replace: true })
  }

  const submitSearch = (event) => {
    event.preventDefault()
    const next = new URLSearchParams(params)

    if (search.trim()) {
      next.set('search', search.trim())
    } else {
      next.delete('search')
    }

    setParams(next, { replace: true })
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Услуги сервисного центра</h1>
            <p>
              Диагностика, замена экранов, замена комплектующих и обновление ПО. Итоговую стоимость мастер называет после
              бесплатной диагностики.
            </p>
          </div>
        </div>

        <form className="toolbar" onSubmit={submitSearch}>
          <div className="field">
            <label>Поиск услуги</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Например, аккумулятор"
            />
          </div>
          <button type="submit" className="btn btn--primary btn--sm">
            Найти
          </button>
        </form>

        <div className="row" style={{ gap: 10, marginBottom: 28 }}>
          <button type="button" className={`chip${category === '' ? ' chip--active' : ''}`} onClick={() => setCategory('')}>
            Все услуги
          </button>
          {Object.entries(categories).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip${category === value ? ' chip--active' : ''}`}
              onClick={() => setCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <Loading />}

        {!loading && services.length === 0 && (
          <EmptyState
            title="Ничего не нашлось"
            text="Попробуйте изменить запрос или выберите другую категорию услуг."
            action={
              <button type="button" className="btn btn--ghost" onClick={() => setCategory('')}>
                Сбросить фильтры
              </button>
            }
          />
        )}

        {!loading && services.length > 0 && (
          <div className="grid grid--3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onBook={() => navigate(`/booking?service=${service.id}`)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}