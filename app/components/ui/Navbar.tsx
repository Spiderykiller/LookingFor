import "./navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <h1 className="navbar-logo">
          <span className="navbar-logo-text">Looking</span>
          <span className="navbar-logo-accent">For.</span>
          <span className="navbar-logo-dot" />
        </h1>

        {/* Center eyebrow */}
        <span className="navbar-label">Intent City</span>

        {/* Right — live indicator */}
        <div className="navbar-live">
          <span className="navbar-live-dot" />
          <span className="navbar-live-text">Live</span>
        </div>

      </div>

      {/* Bottom accent line */}
      <div className="navbar-line" />
    </nav>
  );
}