import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/auth/Landing';
import Courts from './pages/courts/Home'; 
import CourtDetails from './pages/courts/CourtDetails';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import TeamProfile from './pages/user/TeamProfile';
import FindTeam from './pages/user/FindTeam';
import AdminBookings from './pages/admin/AdminBookings';
import ManagerDashboard from './pages/admin/ManagerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Requests from './pages/user/Requests';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const ContainerLayout = () => (
  <div className="container main-content">
    <Outlet />
  </div>
);

function App() {
  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          
          <Route element={<ContainerLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            <Route path="/courts" element={<Courts />} />
            <Route path="/courts/:id" element={<CourtDetails />} />

            {/* User Routes */}
            <Route path="/profile" element={<ProtectedRoute><TeamProfile /></ProtectedRoute>} />
            <Route path="/find-team" element={<ProtectedRoute><FindTeam /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            
            {/* Manager Route */}
            <Route path="/manager/dashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />

            {/* Super Admin Route */}
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
      <ToastContainer />
    </div>
  );
}

export default App;