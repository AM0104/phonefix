import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { publicApi } from '../api/client.js'
import { SERVICE_CATEGORIES } from '../api/constants.js'

const SiteContext = createContext(null)

const FALLBACK_SETTINGS = {
  site_name: 'PhoneFix',
  site_tagline: 'Диагностика и ремонт телефонов в Кургане',
  site_phone: '+7 (3522) 45-67-89',
  site_email: 'info@phonefix.ru',
  site_address: 'г. Курган, ул. Коли Мяготина, д. 56',
  work_time_weekdays: 'Пн–Пт: 10:00 – 20:00',
  work_time_weekend: 'Сб–Вс: 11:00 – 18:00',
}

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS)
  const [categories, setCategories] = useState(SERVICE_CATEGORIES)
  const [ready, setReady] = useState(false)
  // online = false, если API/БД недоступны: тогда наверху страницы появляется
  // предупреждение, а не пустой (белый) сайт.
  const [online, setOnline] = useState(true)
  const [apiError, setApiError] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await publicApi.site()
      setSettings({ ...FALLBACK_SETTINGS, ...(data.settings || {}) })
      if (data.categories) {
        setCategories(data.categories)
      }
      setOnline(true)
      setApiError('')
      return true
    } catch (error) {
      setSettings(FALLBACK_SETTINGS)
      setOnline(false)
      setApiError(error?.message || 'Сервер API недоступен')
      return false
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Пока API недоступен — тихо перепроверяем: MySQL мог подняться позже,
  // и сайт сам «оживёт» без перезагрузки страницы.
  useEffect(() => {
    if (online) {
      return undefined
    }

    const timer = setInterval(() => {
      load()
    }, 10000)

    return () => clearInterval(timer)
  }, [online, load])

  const value = useMemo(
    () => ({
      settings,
      categories,
      ready,
      online,
      apiError,
      reload: load,
      setting: (key, fallback = '') => settings[key] ?? fallback,
    }),
    [settings, categories, ready, online, apiError, load],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const context = useContext(SiteContext)

  if (!context) {
    throw new Error('useSite должен использоваться внутри SiteProvider')
  }

  return context
}