import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";

function Settings() {
  const [preferences, setPreferences] = useState({ sms: true, email: true, inApp: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    // Fetch user preferences
    axios
      .get(apiUrl("/api/auth/preferences"), { ...authH, params: { userId } })
      .then((res) => {
        const prefs = res.data.preferences;
        if (prefs) {
          try {
            const parsed = JSON.parse(prefs);
            setPreferences(parsed);
          } catch (e) {
            // keep defaults
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await axios.put(
        apiUrl("/api/auth/preferences"),
        { preferences: JSON.stringify(preferences) },
        authH
      );
      setMessage("Preferences saved successfully!");
    } catch (err) {
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: checked }));
  };

  return (
    <AppLayout pageTitle="Settings">
      <div className="kp-card" style={{ maxWidth: "600px" }}>
        <h3 style={{ marginTop: 0 }}>Notification Preferences</h3>
        <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Choose how you want to receive critical alerts from Kandypack SCMS.
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-check" style={{ marginBottom: "1rem" }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-inapp"
                name="inApp"
                checked={preferences.inApp}
                onChange={handleChange}
                disabled
              />
              <label className="form-check-label" htmlFor="pref-inapp" style={{ marginLeft: "0.5rem" }}>
                <strong>In-App Notifications</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Receive alerts in the web dashboard (Cannot be disabled).
                </p>
              </label>
            </div>

            <div className="form-check" style={{ marginBottom: "1rem" }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-sms"
                name="sms"
                checked={preferences.sms}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="pref-sms" style={{ marginLeft: "0.5rem" }}>
                <strong>SMS Text Messages</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Receive immediate text alerts for critical incidents and deliveries.
                </p>
              </label>
            </div>

            <div className="form-check" style={{ marginBottom: "1.5rem" }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-email"
                name="email"
                checked={preferences.email}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="pref-email" style={{ marginLeft: "0.5rem" }}>
                <strong>Email Summaries</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Receive automated end-of-day reports.
                </p>
              </label>
            </div>

            {message && (
              <div className={`alert ${message.includes("success") ? "alert-success" : "alert-danger"}`} style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                {message}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

export default Settings;
