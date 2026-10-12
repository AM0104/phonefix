import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/client.js'
import { APPOINTMENT_STATUSES, LEAD_STATUSES, formatDateTime, formatPrice } from '../../api/constants.js'
import { Loading, StatusBadge } from '../../components/ui.jsx'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((requestError) => setError(requestError.message))
  }, [])

  if (error) return <div className="alert alert--error">{error}</div>
  if (!data) return <Loading label="Считаем статистику…" />

  const { cards } = data

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Дашборд</h1>
          <p>Сводка по заявкам, загрузке мастеров и обращениям клиентов.</p>
        </div>
        <Link className="btn btn--primary btn--sm" to="/admin/appointments">
          Перейти к заявкам
        </Link>
      </div>

      <div className="stat-cards">
        <StatCard value={cards.appointments_total} label="Всего заявок" />
        <StatCard value={cards.appointments_new} label="Новые заявки" />
        <StatCard value={cards.appointments_today} label="Записей на сегодня" />
        <StatCard value={cards.appointments_done} label="Выполнено ремонтов" />
        <StatCard value={formatPrice(cards.revenue_done)} label="Выручка по закрытым" />
        <StatCard value={cards.clients} label="Клиентов в базе" />
        <StatCard value={cards.services} label="Активных услуг" />
        <StatCard value={cards.leads_new} label="Новых заявок на звонок" />
        <StatCard value={cards.reviews_pending} label="Отзывов на модерации" />
      </div>

      <div className="grid grid--2" style={{ marginBottom: 30 }}>
        <div className="card">
          <h3>Заявки по статусам</h3>
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            {Object.entries(APPOINTMENT_STATUSES).map(([status, label]) => (
              <div key={status} className="row row--between">
                <StatusBadge status={status} labels={APPOINTMENT_STATUSES} />
                <strong>{data.appointments_by_status[status] || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Топ услуг по заявкам</h3>
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            {data.top_services.length === 0 && <span className="muted">Заявок пока нет.</span>}
            {data.top_services.map((service) => (
              <div key={service.id} className="row row--between">
                <span style={{ fontSize: 14.5 }}>{service.title}</span>
                <span className="badge badge--accent">{service.appointments_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20 }}>Последние заявки</h2>
      <div className="table-wrap" style={{ marginBottom: 30 }}>
        <table className="data">
          <thead>
            <tr>
              <th>№</th>
              <th>Клиент</th>
              <th>Услуга</th>
              <th>Мастер</th>
              <th>Время</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.latest_appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>#{appointment.id}</td>
                <td>
                  {appointment.client?.name}
                  <br />
                  <span className="card__meta">{appointment.client?.phone}</span>
                </td>
                <td>{appointment.service?.title}</td>
                <td>{appointment.technician?.full_name}</td>
                <td>{formatDateTime(appointment.scheduled_at)}</td>
                <td>
                  <StatusBadge status={appointment.status} labels={APPOINTMENT_STATUSES} />
                </td>
              </tr>
            ))}
            {data.latest_appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Заявок пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20 }}>Последние обращения «Заказать звонок»</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Комментарий</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {data.latest_leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.phone}</td>
                <td>{lead.comment || '—'}</td>
                <td>
                  <StatusBadge status={lead.status} labels={LEAD_STATUSES} />
                </td>
                <td>{formatDateTime(lead.created_at)}</td>
              </tr>
            ))}
            {data.latest_leads.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Обращений нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  )
}