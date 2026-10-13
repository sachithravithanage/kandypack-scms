import logo from "../assets/logo.png";

function AuthLayout({ children }) {
  return (
    <div className="kp-auth-shell">
      <div className="kp-auth-brand">
        <div className="kp-auth-brand-inner">
          <img src={logo} alt="Kandypack Logo" style={{ width: "90px", marginBottom: "1.2rem", borderRadius: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />
          <h1>Kandypack</h1>
          <p>
            Rail and road-based supply chain distribution — from Kandy to every
            corner of the island.

          </p>
        </div>
      </div>
      <div className="kp-auth-form">{children}</div>
    </div>
  );
}

export default AuthLayout;
