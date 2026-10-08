import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
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
        // Customer -> Land directly in Profile
        navigate("/profile");
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
            <label>Email address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-danger" style={{ fontSize: "0.85rem" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-100 mt-2">
            Log in
          </button>

          {/* Quick-Fill Demo Credentials */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", textAlign: "center" }}>
              Quick Demo Accounts (Password: password123)
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => { setEmail("admin@kandypack.lk"); setPassword("password123"); setError(""); }}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => { setEmail("dispatcher@kandypack.lk"); setPassword("password123"); setError(""); }}
              >
                📋 Dispatcher
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => { setEmail("kamal.driver@kandypack.lk"); setPassword("password123"); setError(""); }}
              >
                🚚 Driver
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => { setEmail("bandara.asst@kandypack.lk"); setPassword("password123"); setError(""); }}
              >
                🤝 Assistant
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={() => { setEmail("suneth.cmb@kandypack.lk"); setPassword("password123"); setError(""); }}
              >
                🏬 Store Mgr
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
