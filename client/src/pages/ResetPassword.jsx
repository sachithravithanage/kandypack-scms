import { useState } from "react";
import axios from "axios";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiUrl } from "../api";
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconAlertCircle,
  IconArrowLeft,
  IconShieldLock,
} from "@tabler/icons-react";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token || !email) {
      setError("This password reset link is invalid or missing required parameters.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(apiUrl("/api/auth/reset-password"), {
        token,
        email,
        newPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to reset password. The link may have expired (15-min limit) or already been used."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}
          >
            <IconShieldLock size={22} />
          </div>
          <h2 className="mb-0 fs-4">New Password</h2>
        </div>
        <p className="text-muted mb-4" style={{ fontSize: "0.875rem" }}>
          {email ? (
            <>
              Resetting password for: <strong className="text-dark">{email}</strong>
            </>
          ) : (
            "Enter a strong replacement password for your account."
          )}
        </p>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small mb-3">
            <IconAlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-3">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
            >
              <IconCheck size={36} stroke={2.5} />
            </div>
            <h4 className="h5 mb-2">Password Updated!</h4>
            <p className="text-muted small mb-4">
              Your password has been changed securely. You can now sign in using your new credentials.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn btn-primary w-100"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: "0.875rem" }}>
                New Password
              </label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontSize: "0.875rem" }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Re-type your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="p-2 mb-3 rounded bg-light border small text-muted" style={{ fontSize: "0.78rem" }}>
              Password must be at least 8 characters long.
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span>Saving new password...</span>
                </>
              ) : (
                <>
                  <IconLock size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>

            <div className="mt-4 pt-3 text-center border-top">
              <Link
                to="/"
                className="text-decoration-none d-inline-flex align-items-center gap-1 small text-secondary"
              >
                <IconArrowLeft size={16} />
                <span>Cancel and return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
