import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiUrl } from "../api";

function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.registeredEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(
    location.state?.registeredSuccess
      ? "Account registered successfully! Please sign in with your credentials."
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // If already logged in, navigate straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const roleId = Number(localStorage.getItem("roleId"));
    if (token && roleId) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e, overrideEmail, overridePassword) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccessInfo("");
    const targetEmail = overrideEmail || email;
    const targetPassword = overridePassword || password;
    try {
      const res = await axios.post(apiUrl("/api/auth/login"), {
        email: targetEmail,
        password: targetPassword,
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

      // Immediate role-tailored dashboard loading for ANY role
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const testAccounts = [
    { label: "👑 Admin", email: "admin@kandypack.local" },
    { label: "📋 Dispatcher", email: "dispatcher@kandypack.local" },
    { label: "🚚 Driver", email: "kamal.driver@kandypack.lk" },
    { label: "🤝 Assistant", email: "bandara.asst@kandypack.lk" },
    { label: "🏬 Store Mgr", email: "manager@kandypack.local" },
    { label: "🛒 Customer", email: "waruni.rathnayake@kandypack.lk" },
  ];

  const handleSelectTestAccount = (accEmail) => {
    setEmail(accEmail);
    setPassword("password123");
    setError("");
    setSuccessInfo("");
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <h2 className="mb-1">Sign in</h2>
        <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
          Welcome back to Kandypack.
        </p>

        {successInfo && (
          <div className="alert alert-success p-2 small mb-3">
            {successInfo}
          </div>
        )}

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

            <div className="text-end mt-1">
              <Link
                to="/forgot-password"
                className="text-decoration-none small text-primary fw-medium"
                style={{ fontSize: "0.8rem" }}
              >
                Forgot password?
              </Link>
            </div>
          </div>
          {error && (
            <p className="text-danger small" style={{ fontSize: "0.85rem" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-100 mt-2" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
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
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              Test Accounts
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center",
              }}
            >
              {testAccounts.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    className={`btn btn-sm ${isSelected
                        ? "btn-primary shadow-sm"
                        : "btn-outline-secondary"
                      }`}
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "all 0.15s ease-in-out",
                    }}
                    onClick={() => handleSelectTestAccount(acc.email)}
                  >
                    {acc.label}
                  </button>
                );
              })}
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
