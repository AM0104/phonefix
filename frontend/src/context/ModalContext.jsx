import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import CallbackModal from '../components/CallbackModal.jsx'

const ModalContext = createContext(null)

/**
 * Глобальное модальное окно «Заказать звонок» — лид сохраняется в БД через API.
 */
export function ModalProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('callback-modal')

  const openCallback = useCallback((newSource = 'callback-modal') => {
    setSource(newSource)
    setOpen(true)
  }, [])

  const closeCallback = useCallback(() => setOpen(false), [])

  const value = useMemo(() => ({ openCallback, closeCallback }), [openCallback, closeCallback])

  return (
    <ModalContext.Provider value={value}>
      {children}
      {open && <CallbackModal source={source} onClose={closeCallback} />}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)

  if (!context) {
    throw new Error('useModal должен использоваться внутри ModalProvider')
  }

  return context
}