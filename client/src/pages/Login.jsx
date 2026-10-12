import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiUrl } from "../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // If already logged in, navigate straight to role home
  useEffect(() => {
    const token = localStorage.getItem("token");
    const roleId = Number(localStorage.getItem("roleId"));
    if (token && roleId) {
      if (roleId === 4 || roleId === 5) {
        navigate("/delivery");
      } else if (roleId === 2) {
        navigate("/roster");
      } else if (roleId === 6) {
        navigate("/orders");
      } else {
        navigate("/dashboard");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(apiUrl("/api/auth/login"), {
        email,
        password,
      });
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("name", user.name);
      localStorage.setItem("roleId", user.roleId);

      const roleMap = {
        1: "Administrator",
        2: "Dispatcher",
        3: "Regional Store Manager",
        4: "Driver",
        5: "Assistant",
        6: "Customer",
      };
      localStorage.setItem("roleName", user.role || roleMap[user.roleId] || "Staff");

      // Smart role-based landing redirection
      if (user.roleId === 4 || user.roleId === 5) {
        // Driver or Assistant -> Land directly in Delivery Runs portal
        navigate("/delivery");
      } else if (user.roleId === 2) {
        // Dispatcher -> Land directly in Roster Schedule portal
        navigate("/roster");
      } else if (user.roleId === 6) {
        // Customer -> Land directly in My Orders portal
        navigate("/orders");
      } else {
        // Admin or Store Manager -> Dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <h2 className="mb-1">Sign in</h2>
        <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
          Welcome back to Kandypack.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "0.875rem" }}>
              Email address
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. admin@kandypack.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0" style={{ fontSize: "0.875rem" }}>
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-decoration-none small text-primary fw-medium"
                style={{ fontSize: "0.8rem" }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>
          {error && (
            <p className="text-danger small" style={{ fontSize: "0.85rem" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-100 mt-2">
            Log in
          </button>

          {/* Quick-Fill Demo Credentials for Grading / Evaluation */}
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <p
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              TA Evaluation Credentials (Password: Password123!)
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("admin@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("dispatcher@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                📋 Dispatcher
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("driver@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                🚚 Driver
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("assistant@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                🤝 Assistant
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("manager@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                🏬 Store Mgr
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => {
                  setEmail("customer1@kandypack.local");
                  setPassword("Password123!");
                  setError("");
                }}
              >
                🛒 Customer
              </button>
            </div>
          </div>

          <p className="mt-3 text-center" style={{ fontSize: "0.875rem" }}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </AuthLayout>

  );
}

export default Login;
