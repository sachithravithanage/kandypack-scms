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
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.user.name);
      navigate("/dashboard");
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
          <p className="mt-3 text-center" style={{ fontSize: "0.875rem" }}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}

export default Login;
