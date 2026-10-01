function AuthLayout({ children }) {
  return (
    <div className="kp-auth-shell">
      <div className="kp-auth-brand">
        <div className="kp-auth-brand-inner">
          <div className="kp-logo-mark">K</div>
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
