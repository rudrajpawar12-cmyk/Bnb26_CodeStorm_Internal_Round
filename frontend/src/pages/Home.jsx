import React from "react";
import {
  ShieldCheck,
  Cpu,
  Binary,
  Layers,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Terminal,
  Lock,
  Eye,
  CheckCircle2,
  FileCheck,
  Zap,
} from "lucide-react";
import ArchitectureDiagram from "../components/ArchitectureDiagram";

export default function Home({ setActivePage, onStartDemo }) {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <ShieldCheck size={14} style={{ marginRight: 6 }} className="text-cyan" />
          <span>CRYPTOGRAPHIC SUPPLY-CHAIN VERIFICATION</span>
        </div>

        <h1 className="hero-title">
          Prove What Your Software
          <br />
          <span className="hero-highlight">Is Built From.</span>
        </h1>

        <p className="hero-subtitle">
          Quorum independently reproduces software builds, compares cryptographic fingerprints,
          and exposes release inconsistencies before users have to trust them.
        </p>

        <div className="hero-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setActivePage("verify")}
          >
            <Terminal size={18} style={{ marginRight: 8 }} />
            Verify a Release
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setActivePage("how-it-works")}
          >
            How It Works
            <ArrowRight size={16} style={{ marginLeft: 8 }} />
          </button>

          <button
            className="btn btn-outline btn-lg"
            onClick={() => {
              if (onStartDemo) onStartDemo();
              setActivePage("verify");
            }}
          >
            <Zap size={16} style={{ marginRight: 8 }} className="text-cyan" />
            Launch Live Demo
          </button>
        </div>

        {/* Quick Trust Equation Strip */}
        <div className="trust-equation-strip">
          <div className="equation-item">
            <span className="equation-label">Recipe</span>
            <span className="equation-val font-mono">Source Code</span>
          </div>
          <span className="equation-operator">+</span>
          <div className="equation-item">
            <span className="equation-label">Isolated Runners</span>
            <span className="equation-val font-mono">3 Builders</span>
          </div>
          <span className="equation-operator">→</span>
          <div className="equation-item">
            <span className="equation-label">Fingerprint</span>
            <span className="equation-val font-mono">SHA-256 Hash</span>
          </div>
          <span className="equation-operator">=</span>
          <div className="equation-item">
            <span className="equation-label">Quorum</span>
            <span className="equation-val text-success font-mono">Unanimous Consensus</span>
          </div>
        </div>
      </section>

      {/* The Core Problem */}
      <section className="section-container problem-section">
        <div className="section-tag text-cyan font-mono">THE FUNDAMENTAL THREAT</div>
        <h2 className="section-heading">The Blind Trust Dilemma in Modern Software</h2>
        <p className="section-lead">
          When developers publish a release binary or npm package, users and organizations blindly trust that
          the compiled file matches the public source code. In reality, that trust link is completely unverified.
        </p>

        <div className="comparison-grid">
          <div className="comparison-card traditional-model">
            <div className="comparison-header">
              <AlertTriangle size={20} className="text-warning" />
              <h4>Conventional Release Model</h4>
            </div>
            <p className="card-subtext">Single build machine or single vendor CI pipeline.</p>

            <ul className="comparison-points">
              <li className="point-danger">
                <strong>Single Point of Failure:</strong> If the builder account, runner VM, or maintainer token is compromised, a trojanized binary is shipped.
              </li>
              <li className="point-danger">
                <strong>Stealthy Injection:</strong> Attackers don't tamper with visible GitHub PRs — they inject malicious payloads during the build step.
              </li>
              <li className="point-danger">
                <strong>Zero Consumer Recourse:</strong> End users have no independent way to prove that artifact X was actually created from commit Y.
              </li>
            </ul>
          </div>

          <div className="comparison-card quorum-model">
            <div className="comparison-header">
              <ShieldCheck size={20} className="text-success" />
              <h4>The Quorum Verification Model</h4>
            </div>
            <p className="card-subtext">Independent multi-runner consensus verification.</p>

            <ul className="comparison-points">
              <li className="point-success">
                <strong>Multiple Isolated Builders:</strong> Builder A, Builder B, and Builder C compile the source in isolated environments.
              </li>
              <li className="point-success">
                <strong>Deterministic SHA-256 Fingerprints:</strong> Builds produce cryptographic hashes of output packages to detect even single-bit variance.
              </li>
              <li className="point-success">
                <strong>Surfaced Disagreement:</strong> Discrepancies are flagged immediately as <span className="text-warning font-semibold">VERIFICATION CONFLICT</span> instead of hidden.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why Multiple Builders */}
      <section className="section-container why-builders-section">
        <div className="section-tag text-cyan font-mono">CRYPTOGRAPHIC ASSURANCE</div>
        <h2 className="section-heading">Why Multiple Independent Builders?</h2>
        <p className="section-lead">
          Trusting one builder is no better than trusting the author. True non-repudiation requires
          independent reproduction across isolated runner environments.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">
              <Cpu size={24} className="text-cyan" />
            </div>
            <h3>Environment Isolation</h3>
            <p>
              Builder A, B, and C run on distinct virtual machines with separate network contexts and ephemeral disks, preventing cross-contamination.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Binary size={24} className="text-cyan" />
            </div>
            <h3>Deterministic Artifact Hashing</h3>
            <p>
              Compiles code, standardizes file timestamps, sorts archives, and generates bit-for-bit verifiable SHA-256 fingerprints.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Layers size={24} className="text-cyan" />
            </div>
            <h3>Consensus Without Centralization</h3>
            <p>
              If all three runners produce an identical cryptographic digest, consensus reaches 100%. Any divergence triggers a security investigation.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <FileCheck size={24} className="text-cyan" />
            </div>
            <h3>Verifiable Attestation Certificate</h3>
            <p>
              Quorum exports a machine-verifiable JSON attestation with builder run signatures that package managers and auditors can inspect.
            </p>
          </div>
        </div>
      </section>

      {/* Example Attack / Tampering Scenario */}
      <section className="section-container attack-scenario-section">
        <div className="attack-scenario-card">
          <div className="scenario-header">
            <div className="scenario-badge font-mono">THREAT CASE STUDY</div>
            <h3>The Build-Time Supply Chain Attack</h3>
          </div>

          <div className="scenario-body">
            <div className="scenario-step">
              <span className="step-num">01</span>
              <div>
                <h5>Clean Public Source Code</h5>
                <p>The developer's GitHub repository looks completely pristine. All PR reviews, audits, and linting checks pass flawlessly.</p>
              </div>
            </div>

            <div className="scenario-step">
              <span className="step-num">02</span>
              <div>
                <h5>Compromised Single Build Host</h5>
                <p>An attacker uses stolen credentials or a rogue dependency script to modify the compiler output on the release server right before packaging.</p>
              </div>
            </div>

            <div className="scenario-step">
              <span className="step-num">03</span>
              <div>
                <h5>Quorum Multi-Builder Interception</h5>
                <p>
                  Quorum spins up Builder A, B, and C. Because the malicious payload only existed on the attacker's compromised server, Quorum's isolated builders reproduce the genuine binary.
                </p>
                <div className="scenario-verdict-box">
                  <span className="text-warning font-semibold">Result:</span>
                  {" "}Quorum detects hash mismatch between claimed release and independent consensus, alerting users <em>before</em> installation.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Architecture Section */}
      <section className="section-container">
        <ArchitectureDiagram />
      </section>

      {/* Final Call to Action */}
      <section className="final-cta-section">
        <h2 className="cta-heading">Ready to Prove What Your Software is Built From?</h2>
        <p className="cta-subtext">
          Run your first multi-builder release verification in seconds. No complex local setups required.
        </p>

        <div className="cta-buttons">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setActivePage("verify")}
          >
            Start Release Verification
            <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setActivePage("history")}
          >
            View Verification Ledger
          </button>
        </div>
      </section>
    </div>
  );
}
