import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { useToast } from '../../components/Toast.jsx'
import { Field, Loading } from '../../components/ui.jsx'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminSchedule() {
  const toast = useToast()
  const [technicians, setTechnicians] = useState([])
  const [technicianId, setTechnicianId] = useState('')
  const [date, setDate] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    adminApi.technicians().then((response) => {
      const list = response.data || []
      setTechnicians(list)
      if (list.length) setTechnicianId(String(list[0].id))
    })
  }, [])

  const load = useCallback(() => {
    if (!technicianId || !date) return

    setLoading(true)
    adminApi
      .schedule({ technician_id: technicianId, date })
      .then(setData)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [technicianId, date, toast])

  useEffect(() => {
    load()
  }, [load])

  const addSlot = async (slot) => {
    try {
      const response = await adminApi.addScheduleSlot({
        technician_id: Number(technicianId),
        date,
        slot,
        is_available: false,
      })
      toast.success(response.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const free = async (schedule) => {
    try {
      const response = await adminApi.deleteScheduleSlot(schedule.id)
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
          <h1>Расписание мастеров</h1>
          <p>Занятые окна формируются автоматически при онлайн-записи. Здесь можно закрыть или освободить время вручную.</p>
        </div>
      </div>

      <div className="toolbar">
        <Field label="Мастер">
          <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Дата">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>

      {loading && <Loading label="Загружаем расписание…" />}

      {!loading && data && (
        <div className="grid grid--2">
          <div className="card">
            <h3>Свободные окна ({data.free_slots.length})</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              Нажмите на время, чтобы забронировать его вручную (например, для визита по телефону).
            </p>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              {data.free_slots.map((slot) => (
                <button key={slot.starts_at} type="button" className="chip" onClick={() => addSlot(slot.time)}>
                  {slot.label}
                </button>
              ))}
              {data.free_slots.length === 0 && <span className="muted">Свободных окон на эту дату нет.</span>}
            </div>
          </div>

          <div className="card">
            <h3>Занятые окна ({data.busy.length})</h3>
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              {data.busy.map((schedule) => (
                <div key={schedule.id} className="card card--flat row row--between" style={{ padding: 14 }}>
                  <div>
                    <strong>{new Date(schedule.starts_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</strong>
                    <div className="card__meta">
                      {schedule.appointment
                        ? `${schedule.appointment.client?.name || 'Клиент'} · ${schedule.appointment.client?.phone || ''}`
                        : 'Закрыто вручную'}
                    </div>
                  </div>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => free(schedule)}>
                    Освободить
                  </button>
                </div>
              ))}
              {data.busy.length === 0 && <span className="muted">На эту дату записей нет.</span>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}