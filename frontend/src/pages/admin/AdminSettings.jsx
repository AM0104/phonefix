import { useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { useToast } from '../../components/Toast.jsx'
import { useSite } from '../../context/SiteContext.jsx'
import { Alert, Loading } from '../../components/ui.jsx'

const GROUP_TITLES = {
  general: 'Основные данные',
  home: 'Главная страница',
  contacts: 'Контакты',
  schedule: 'Режим работы и онлайн-запись',
  content: 'Тексты страниц',
  stats: 'Цифры и показатели',
}

export default function AdminSettings() {
  const toast = useToast()
  const { reload } = useSite()
  const [groups, setGroups] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi
      .settings()
      .then((data) => {
        const grouped = {}

        ;(data.data || []).forEach((setting) => {
          grouped[setting.group] = grouped[setting.group] || []
          grouped[setting.group].push(setting)
        })

        setGroups(grouped)
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [toast])

  const update = (group, key, value) => {
    setGroups((current) => ({
      ...current,
      [group]: current[group].map((setting) => (setting.key === key ? { ...setting, value } : setting)),
    }))
  }

  const save = async () => {
    setSaving(true)

    const settings = Object.values(groups)
      .flat()
      .map((setting) => ({ key: setting.key, value: setting.value, group: setting.group, label: setting.label }))

    try {
      const response = await adminApi.saveSettings(settings)
      toast.success(response.message)
      await reload()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Загружаем настройки…" />

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Тексты и настройки сайта</h1>
          <p>Меняйте тексты, телефоны, часы работы и показатели — изменения сразу появятся на сайте.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить всё'}
        </button>
      </div>

      <Alert type="info">
        Поля «Начало/конец рабочего дня» и «Шаг слота» управляют генерацией свободных окон в онлайн-записи (формат 10:00 и
        20:00).
      </Alert>

      <div className="stack" style={{ gap: 22, marginTop: 20 }}>
        {Object.entries(groups).map(([group, settings]) => (
          <section key={group} className="card">
            <h3>{GROUP_TITLES[group] || group}</h3>

            <div className="form-grid" style={{ marginTop: 14 }}>
              {settings.map((setting) => (
                <div className="field" key={setting.key}>
                  <label>{setting.label || setting.key}</label>
                  <input value={setting.value ?? ''} onChange={(event) => update(group, setting.key, event.target.value)} />
                  <span className="field__hint">{setting.key}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button type="button" className="btn btn--primary" style={{ marginTop: 24 }} onClick={save} disabled={saving}>
        {saving ? 'Сохраняем…' : 'Сохранить все настройки'}
      </button>
    </>
  )
}