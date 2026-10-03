import React from "react";
import {
  BookOpen,
  FileCode,
  Box,
  Fingerprint,
  Cpu,
  ShieldCheck,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Terminal,
} from "lucide-react";

export default function HowItWorks({ setActivePage }) {
  const pillars = [
    {
      title: "Source Code = The Recipe",
      icon: FileCode,
      tag: "INPUT",
      description:
        "The human-readable instructions written by programmers. In public GitHub repositories, everyone can read the recipe.",
    },
    {
      title: "Artifact = The Finished Product",
      icon: Box,
      tag: "OUTPUT",
      description:
        "The compiled binary, executable, or distribution bundle (.tar.gz, .exe, .js) that actually runs on user devices.",
    },
    {
      title: "Hash = The Digital Fingerprint",
      icon: Fingerprint,
      tag: "DIGEST",
      description:
        "A SHA-256 cryptographic calculation. If two files are identical down to the last byte, their hashes match perfectly.",
    },
    {
      title: "Builder = The Independent Kitchen",
      icon: Cpu,
      tag: "RUNNER",
      description:
        "An isolated, clean-slate environment (Ubuntu runner, container) that takes the recipe and prepares the artifact from scratch.",
    },
    {
      title: "Quorum = Multi-Party Agreement",
      icon: ShieldCheck,
      tag: "CONSENSUS",
      description:
        "Mathematical consensus. Instead of trusting one machine, we check if multiple independent builders got the exact same fingerprint.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Developer Commits Source Code",
      desc: "Code is pushed to a public version control system like GitHub under a specific cryptographic commit SHA (e.g., a82f91c).",
    },
    {
      step: "02",
      title: "User or Auditor Requests Verification",
      desc: "Before installing an executable or pulling a release, a developer or CI pipeline provides the repository and target commit to Quorum.",
    },
    {
      step: "03",
      title: "Quorum Dispatches Isolated Builders",
      desc: "Quorum provisions Builder A, Builder B, and Builder C on distinct GitHub Actions runners with isolated execution contexts.",
    },
    {
      step: "04",
      title: "Independent Clean Builds",
      desc: "Each builder downloads only the specified commit, installs dependencies deterministically, and builds the distribution bundle.",
    },
    {
      step: "05",
      title: "Cryptographic Fingerprint Calculation",
      desc: "Output binaries are normalized (standardized timestamps and permissions) and hashed using SHA-256 to create an unforgeable fingerprint.",
    },
    {
      step: "06",
      title: "Quorum Consensus Engine Comparison",
      desc: "Quorum gathers all three fingerprints. If 3/3 match, Quorum issues a VERIFIED verdict. If any hash differs, Quorum flags a CONFLICT.",
    },
  ];

  return (
    <div className="how-it-works-page">
      {/* Header */}
      <div className="hiw-header">
        <div className="hiw-badge font-mono">
          <BookOpen size={14} className="text-cyan" style={{ marginRight: 6 }} />
          <span>REPRODUCIBLE BUILD PRIMER</span>
        </div>
        <h1 className="hiw-title">How Quorum Works</h1>
        <p className="hiw-subtitle">
          A plain-English explanation of why release verification matters, how independent reproduction works,
          and why multi-builder consensus eliminates single points of failure.
        </p>
      </div>

      {/* The 5 Pillars of Quorum */}
      <section className="pillars-section">
        <h2 className="section-title">The 5 Core Concepts</h2>
        <p className="section-subtitle">
          Understanding software release security begins with five intuitive concepts:
        </p>

        <div className="pillars-grid">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="pillar-card">
                <div className="pillar-header">
                  <div className="pillar-icon-box">
                    <Icon size={22} className="text-cyan" />
                  </div>
                  <span className="badge badge-sm badge-cyan font-mono">{pillar.tag}</span>
                </div>
                <h3 className="pillar-title">{pillar.title}</h3>
                <p className="pillar-desc">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* The 6-Step Verification Flow */}
      <section className="steps-flow-section">
        <h2 className="section-title">The Complete Verification Lifecycle</h2>
        <p className="section-subtitle">
          From source commit to signed multi-party cryptographic attestation:
        </p>

        <div className="steps-timeline">
          {steps.map((st, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-marker font-mono">{st.step}</div>
              <div className="timeline-content">
                <h4 className="timeline-title">{st.title}</h4>
                <p className="timeline-desc">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disagreement is Surfaced Section */}
      <section className="disagreement-section">
        <div className="disagreement-card">
          <div className="flex-align mb-3">
            <AlertTriangle size={24} className="text-warning" style={{ marginRight: 10 }} />
            <h3 className="text-warning">Why Quorum Surfaces Disagreement</h3>
          </div>
          <p className="mb-3">
            In traditional systems, if a build behaves strangely, errors are swept under the rug or automated retries obscure the anomaly.
          </p>
          <p>
            Quorum takes the opposite approach: <strong>Disagreement is evidence.</strong> If Builder A and Builder B produce hash <code className="font-mono">ABC123</code>, but Builder C produces <code className="font-mono">XYZ789</code>, Quorum immediately flags a <span className="text-warning font-semibold">VERIFICATION CONFLICT</span>.
          </p>
          <div className="quote-box">
            "A different hash does not automatically mean malware — it indicates non-deterministic behavior, compromised build environments, or hidden dependencies requiring security investigation."
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center mt-5 mb-5">
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setActivePage("verify")}
        >
          <Terminal size={18} style={{ marginRight: 8 }} />
          Try Verifying a Release Now
        </button>
      </div>
    </div>
  );
}
