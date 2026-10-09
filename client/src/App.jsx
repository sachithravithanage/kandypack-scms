import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminInventory from "./pages/AdminInventory";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import RosterSchedule from "./pages/RosterSchedule";
import DriverDelivery from "./pages/DriverDelivery";
import AdminTrainSchedule from "./pages/AdminTrainSchedule";
import DispatcherTrainLoading from "./pages/DispatcherTrainLoading";
import StoreShipmentReceipt from "./pages/StoreShipmentReceipt";
import StoreDailyDispatch from "./pages/StoreDailyDispatch";
import MyOrders from "./pages/MyOrders";
import NewOrder from "./pages/NewOrder";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected portals with role-based restrictions */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roster"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <RosterSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5]}>
              <DriverDelivery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rail/schedules"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3]}>
              <AdminTrainSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trains"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3]}>
              <AdminTrainSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rail/loading"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <DispatcherTrainLoading />
            </ProtectedRoute>
          }
        />
        <Route
          path="/store/receipt"
          element={
            <ProtectedRoute allowedRoles={[1, 3]}>
              <StoreShipmentReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/store/dispatch"
          element={
            <ProtectedRoute allowedRoles={[1, 3]}>
              <StoreDailyDispatch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute allowedRoles={[1, 3]}>
              <AdminInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5, 6]}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 6]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 6]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute allowedRoles={[1, 6]}>
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5, 6]}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5, 6]}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
