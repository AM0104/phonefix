import { useState } from 'react'
import { publicApi } from '../api/client.js'
import { Alert, Field, Modal } from './ui.jsx'
import { useSite } from '../context/SiteContext.jsx'
import { useToast } from './Toast.jsx'

const EMPTY = { name: '', phone: '', email: '', comment: '' }

export default function CallbackModal({ source = 'callback-modal', onClose }) {
  const { setting } = useSite()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setErrors({})
    setError('')

    try {
      const data = await publicApi.createLead({ ...form, source })
      toast.success(data.message)
      setForm(EMPTY)
      onClose()
    } catch (requestError) {
      setErrors(requestError.errors || {})
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title="Заказать звонок"
      subtitle={`Мастер PhoneFix перезвонит и назовёт точную стоимость ремонта. Телефон: ${setting('site_phone')}`}
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit}>
        {error && <Alert type="error">{error}</Alert>}

        <Field label="Ваше имя *" error={errors.name?.[0]}>
          <input value={form.name} onChange={update('name')} placeholder="Иван" required minLength={2} />
        </Field>

        <Field label="Телефон *" error={errors.phone?.[0]}>
          <input
            value={form.phone}
            onChange={update('phone')}
            placeholder="+7 (___) ___-__-__"
            required
            inputMode="tel"
          />
        </Field>

        <Field label="E-mail" error={errors.email?.[0]} hint="Необязательно — пришлём смету письмом">
          <input type="email" value={form.email} onChange={update('email')} placeholder="mail@example.com" />
        </Field>

        <Field label="Что случилось с телефоном?" error={errors.comment?.[0]}>
          <textarea
            value={form.comment}
            onChange={update('comment')}
            placeholder="Модель телефона и описание проблемы"
          />
        </Field>

        <button type="submit" className="btn btn--primary btn--block" disabled={sending}>
          {sending ? 'Отправляем…' : 'Жду звонка'}
        </button>

        <p className="field__hint" style={{ margin: 0 }}>
          {setting('privacy_text')}
        </p>
      </form>
    </Modal>
  )
}