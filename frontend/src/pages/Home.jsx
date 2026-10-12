import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/client.js'
import { useSite } from '../context/SiteContext.jsx'
import { useModal } from '../context/ModalContext.jsx'
import ServiceCard from '../components/ServiceCard.jsx'
import { Loading, Stars } from '../components/ui.jsx'
import { formatDate } from '../api/constants.js'

const ADVANTAGES = [
  {
    title: 'Бесплатная диагностика',
    text: 'Определяем причину поломки при вас и называем точную стоимость до начала работ.',
    icon: '🔍',
  },
  {
    title: 'Замена экранов за 1 час',
    text: 'Оригинальные модули и качественные аналоги в наличии. Переклейка стекла на вакуумном прессе.',
    icon: '📱',
  },
  {
    title: 'Оригинальные комплектующие',
    text: 'Аккумуляторы, разъёмы, камеры, динамики и корпуса с гарантией до 6 месяцев.',
    icon: '🔧',
  },
  {
    title: 'Обновление ПО',
    text: 'Прошивка Android и iOS, перенос данных, чистка от вирусов и рекламы.',
    icon: '⚙️',
  },
  {
    title: 'Ремонт за 1 визит',
    text: '90% работ выполняем в день обращения, сложные — на следующий день.',
    icon: '⚡',
  },
  {
    title: 'Гарантия и договор',
    text: 'Оформляем договор и выдаём гарантийный талон на каждую работу.',
    icon: '🛡️',
  },
]

const STEPS = [
  ['01', 'Онлайн-запись', 'Выбираете услугу, мастера и удобное время в свободных слотах.'],
  ['02', 'Диагностика', 'Мастер проверяет аппарат и согласовывает с вами точную смету.'],
  ['03', 'Ремонт', 'Меняем экран, комплектующие или обновляем ПО в присутствии клиента.'],
  ['04', 'Проверка и гарантия', 'Тестируем телефон, выдаём гарантийный талон и чек.'],
]

