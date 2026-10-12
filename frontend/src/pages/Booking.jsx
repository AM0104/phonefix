import { useSearchParams } from 'react-router-dom'
import BookingWizard from '../components/BookingWizard.jsx'

export default function Booking() {
  const [params] = useSearchParams()

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Онлайн-запись на ремонт</h1>
            <p>
              Выберите услугу, мастера и свободное время — запись сразу попадает в расписание сервиса и в личный кабинет.
            </p>
          </div>
        </div>

        <BookingWizard initialServiceId={params.get('service')} />
      </div>
    </section>
  )
}