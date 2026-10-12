import { useState } from 'react'
import { useSite } from '../context/SiteContext.jsx'

/**
 * Жёлтая плашка «нет связи с базой данных».
 * Раньше при недоступном API сайт молча открывался пустым; теперь причина видна сразу.
 */
export default function ServerStatusBanner() {
  const { ready, online, reload } = useSite()
  const [checking, setChecking] = useState(false)

  if (!ready || online) {
    return null
  }

  const check = async () => {
    setChecking(true)
    try {
      await reload()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="server-banner" role="status">
      <div className="container server-banner__inner">
        <span className="server-banner__text">
          <strong>Нет связи с базой данных.</strong> Сервер API не отвечает — обычно это значит, что не
          запущен MySQL (в OSPanel модуль <strong>MySQL-8.0</strong>). Сайт открыт в демо-режиме:
          услуги и мастера могут быть не видны.
        </span>
        <button type="button" className="btn btn--primary btn--sm" onClick={check} disabled={checking}>
          {checking ? 'Проверяю…' : 'Проверить снова'}
        </button>
      </div>
    </div>
  )
}
