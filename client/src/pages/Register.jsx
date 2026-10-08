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
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post(apiUrl("/api/auth/register"), {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        cityId: Number(form.cityId),
      });
      navigate("/"); // registered successfully, so go to the login page
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <h2 className="mb-3">Create a customer account</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Full name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Email address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-control"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Phone number</label>
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
            <label>Delivery address</label>
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
            <label>City</label>
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
          {error && <p className="text-danger">{error}</p>}
          <button type="submit" className="btn btn-primary w-100">
            Register
          </button>
          <p className="mt-3">
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}

export default Register;
