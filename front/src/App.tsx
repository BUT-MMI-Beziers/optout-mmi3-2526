import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "@/layouts/MainLayout"
import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Dashboard from "@/pages/Dashboard"
import Profile from "@/pages/Profile"
import Brokers from "@/pages/Brokers"
import BrokerDetail from "@/pages/BrokerDetail"
import Requests from "@/pages/Requests"
import RequestDetail from "@/pages/RequestDetail"
import NewRequest from "@/pages/NewRequest"
import NewRequestReview from "@/pages/NewRequestReview"
import ScrollToTop from "@/components/ScrollToTop"
import AdminBrokers from "@/pages/AdminBrokers"
import Notifications from "@/pages/Notifications"
import Settings from "@/pages/Settings"
import Reminders from "@/pages/Reminders"

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Redirect racine vers dashboard */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Landing toujours accessible */}
        <Route path="/landing" element={<Landing />} />

        {/* Auth sans layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/brokers" element={<Brokers />} />
          <Route path="/brokers/:slug" element={<BrokerDetail />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/new/review" element={<NewRequestReview />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/admin/brokers" element={<AdminBrokers />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reminders" element={<Reminders />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App