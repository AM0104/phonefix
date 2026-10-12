import { useSite } from '../context/SiteContext.jsx'
import { useModal } from '../context/ModalContext.jsx'

const FAQ = [
  [
    'Сколько стоит диагностика?',
    'Диагностика бесплатная. Вы платите только за ремонт, стоимость которого согласуем заранее.',
  ],
  [
    'Сколько по времени занимает замена экрана?',
    'Для популярных моделей — 40–60 минут при наличии модуля. Редкие модули привозим под заказ за 1–2 дня.',
  ],
  [
    'Даёте ли гарантию?',
    'Да. На дисплеи — до 6 месяцев, на комплектующие — 3 месяца, на работы с ПО — 30 дней. Гарантия оформляется талоном.',
  ],
  [
    'Сохранятся ли данные при обновлении ПО?',
    'По умолчанию — да, мы делаем резервную копию. Если требуется полный сброс, предупредим заранее.',
  ],
  [
    'Можно ли вызвать курьера?',
    'Да, курьер заберёт и привезёт телефон в день ремонта. По Кургану бесплатно при заказе от 3 000 ₽.',
  ],
]

export default function Contacts() {
  const { setting } = useSite()
  const { openCallback } = useModal()

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Контакты сервисного центра</h1>
            <p>Приходите без записи или оформите онлайн-запись — мастер будет ждать именно вас.</p>
          </div>
        </div>

        <div className="grid grid--3" style={{ marginBottom: 40 }}>
          <ContactCard title="Телефон" value={setting('site_phone')} href={`tel:${setting('site_phone').replace(/[^+\d]/g, '')}`} />
          <ContactCard title="E-mail" value={setting('site_email')} href={`mailto:${setting('site_email')}`} />
          <ContactCard title="Адрес" value={setting('site_address')} />
        </div>

        <div className="grid grid--2">
          <div className="card stack">
            <h2 style={{ fontSize: 24 }}>Режим работы</h2>
            <div className="row row--between">
              <span className="muted">Будние дни</span>
              <strong>{setting('work_time_weekdays')}</strong>
            </div>
            <div className="row row--between">
              <span className="muted">Выходные</span>
              <strong>{setting('work_time_weekend')}</strong>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>
              {setting('delivery_text')}
            </p>
            <button type="button" className="btn btn--primary" onClick={() => openCallback('contacts')}>
              Заказать звонок
            </button>
          </div>

          <div className="card stack">
            <h2 style={{ fontSize: 24 }}>О сервисе</h2>
            <p className="muted">{setting('about_text')}</p>
            <div className="grid grid--2">
              <Stat value={`${setting('stat_years')}+`} label="лет опыта" />
              <Stat value={`${setting('stat_repairs')}+`} label="ремонтов" />
              <Stat value={`${setting('stat_warranty_months')} мес.`} label="гарантия" />
              <Stat value={setting('stat_masters')} label="мастера" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <h2>Частые вопросы</h2>
          <div className="grid grid--2">
            {FAQ.map(([question, answer]) => (
              <article key={question} className="card">
                <h3 className="card__title">{question}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                  {answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactCard({ title, value, href }) {
  return (
    <div className="card">
      <span className="card__meta">{title}</span>
      <div style={{ fontSize: 19, fontWeight: 700, marginTop: 6 }}>
        {href ? <a href={href}>{value}</a> : value}
      </div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="card card--flat">
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--pf-accent)' }}>{value}</div>
      <span className="card__meta">{label}</span>
    </div>
  )
}