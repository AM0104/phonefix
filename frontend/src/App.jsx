import { Route, Routes } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ServerStatusBanner from './components/ServerStatusBanner.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { ModalProvider } from './context/ModalContext.jsx'

import Home from './pages/Home.jsx'
import Services from './pages/Services.jsx'
import ServiceDetail from './pages/ServiceDetail.jsx'
import Technicians from './pages/Technicians.jsx'
import Booking from './pages/Booking.jsx'
import Reviews from './pages/Reviews.jsx'
import Blog from './pages/Blog.jsx'
import ArticleDetail from './pages/ArticleDetail.jsx'
import Contacts from './pages/Contacts.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Account from './pages/Account.jsx'
import NotFound from './pages/NotFound.jsx'

import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminAppointments from './pages/admin/AdminAppointments.jsx'
import AdminServices from './pages/admin/AdminServices.jsx'
import AdminTechnicians from './pages/admin/AdminTechnicians.jsx'
import AdminSchedule from './pages/admin/AdminSchedule.jsx'
import AdminReviews from './pages/admin/AdminReviews.jsx'
import AdminLeads from './pages/admin/AdminLeads.jsx'
import AdminContent from './pages/admin/AdminContent.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'

export default function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        {/* Предупреждение о недоступной базе данных — вместо пустого сайта. */}
        <ServerStatusBanner />

        <Routes>
          {/* Публичная часть */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/technicians" element={<Technicians />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<ArticleDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/appointments"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Админ-панель */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="technicians" element={<AdminTechnicians />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </ModalProvider>
    </ToastProvider>
  )
}