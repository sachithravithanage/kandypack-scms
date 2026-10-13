import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiUrl } from "../api";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    cityId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Load the city list once, when the page first opens
  useEffect(() => {
    axios
      .get(apiUrl("/api/cities"))
      .then((res) => setCities(res.data))
      .catch(() => setError("Could not load cities. Is the server running?"));
  }, []);

  // One handler for every input: the input's "name" attribute decides which field changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Password must contain both letters and numbers.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please provide a contact phone number.");
      return;
    }
    if (!form.address.trim()) {
      setError("Please enter your delivery street address.");
      return;
    }
    if (!form.cityId) {
      setError("Please select your city for delivery routing.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(apiUrl("/api/auth/register"), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
        cityId: Number(form.cityId),
      });
      // Registered successfully — navigate back to sign in with success feedback and pre-filled email
      navigate("/", {
        state: {
          registeredEmail: form.email.trim().toLowerCase(),
          registeredSuccess: true,
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <h2 className="mb-2">Create customer account</h2>
        <p className="text-muted mb-4" style={{ fontSize: "0.875rem" }}>
          Register for retail supply ordering and island-wide delivery.
        </p>

        {error && (
          <div className="alert alert-danger p-2 small mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Full name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="e.g. John Perera"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Email address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="e.g. john@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Password</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control"
                placeholder="Min. 8 characters (letters & numbers)"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Must be at least 8 characters with both letters and numbers.
            </span>
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Confirm password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              className="form-control"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Phone number</label>
            <input
              type="text"
              name="phone"
              className="form-control"
              placeholder="e.g. 077-123-4567"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>Delivery address</label>
            <input
              type="text"
              name="address"
              className="form-control"
              placeholder="Store / Home street address"
              value={form.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>City destination</label>
            <select
              name="cityId"
              className="form-select"
              value={form.cityId}
              onChange={handleChange}
              required
            >
              <option value="">Select a delivery city</option>
              {cities.map((c) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 mt-2"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Register"}
          </button>

          <p className="mt-3 text-center" style={{ fontSize: "0.875rem" }}>
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}

export default Register;
