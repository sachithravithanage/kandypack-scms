import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiUrl } from "../api";
import {
  IconMail,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
} from "@tabler/icons-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setDevResetUrl("");
    setLoading(true);

    try {
      const res = await axios.post(apiUrl("/api/auth/forgot-password"), { email });
      setSuccessMsg(
        res.data?.message ||
          "If an account with that email exists, reset instructions have been dispatched."
      );
      if (res.data?.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not process password reset. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="kp-auth-card">
        <h2 className="mb-1">Reset Password</h2>
        <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
          Enter the email address registered with your Kandypack account to receive a secure password reset link.
        </p>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small mb-3">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success d-flex align-items-start gap-2 p-3 small mb-3">
            <IconCheck size={18} className="mt-1 flex-shrink-0" />
            <div>
              <div className="fw-medium">{successMsg}</div>
              <div className="text-muted mt-1" style={{ fontSize: "0.8rem" }}>
                The link is valid for 15 minutes. Please check your inbox or spam folder.
              </div>
            </div>
          </div>
        )}

        {/* Development / Evaluation Demo Shortcut for TAs */}
        {devResetUrl && (
          <div
            className="p-3 mb-3 rounded"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px dashed var(--color-warning-border, #f59e0b)",
            }}
          >
            <div className="d-flex align-items-center gap-2 text-warning-emphasis fw-semibold small mb-2">
              <IconExternalLink size={16} />
              <span>Evaluation Helper:</span>
            </div>
            <p className="small mb-2" style={{ color: "#78350f", fontSize: "0.82rem" }}>
              Since live SMTP email dispatch requires production mail configuration, you can click below to directly test the password reset flow:
            </p>
            {(() => {
              let targetPath = devResetUrl;
              try {
                if (devResetUrl.startsWith("http")) {
                  const urlObj = new URL(devResetUrl);
                  targetPath = urlObj.pathname + urlObj.search;
                }
              } catch {}
              return (
                <Link
                  to={targetPath}
                  className="btn btn-sm btn-warning w-100 fw-medium"
                  style={{ fontSize: "0.82rem" }}
                >
                  Open Password Reset Page Now
                </Link>
              );
            })()}
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: "0.875rem" }}>
                Email address
              </label>
              <div className="position-relative">
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@kandypack.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <>
                  <IconMail size={18} />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 text-center border-top">
          <Link
            to="/"
            className="text-decoration-none d-inline-flex align-items-center gap-1 small text-secondary"
          >
            <IconArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
