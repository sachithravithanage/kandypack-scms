import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/roster" element={<RosterSchedule />} />
        <Route path="/delivery" element={<DriverDelivery />} />
        <Route path="/rail/schedules" element={<AdminTrainSchedule />} />
        <Route path="/admin/trains" element={<AdminTrainSchedule />} />
        <Route path="/rail/loading" element={<DispatcherTrainLoading />} />
        <Route path="/store/receipt" element={<StoreShipmentReceipt />} />
        <Route path="/store/dispatch" element={<StoreDailyDispatch />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
