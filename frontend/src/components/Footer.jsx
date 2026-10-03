import React from "react";
import { ShieldCheck, GitFork, Lock, Terminal } from "lucide-react";

export default function Footer({ setActivePage }) {
  return (
    <footer className="footer-container">
      <div className="footer-inner">
        <div className="footer-col brand-col">
          <div className="flex-align mb-3">
            <ShieldCheck size={20} className="text-cyan" style={{ marginRight: 8 }} />
            <span className="footer-brand font-bold">
              QUO<span className="text-cyan">RUM</span>
            </span>
          </div>
          <p className="footer-tagline">
            "Don't Trust the Binary. Trust the Builders."
          </p>
          <p className="footer-subtext">
            Independent multi-environment cryptographic build reproduction for transparent, tamper-evident software releases.
          </p>
        </div>

        <div className="footer-col">
          <h5 className="footer-col-title">Platform</h5>
          <ul className="footer-links">
            <li>
              <button onClick={() => setActivePage("verify")}>Verify Release</button>
            </li>
            <li>
              <button onClick={() => setActivePage("how-it-works")}>How It Works</button>
            </li>
            <li>
              <button onClick={() => setActivePage("architecture")}>Architecture</button>
            </li>
            <li>
              <button onClick={() => setActivePage("history")}>Verification Ledger</button>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h5 className="footer-col-title">Security Tenets</h5>
          <ul className="footer-links-static">
            <li className="flex-align">
              <Lock size={13} style={{ marginRight: 6 }} className="text-cyan" />
              Source Code is the Recipe
            </li>
            <li className="flex-align">
              <Terminal size={13} style={{ marginRight: 6 }} className="text-cyan" />
              Isolated Build Runners
            </li>
            <li className="flex-align">
              <ShieldCheck size={13} style={{ marginRight: 6 }} className="text-cyan" />
              Cryptographic SHA-256 Hashes
            </li>
            <li className="flex-align">
              <GitFork size={13} style={{ marginRight: 6 }} className="text-cyan" />
              Surfaced Disagreement
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Quorum Software Verification. Built for Hackathon demonstration.</p>
        <p className="footer-disclaimer">
          Quorum provides evidence of reproducible compilation from claimed source code. It does not warrant runtime security against logic vulnerabilities in the source code itself.
        </p>
      </div>
    </footer>
  );
}
