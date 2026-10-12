import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { useToast } from '../../components/Toast.jsx'
import { Field, Loading, Modal, StatusBadge } from '../../components/ui.jsx'

const EMPTY = {
  full_name: '',
  position: 'Мастер по ремонту',
  specialization: '',
  bio: '',
  experience_years: 1,
  rating: 5,
  is_active: true,
  sort_order: 0,
  email: '',
  password: '',
  phone: '',
}

export default function AdminTechnicians() {
  const toast = useToast()
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .technicians()
      .then((data) => setTechnicians(data.data || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (technician) => {
    setForm({
      ...EMPTY,
      full_name: technician.full_name,
      position: technician.position,
      specialization: technician.specialization || '',
      bio: technician.bio || '',
      experience_years: technician.experience_years,
      rating: technician.rating,
      is_active: technician.is_active,
      sort_order: technician.sort_order,
    })
    setEditingId(technician.id)
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      experience_years: Number(form.experience_years),
      rating: Number(form.rating),
      sort_order: Number(form.sort_order),
    }

    if (editingId) {
      delete payload.email
      delete payload.password
      delete payload.phone
    } else if (!payload.email) {
      delete payload.email
      delete payload.password
      delete payload.phone
    }

    try {
      const response = editingId
        ? await adminApi.updateTechnician(editingId, payload)
        : await adminApi.createTechnician(payload)
      toast.success(response.message)
      setOpen(false)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (technician) => {
    if (!window.confirm(`Удалить мастера «${technician.full_name}»?`)) return

    try {
      const response = await adminApi.deleteTechnician(technician.id)
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
          <h1>Мастера</h1>
          <p>Карточки мастеров, специализация, опыт и доступ в систему.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          + Добавить мастера
        </button>
      </div>

      {loading && <Loading />}

      {!loading && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Мастер</th>
                <th>Специализация</th>
                <th>Опыт</th>
                <th>Рейтинг</th>
                <th>Заявок</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id}>
                  <td>
                    {technician.full_name}
                    <br />
                    <span className="card__meta">{technician.position}</span>
                  </td>
                  <td>{technician.specialization || '—'}</td>
                  <td>{technician.experience_years} лет</td>
                  <td>{technician.rating}</td>
                  <td>{technician.appointments_count}</td>
                  <td>
                    <StatusBadge
                      status={technician.is_active ? 'published' : 'rejected'}
                      labels={{ published: 'Работает', rejected: 'Неактивен' }}
                    />
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(technician)}>
                        Изменить
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(technician)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          title={editingId ? 'Редактирование мастера' : 'Новый мастер'}
          subtitle={editingId ? undefined : 'Укажите e-mail и пароль — будет создана учётная запись с ролью «Мастер».'}
          onClose={() => setOpen(false)}
          wide
        >
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="ФИО *">
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((c) => ({ ...c, full_name: event.target.value }))}
                  required
                />
              </Field>

              <Field label="Должность">
                <input value={form.position} onChange={(event) => setForm((c) => ({ ...c, position: event.target.value }))} />
              </Field>

              <Field label="Опыт, лет">
                <input
                  type="number"
                  min="0"
                  value={form.experience_years}
                  onChange={(event) => setForm((c) => ({ ...c, experience_years: event.target.value }))}
                />
              </Field>

              <Field label="Рейтинг (0–5)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(event) => setForm((c) => ({ ...c, rating: event.target.value }))}
                />
              </Field>

              <Field label="Специализация" full>
                <input
                  value={form.specialization}
                  onChange={(event) => setForm((c) => ({ ...c, specialization: event.target.value }))}
                  placeholder="Замена экранов, микропайка, обновление ПО"
                />
              </Field>

              <Field label="Описание" full>
                <textarea value={form.bio} onChange={(event) => setForm((c) => ({ ...c, bio: event.target.value }))} />
              </Field>

              {!editingId && (
                <>
                  <Field label="E-mail для входа">
                    <input type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
                  </Field>

                  <Field label="Пароль">
                    <input
                      type="text"
                      value={form.password}
                      onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))}
                      placeholder="минимум 6 символов"
                    />
                  </Field>

                  <Field label="Телефон">
                    <input value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
                  </Field>
                </>
              )}

              <Field label="Порядок вывода">
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) => setForm((c) => ({ ...c, sort_order: event.target.value }))}
                />
              </Field>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((c) => ({ ...c, is_active: event.target.checked }))}
              />
              Мастер принимает записи
            </label>

            <div className="row">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}