export default function Home() {
  const { setting } = useSite()
  const { openCallback } = useModal()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    publicApi
      .home()
      .then(setData)
      .catch(() => setError('Не удалось загрузить данные главной страницы.'))
  }, [])

  if (error) {
    return (
      <div className="container section">
        <div className="alert alert--error">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container section">
        <Loading />
      </div>
    )
  }

  return (
    <>
      <section className="section" style={{ paddingTop: 64 }}>
        <div className="container">
          <div className="grid grid--2" style={{ alignItems: 'center', gap: 44 }}>
            <div className="stack" style={{ gap: 20 }}>
              <span className="badge badge--accent">{setting('hero_badge')}</span>
              <h1>{setting('hero_title')}</h1>
              <p className="muted" style={{ fontSize: 17 }}>
                {setting('hero_subtitle')}
              </p>
              <div className="row">
                <Link className="btn btn--primary" to="/booking">
                  Записаться онлайн
                </Link>
                <button type="button" className="btn btn--outline" onClick={() => openCallback('hero')}>
                  Бесплатная диагностика
                </button>
              </div>
              <div className="row" style={{ gap: 26, marginTop: 6 }}>
                <Stat value={`${setting('stat_years')}+`} label="лет на рынке" />
                <Stat value={`${setting('stat_repairs')}+`} label="ремонтов" />
                <Stat value={`${setting('stat_warranty_months')} мес.`} label="гарантия" />
              </div>
            </div>

            <div className="card card--accent stack">
              <h3 style={{ marginBottom: 2 }}>Свободные окна на ремонт</h3>
              <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
                Актуальное расписание мастеров — запись подтверждается звонком в течение 15 минут.
              </p>

              {data.technicians.length === 0 && <p className="muted">Расписание уточняется по телефону.</p>}

              {data.technicians.map((technician) => (
                <div key={technician.id} className="card card--flat" style={{ padding: 16 }}>
                  <div className="row row--between">
                    <strong>{technician.full_name}</strong>
                    <Stars value={technician.rating} />
                  </div>
                  <p className="muted" style={{ fontSize: 13.5, margin: '6px 0 0' }}>
                    {technician.specialization}
                  </p>
                </div>
              ))}

              <Link className="btn btn--primary btn--block" to="/booking">
                Выбрать время
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Популярные услуги</h2>
              <p>Диагностика, замена экранов и комплектующих, обновление ПО — цены «от» с точной сметой после диагностики.</p>
            </div>
            <Link className="btn btn--ghost btn--sm" to="/services">
              Все услуги ({data.services_count})
            </Link>
          </div>

          <div className="grid grid--3">
            {data.popular_services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{setting('advantages_title')}</h2>
              <p>Работаем по договору: сначала согласуем смету, потом приступаем к ремонту.</p>
            </div>
          </div>

          <div className="grid grid--3">
            {ADVANTAGES.map((item) => (
              <article key={item.title} className="card card--hover">
                <div style={{ fontSize: 26, marginBottom: 12 }}>{item.icon}</div>
                <h3 className="card__title">{item.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Как проходит ремонт</h2>
              <p>Четыре шага от заявки до гарантийного талона.</p>
            </div>
          </div>

          <div className="grid grid--4">
            {STEPS.map(([number, title, text]) => (
              <article key={number} className="card">
                <span className="card__price">{number}</span>
                <h3 className="card__title" style={{ marginTop: 10 }}>
                  {title}
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Мастера сервиса</h2>
              <p>Опыт от 6 до 11 лет, профильная специализация по каждому направлению ремонта.</p>
            </div>
            <Link className="btn btn--ghost btn--sm" to="/technicians">
              Все мастера
            </Link>
          </div>

          <div className="grid grid--4">
            {data.technicians.map((technician) => (
              <article key={technician.id} className="card card--hover">
                <div className="logo__mark" style={{ marginBottom: 12 }}>
                  {technician.full_name.split(' ').map((part) => part.charAt(0)).join('')}
                </div>
                <h3 className="card__title" style={{ marginBottom: 4 }}>
                  {technician.full_name}
                </h3>
                <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
                  {technician.position}
                </p>
                <Stars value={technician.rating} />
                <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>
                  {technician.specialization}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {data.reviews.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Отзывы клиентов</h2>
                <p>
                  Средняя оценка {data.stats.avg_rating} из 5 по {data.stats.reviews_count} отзывам.
                </p>
              </div>
              <Link className="btn btn--ghost btn--sm" to="/reviews">
                Все отзывы
              </Link>
            </div>

            <div className="grid grid--3">
              {data.reviews.map((review) => (
                <article key={review.id} className="card">
                  <Stars value={review.rating} />
                  <p style={{ marginTop: 12 }}>{review.text}</p>
                  <span className="card__meta">{review.user?.name}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.articles.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Полезные статьи</h2>
                <p>Советы мастеров: как продлить жизнь телефону и когда пора в сервис.</p>
              </div>
              <Link className="btn btn--ghost btn--sm" to="/blog">
                Все статьи
              </Link>
            </div>

            <div className="grid grid--3">
              {data.articles.map((article) => (
                <Link key={article.id} className="card card--hover" to={`/blog/${article.slug}`}>
                  <span className="card__meta">{formatDate(article.published_at)}</span>
                  <h3 className="card__title">{article.title}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                    {article.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="card card--accent" style={{ padding: 40, textAlign: 'center' }}>
            <h2>Не знаете, что с телефоном?</h2>
            <p className="muted" style={{ maxWidth: 620, margin: '0 auto 22px' }}>
              Оставьте заявку — мастер перезвонит, подскажет причину и стоимость, подберёт удобное время визита.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn--primary" onClick={() => openCallback('home-cta')}>
                Заказать звонок
              </button>
              <Link className="btn btn--ghost" to="/booking">
                Записаться онлайн
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--pf-accent)' }}>{value}</div>
      <div className="card__meta">{label}</div>
    </div>
  )
}