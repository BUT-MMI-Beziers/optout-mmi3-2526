import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/auth/AuthContext"
import ProtectedRoute from "@/auth/ProtectedRoute"
import Login from "@/auth/Login"
import Register from "@/auth/Register"
import Profile from "@/auth/Profile"
import MainLayout from "@/layouts/MainLayout"
import Landing from "@/pages/Landing"
import Dashboard from "@/pages/Dashboard"
import Brokers from "@/pages/Brokers"
import BrokerDetail from "@/pages/BrokerDetail"
import RequestDetail from "@/pages/RequestDetail"
import NewRequest from "@/pages/NewRequest"
import AdminBrokers from "@/pages/AdminBrokers"
import Notifications from "@/pages/Notifications"
import Settings from "@/pages/Settings"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/brokers/:slug" element={<BrokerDetail />} />

            {/* Routes protégées */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/requests/new" element={<ProtectedRoute><NewRequest /></ProtectedRoute>} />
            <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
            <Route path="/admin/brokers" element={<ProtectedRoute><AdminBrokers /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
