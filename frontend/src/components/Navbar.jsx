import React, { useState } from "react";
import { ShieldCheck, Menu, X, Terminal, Cpu } from "lucide-react";

export default function Navbar({ activePage, setActivePage, onStartDemo }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "verify", label: "Verify" },
    { id: "how-it-works", label: "How It Works" },
    { id: "architecture", label: "Architecture" },
    { id: "history", label: "History" },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div className="brand" onClick={() => handleNavClick("home")} style={{ cursor: "pointer" }}>
          <div className="brand-icon-wrapper">
            <ShieldCheck className="brand-shield" size={24} />
          </div>
          <div className="brand-text">
            QUO<span className="brand-highlight">RUM</span>
          </div>
          <span className="brand-badge">v1.0</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activePage === item.id ? "active" : ""}`}
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="nav-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (onStartDemo) onStartDemo();
              setActivePage("verify");
            }}
          >
            <Cpu size={15} style={{ marginRight: 6 }} />
            Try Demo
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleNavClick("verify")}
          >
            <Terminal size={15} style={{ marginRight: 6 }} />
            Verify Release
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <div className="mobile-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-link ${activePage === item.id ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mobile-actions">
            <button
              className="btn btn-secondary w-full"
              onClick={() => {
                if (onStartDemo) onStartDemo();
                handleNavClick("verify");
              }}
            >
              <Cpu size={16} style={{ marginRight: 6 }} />
              Try Demo
            </button>

            <button
              className="btn btn-primary w-full"
              onClick={() => handleNavClick("verify")}
            >
              <Terminal size={16} style={{ marginRight: 6 }} />
              Verify Release
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
