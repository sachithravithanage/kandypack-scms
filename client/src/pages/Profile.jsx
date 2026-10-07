import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";

function Profile() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    cityId: "",
  });
  const [cities, setCities] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    // Load cities for the dropdown
    axios
      .get("http://localhost:5000/api/cities")
      .then((res) => setCities(res.data))
      .catch(() => setError("Could not load cities."));

    // Load user's profile
    axios
      .get("http://localhost:5000/api/users/profile", authH)
      .then((res) => {
        const data = res.data;
        setRoleId(data.role_id);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          cityId: data.city_id || "",
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load profile data.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await axios.put(
        "http://localhost:5000/api/users/profile",
        {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city_id: form.cityId ? Number(form.cityId) : null,
        },
        authH
      );
      setSuccess("Profile updated successfully!");
      // Update local storage name if it was changed
      localStorage.setItem("name", form.name);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="My Profile">
        <p>Loading profile...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="My Profile">
      <div className="kp-card" style={{ maxWidth: "600px" }}>
        <h3 className="mb-3">Personal Information</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Full name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          
          {roleId === 6 && (
            <>
              <div className="mb-3">
                <label className="form-label">Phone number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="07X-XXX-XXXX"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Delivery address</label>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  placeholder="Street address"
                  value={form.address}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">City</label>
                <select
                  name="cityId"
                  className="form-select"
                  value={form.cityId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a city</option>
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </form>
      </div>
    </AppLayout>
  );
}

export default Profile;
