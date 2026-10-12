import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconUser,
  IconLock,
  IconBell,
  IconCheck,
  IconAlertCircle,
  IconShield,
  IconId,
  IconMail,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react";

function Profile() {
  const [activeTab, setActiveTab] = useState("info"); // "info" | "security" | "notifications"

  // Profile data
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState("");
  const [cities, setCities] = useState([]);

  // Password update form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    email: true,
    sms: true,
    inApp: true,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, citiesRes] = await Promise.all([
        axios.get(apiUrl("/api/users/profile"), authHeader),
        axios.get(apiUrl("/api/cities")),
      ]);

      const data = profileRes.data;
      setUserData(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setCityId(data.city_id ? String(data.city_id) : "");
      setCities(citiesRes.data || []);

      if (data.notification_preferences) {
        try {
          const parsed =
            typeof data.notification_preferences === "string"
              ? JSON.parse(data.notification_preferences)
              : data.notification_preferences;
          setNotifPrefs({
            email: parsed.email ?? true,
            sms: parsed.sms ?? true,
            inApp: parsed.inApp ?? true,
          });
        } catch {
          // keep defaults
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      await axios.put(
        apiUrl("/api/users/profile"),
        {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city_id: cityId ? Number(cityId) : null,
        },
        authHeader
      );
      localStorage.setItem("name", name.trim());
      setSuccess("Personal details updated successfully.");
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setActionLoading(true);
    try {
      await axios.put(
        apiUrl("/api/users/change-password"),
        { currentPassword, newPassword },
        authHeader
      );
      setSuccess("Your password has been changed securely.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      await axios.put(
        apiUrl("/api/auth/preferences"),
        { preferences: notifPrefs },
        authHeader
      );
      setSuccess("Notification preferences saved successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update preferences.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="My Profile">
        <div className="kp-card p-4 text-center text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Loading profile details...
        </div>
      </AppLayout>
    );
  }

  const roleName = userData?.role || "Staff";
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppLayout pageTitle="User Profile">
      {/* ── Top Hero Card ────────────────────────────────────── */}
      <div className="kp-card mb-4 p-4">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div
            className="kp-avatar"
            style={{ width: "58px", height: "58px", fontSize: "1.35rem" }}
          >
            {initials}
          </div>
          <div>
            <h2 className="h4 mb-1">{name || "Kandypack User"}</h2>
            <div className="d-flex align-items-center gap-2 text-muted small">
              <span className="badge bg-primary-subtle text-primary fw-medium px-2 py-1">
                {roleName}
              </span>
              <span>•</span>
              <span className="d-inline-flex align-items-center gap-1">
                <IconMail size={14} />
                {userData?.email}
              </span>
              {userData?.license_number && (
                <>
                  <span>•</span>
                  <span className="badge bg-secondary-subtle text-secondary">
                    License: {userData.license_number}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 p-3 mb-3">
          <IconAlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2 p-3 mb-3">
          <IconCheck size={18} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <div className="d-flex gap-2 mb-3 border-bottom pb-2">
        <button
          className={`btn btn-sm d-flex align-items-center gap-2 ${
            activeTab === "info" ? "btn-primary" : "btn-light border"
          }`}
          onClick={() => {
            setActiveTab("info");
            setError("");
            setSuccess("");
          }}
        >
          <IconUser size={16} />
          <span>Personal Details</span>
        </button>
        <button
          className={`btn btn-sm d-flex align-items-center gap-2 ${
            activeTab === "security" ? "btn-primary" : "btn-light border"
          }`}
          onClick={() => {
            setActiveTab("security");
            setError("");
            setSuccess("");
          }}
        >
          <IconLock size={16} />
          <span>Security & Password</span>
        </button>
        <button
          className={`btn btn-sm d-flex align-items-center gap-2 ${
            activeTab === "notifications" ? "btn-primary" : "btn-light border"
          }`}
          onClick={() => {
            setActiveTab("notifications");
            setError("");
            setSuccess("");
          }}
        >
          <IconBell size={16} />
          <span>Notification Preferences</span>
        </button>
      </div>

      {/* ── Tab 1: Personal Details ──────────────────────────── */}
      {activeTab === "info" && (
        <div className="kp-card" style={{ maxWidth: "680px" }}>
          <h3 className="h6 mb-3 fw-bold text-uppercase text-secondary" style={{ letterSpacing: "0.5px" }}>
            Account Profile Information
          </h3>
          <form onSubmit={handleUpdateInfo}>
            <div className="mb-3">
              <label className="form-label small fw-medium">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-medium">Email Address (Read-only)</label>
              <input
                type="email"
                className="form-control bg-light text-muted"
                value={userData?.email || ""}
                disabled
              />
              <span className="form-text small" style={{ fontSize: "0.78rem" }}>
                Primary login identifier cannot be edited directly.
              </span>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-medium">Assigned System Role</label>
              <input
                type="text"
                className="form-control bg-light text-muted"
                value={roleName}
                disabled
              />
            </div>

            {/* Customer specific delivery profile fields */}
            {userData?.role_id === 6 && (
              <div className="p-3 mb-3 bg-light rounded border">
                <h4 className="h6 mb-3 d-flex align-items-center gap-2">
                  <IconMapPin size={16} className="text-primary" />
                  Default Delivery Information
                </h4>
                <div className="mb-3">
                  <label className="form-label small fw-medium">Contact Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="07X-XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium">Street Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 45 Galle Road"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-medium">Registered Delivery City</label>
                  <select
                    className="form-select"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => (
                      <option key={c.city_id} value={c.city_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Driver license number */}
            {userData?.role_id === 4 && (
              <div className="mb-3">
                <label className="form-label small fw-medium">Commercial Driver License</label>
                <input
                  type="text"
                  className="form-control bg-light text-muted"
                  value={userData.license_number || "Not assigned"}
                  disabled
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary mt-2 d-inline-flex align-items-center gap-2"
              disabled={actionLoading}
            >
              {actionLoading ? "Saving Changes..." : "Save Personal Details"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab 2: Security & Password ───────────────────────── */}
      {activeTab === "security" && (
        <div className="kp-card" style={{ maxWidth: "580px" }}>
          <h3 className="h6 mb-3 fw-bold text-uppercase text-secondary" style={{ letterSpacing: "0.5px" }}>
            Change Account Password
          </h3>
          <p className="text-muted small mb-4">
            Ensure your account is protected with a strong passphrase containing at least 8 characters.
          </p>

          <form onSubmit={handleUpdatePassword}>
            <div className="mb-3">
              <label className="form-label small fw-medium">Current Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-medium">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-medium">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-2 d-inline-flex align-items-center gap-2"
              disabled={actionLoading}
            >
              <IconLock size={16} />
              {actionLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab 3: Notification Preferences ──────────────────── */}
      {activeTab === "notifications" && (
        <div className="kp-card" style={{ maxWidth: "580px" }}>
          <h3 className="h6 mb-3 fw-bold text-uppercase text-secondary" style={{ letterSpacing: "0.5px" }}>
            Dispatch & Order Alerts
          </h3>
          <p className="text-muted small mb-4">
            Select the channels through which you wish to receive automated status updates and critical alerts.
          </p>

          <form onSubmit={handleSavePreferences}>
            <div className="d-flex flex-column gap-3 mb-4">
              <label className="d-flex align-items-start gap-3 p-3 rounded border bg-light cursor-pointer">
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  checked={notifPrefs.inApp}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, inApp: e.target.checked })
                  }
                />
                <div>
                  <div className="fw-semibold small">In-App Notifications</div>
                  <div className="text-muted small">
                    Real-time topbar notifications when orders advance or runs are scheduled.
                  </div>
                </div>
              </label>

              <label className="d-flex align-items-start gap-3 p-3 rounded border bg-light cursor-pointer">
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  checked={notifPrefs.email}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, email: e.target.checked })
                  }
                />
                <div>
                  <div className="fw-semibold small">Email Notifications</div>
                  <div className="text-muted small">
                    Daily summaries, order dispatch manifests, and shipment discrepancy alerts.
                  </div>
                </div>
              </label>

              <label className="d-flex align-items-start gap-3 p-3 rounded border bg-light cursor-pointer">
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  checked={notifPrefs.sms}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, sms: e.target.checked })
                  }
                />
                <div>
                  <div className="fw-semibold small">SMS Alerts (Mobile)</div>
                  <div className="text-muted small">
                    Immediate text alerts when the delivery driver is within 15 minutes of drop-off.
                  </div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              disabled={actionLoading}
            >
              <IconBell size={16} />
              {actionLoading ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}

export default Profile;
