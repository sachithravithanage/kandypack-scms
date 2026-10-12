import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminInventory = lazy(() => import("./pages/AdminInventory"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const RosterSchedule = lazy(() => import("./pages/RosterSchedule"));
const DriverDelivery = lazy(() => import("./pages/DriverDelivery"));
const AdminTrainSchedule = lazy(() => import("./pages/AdminTrainSchedule"));
const DispatcherTrainLoading = lazy(
  () => import("./pages/DispatcherTrainLoading"),
);
const StoreShipmentReceipt = lazy(() => import("./pages/StoreShipmentReceipt"));
const StoreDailyDispatch = lazy(() => import("./pages/StoreDailyDispatch"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const Profile = lazy(() => import("./pages/Profile"));

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={<div className="kp-page-loading">Loading Kandypack…</div>}
      >
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
              <ProtectedRoute allowedRoles={[1]}>
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
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
