import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  ShieldAlert,
  RotateCcw,
  Copy,
  Check,
  X,
  Fingerprint,
  Lock,
  HelpCircle,
  Info,
  ExternalLink,
  GitBranch,
} from "lucide-react";

export default function ResultDashboard({
  result,
  onReset,
  onSimulateTamper,
  isTampering = false,
}) {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [copiedAttestation, setCopiedAttestation] = useState(false);

  if (!result) return null;

  const verdict = result.result || "VERIFIED";

  const isSourceMode =
    result.verificationMode === "Source Reproducibility" ||
    result.projectConfig?.verificationMode === "Source Reproducibility" ||
    result.projectConfig?.artifactPath === "N/A" ||
    result.artifactPath === "N/A";

  const isVerified = verdict === "VERIFIED";
  const isConflict = verdict === "VERIFICATION CONFLICT" || verdict === "VERIFICATION_CONFLICT";
  const isNoConsensus = verdict === "NO CONSENSUS" || verdict === "NO_CONSENSUS";
  const isReleaseMatch = verdict === "RELEASE MATCH";
  const isReleaseMismatch = verdict === "RELEASE MISMATCH" || verdict === "RELEASE FAILED VERIFICATION";
  const isNotVerifiable = verdict === "NOT VERIFIABLE";
  const isBuildFailed = verdict === "BUILD FAILED";

  const isDemo = Boolean(
    result.mode?.includes("DEMO") ||
    result.isTamperedDemo ||
    result.demoConflict ||
    result.isDemoHistory
  );

  const cleanRepo = (result.repository || "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "");
  const sourceRepoUrl = result.htmlUrl || `https://github.com/${cleanRepo}`;
  const fullCommitSha = result.commit || "UNKNOWN";

  const handleCopyAttestation = () => {
    if (!result.attestation) return;
    navigator.clipboard.writeText(JSON.stringify(result.attestation, null, 2));
    setCopiedAttestation(true);
    setTimeout(() => setCopiedAttestation(false), 2000);
  };

  const getBorderClass = () => {
    if (isVerified || isReleaseMatch) return "border-emerald";
    if (isConflict) return "border-amber";
    if (isNoConsensus) return "border-orange";
    if (isReleaseMismatch || isBuildFailed) return "border-rose";
    if (isNotVerifiable) return "border-slate";
    return "border-slate";
  };

  return (
    <div className={`result-dashboard-card ${getBorderClass()}`}>
      {/* Top Banner / Verdict */}
      <div className="verdict-banner">
        <div className="verdict-title-col">
          <div className="verdict-label-row">
            <span className="verdict-tag font-mono">QUORUM CONSENSUS VERDICT</span>
            {isDemo && (
              <span className="demo-conflict-badge font-mono">
                ⚠️ DEMO — SIMULATED RESULT
              </span>
            )}
          </div>

          <h2 className="verdict-heading">
            {isVerified && (
              <span className="text-success flex-align">
                <CheckCircle2 size={32} style={{ marginRight: 12 }} />
                VERIFIED REPRODUCIBLE ARTIFACT
              </span>
            )}
            {isReleaseMatch && (
              <span className="text-success flex-align">
                <CheckCircle2 size={32} style={{ marginRight: 12 }} />
                RELEASE MATCH
              </span>
            )}
            {isConflict && (
              <span className="text-warning flex-align">
                <AlertTriangle size={32} style={{ marginRight: 12 }} />
                VERIFICATION CONFLICT
              </span>
            )}
            {isNoConsensus && (
              <span className="text-orange flex-align">
                <AlertTriangle size={32} style={{ marginRight: 12 }} />
                NO CONSENSUS
              </span>
            )}
            {isReleaseMismatch && (
              <span className="text-danger flex-align">
                <XCircle size={32} style={{ marginRight: 12 }} />
                RELEASE MISMATCH
              </span>
            )}
            {isNotVerifiable && (
              <span className="text-muted flex-align">
                <HelpCircle size={32} style={{ marginRight: 12 }} />
                NOT VERIFIABLE
              </span>
            )}
            {isBuildFailed && (
              <span className="text-danger flex-align">
                <XCircle size={32} style={{ marginRight: 12 }} />
                BUILD FAILED
              </span>
            )}
          </h2>

          <p className="verdict-explanation">
            {isVerified && (
              <>
                All three isolated builders reproduced the same artifact from the same immutable source commit.
              </>
            )}
            {isReleaseMatch && (
              <>
                The published release artifact matches the independently reproduced artifact across all builders.
              </>
            )}
            {isConflict && (
              <>
                Builder outputs differ for the same immutable source commit. Two builders agreed while one diverged.
              </>
            )}
            {isNoConsensus && (
              <>
                All builders produced divergent fingerprints for the same immutable source commit.
              </>
            )}
            {isReleaseMismatch && (
              <>
                The published release artifact does not match the independently reproduced artifact.
              </>
            )}
            {isNotVerifiable && (
              <>
                Quorum could not establish a reproducible build for this repository. {result.consensus?.message || result.stepMessage}
              </>
            )}
            {isBuildFailed && (
              <>
                Reproducibility could not be established because one or more builders failed.
              </>
            )}
          </p>
        </div>

        {/* Score Radial / Badge */}
        {!isNotVerifiable && (
          <div className="verdict-score-box">
            <div className="score-number font-mono">
              {result.consensus?.consensusRatio || "3/3"}
            </div>
            <div className="score-label">Builder Consensus</div>
            <div className={`score-percentage font-mono ${isVerified || isReleaseMatch ? "text-success" : isConflict ? "text-warning" : "text-danger"}`}>
              {result.consensus?.consensusPercentage ?? 100}% Agreement
            </div>
          </div>
        )}
      </div>

      {/* Audit Trail: SOURCE & IMMUTABLE COMMIT (Requirement 12) */}
      <div className="audit-source-banner">
        <div className="audit-field">
          <span className="audit-label">SOURCE</span>
          <a
            href={sourceRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="audit-link font-mono"
          >
            {sourceRepoUrl}
            <ExternalLink size={13} style={{ marginLeft: 6 }} />
          </a>
        </div>
        <div className="audit-field mt-2">
          <span className="audit-label">IMMUTABLE COMMIT</span>
          <span className="audit-commit font-mono text-cyan">
            <GitBranch size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            {fullCommitSha}
          </span>
        </div>
      </div>

      {/* Consensus Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-cell">
          <span className="metric-header">Normalized Repository</span>
          <span className="metric-value font-mono font-semibold">{cleanRepo}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-header">Resolved Source Commit</span>
          <span className="metric-value font-mono text-cyan">
            {fullCommitSha.slice(0, 10)}
          </span>
        </div>

        <div className="metric-cell">
          <span className="metric-header">Build Integrity</span>
          <span className={`metric-value font-semibold ${isVerified || isReleaseMatch ? "text-success" : isConflict ? "text-warning" : isNotVerifiable ? "text-muted" : "text-danger"}`}>
            {isVerified || isReleaseMatch ? "REPRODUCIBLE (100%)" : isConflict ? "DIVERGENT (66%)" : isNotVerifiable ? "UNSUPPORTED" : "FAILED / DIVERGENT"}
          </span>
        </div>

        <div className="metric-cell">
          <span className="metric-header">Cryptographic Attestation</span>
          <span className="metric-value text-cyan flex-align">
            <Lock size={14} style={{ marginRight: 5 }} />
            {result.attestation?.certificateId || (isVerified || isReleaseMatch ? "GENERATED" : "NOT ISSUED")}
          </span>
        </div>
      </div>

      {/* Agreed Fingerprint Display / Cryptographic Attestation (Requirement 14) */}
      {result.consensus?.agreedHash && (
        <div className="consensus-hash-bar">
          <div className="consensus-hash-header">
            <span className="hash-bar-title flex-align">
              <Fingerprint size={16} style={{ marginRight: 6 }} className="text-cyan" />
              {isSourceMode ? "Source SHA-256 Fingerprint" : "Canonical Artifact Fingerprint (SHA-256)"}
            </span>
            <span className="badge badge-sm badge-cyan font-mono">
              {isSourceMode ? "Canonical Source Manifest Digest" : "Canonical Manifest Digest"}
            </span>
          </div>
          <div className="consensus-hash-code font-mono">
            {result.consensus.agreedHash}
          </div>
          <div className="crypto-attestation-note">
            <Lock size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />
            <strong>Cryptographic Fingerprint:</strong> Calculated via SHA-256 over canonical deterministic manifest. Represents bitwise artifact reproducibility across isolated runners, not a guarantee of source safety.
          </div>
        </div>
      )}

      {/* Claimed Release Hash Comparison (Requirement 15) */}
      {result.claimedHash && (
        <div className={`release-comparison-card ${result.result === "RELEASE MATCH" ? "release-match" : "release-mismatch"}`}>
          <div className="flex-between">
            <span className="font-semibold text-white">Claimed Release Artifact Comparison</span>
            <span className={`badge ${result.result === "RELEASE MATCH" ? "badge-success" : "badge-danger"} font-mono`}>
              {result.result === "RELEASE MATCH" ? "RELEASE MATCH" : "RELEASE MISMATCH"}
            </span>
          </div>
          <div className="release-hash-row font-mono mt-2">
            <span className="text-muted">Claimed Hash:</span> {result.claimedHash}
          </div>
          <div className="release-hash-row font-mono">
            <span className="text-muted">Reproduced Hash:</span> {result.consensus?.agreedHash || "N/A"}
          </div>
        </div>
      )}

      {/* Builder Hash Debug Section (Requirement 12 & 10) */}
      {result.builders && result.builders.length > 0 && (
        <div className="builder-debug-section">
          <div className="debug-header">
            <Fingerprint size={16} className="text-cyan" style={{ marginRight: 6 }} />
            <span className="font-semibold text-white">
              {isSourceMode
                ? "Builder Source Fingerprint Audit & Verification Comparison"
                : "Builder Fingerprint Audit & Verification Comparison"}
            </span>
          </div>

          <div className="debug-builders-grid">
            {result.builders.map((b) => {
              const hasFailed = b.status === "failed" || b.status === "error";
              return (
                <div key={b.name} className="debug-builder-card font-mono">
                  <div className="flex-between mb-2">
                    <span className="debug-builder-name text-white font-bold">{b.name}</span>
                    <span className={`badge badge-sm ${hasFailed ? "badge-danger" : b.status === "conflict" ? "badge-warning" : "badge-success"}`}>
                      {hasFailed ? "FAILED" : b.status === "conflict" ? "CONFLICT" : "SUCCESS"}
                    </span>
                  </div>

                  <div className="debug-field">
                    <span className="debug-label">Status:</span>{" "}
                    <span className={hasFailed ? "text-danger font-semibold" : "text-white"}>
                      {hasFailed ? "FAILED" : "SUCCESS"}
                    </span>
                  </div>

                  <div className="debug-field">
                    <span className="debug-label">Job ID:</span>{" "}
                    <span className="text-white">{b.jobId || "N/A"}</span>
                  </div>

                  <div className="debug-field">
                    <span className="debug-label">Workflow Run ID:</span>{" "}
                    <span className="text-white">{b.workflowRunId || result.workflowRunId || "N/A"}</span>
                  </div>

                  <div className="debug-field">
                    <span className="debug-label">Commit:</span>{" "}
                    <span className="text-cyan">{fullCommitSha.slice(0, 10)}</span>
                  </div>

                  <div className="debug-field">
                    <span className="debug-label">{isSourceMode ? "Artifact Dir:" : "Artifact:"}</span>{" "}
                    <span>{result.projectConfig?.artifactPath || b.artifactPath || (isSourceMode ? "N/A" : "dist")}</span>
                  </div>

                  <div className="debug-field mt-2">
                    <span className="debug-label">
                      {isSourceMode ? "Source Fingerprint:" : "Artifact SHA-256 Fingerprint:"}
                    </span>
                    {hasFailed || !b.hash ? (
                      <div className="debug-hash text-danger font-bold">
                        NOT AVAILABLE
                      </div>
                    ) : (
                      <div className={`debug-hash ${b.status === "conflict" ? "text-warning" : "text-cyan"}`}>
                        {b.hash}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hash comparison matrix (Requirement 12) */}
          {result.hashComparison && (
            <div className="debug-comparison-strip font-mono">
              <span className="comparison-title font-bold text-white">Hash comparison:</span>
              <span className="comp-item">
                A == B:{" "}
                <strong className={result.hashComparison.aEqualsB ? "text-success" : "text-danger"}>
                  {result.hashComparison.aEqualsB ? "YES" : "NO"}
                </strong>
              </span>
              <span className="comp-item">
                A == C:{" "}
                <strong className={result.hashComparison.aEqualsC ? "text-success" : "text-danger"}>
                  {result.hashComparison.aEqualsC ? "YES" : "NO"}
                </strong>
              </span>
              <span className="comp-item">
                B == C:{" "}
                <strong className={result.hashComparison.bEqualsC ? "text-success" : "text-danger"}>
                  {result.hashComparison.bEqualsC ? "YES" : "NO"}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Security Limitation Note (Requirement 13 & 31) */}
      <div className="security-notice-card">
        <Info size={16} className="text-cyan" style={{ flexShrink: 0, marginTop: 2 }} />
        <span className="security-notice-text">
          <strong>Important Security Principle:</strong> Quorum verifies reproducibility of software builds across independent environments. A successful verification confirms that multiple builders produced identical outputs from the same source code; it does not claim that the source code is free from vulnerabilities, backdoors, or malicious logic.
        </span>
      </div>

      {/* Dashboard Actions */}
      <div className="dashboard-actions">
        {result.attestation && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowEvidenceModal(true)}
          >
            <FileCode size={16} style={{ marginRight: 6 }} />
            View Cryptographic Evidence
          </button>
        )}

        {!result.isTamperedDemo && isVerified && (
          <button
            className="btn btn-warning"
            onClick={onSimulateTamper}
            disabled={isTampering}
          >
            <ShieldAlert size={16} style={{ marginRight: 6 }} />
            {isTampering ? "Simulating Tampering..." : "Simulate Tampering (Demo)"}
          </button>
        )}

        {result.isTamperedDemo && (
          <div className="tamper-explanation-notice">
            <span className="text-warning font-semibold">⚠️ Supply-Chain Divergence Simulation:</span>
            {" "}Builder C's binary hash was altered to demonstrate how Quorum immediately detects divergence.
          </div>
        )}

        <button className="btn btn-outline" onClick={onReset}>
          <RotateCcw size={16} style={{ marginRight: 6 }} />
          Verify Another Release
        </button>
      </div>

      {/* Evidence Attestation Modal */}
      {showEvidenceModal && (
        <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align">
                <FileCode size={20} className="text-cyan" style={{ marginRight: 8 }} />
                <h3>Quorum Cryptographic Attestation Evidence</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowEvidenceModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                This signed attestation provides cryptographic record of multi-builder consensus across isolated GitHub Actions runners.
              </p>

              <div className="evidence-viewer font-mono">
                <pre>{JSON.stringify(result.attestation || result, null, 2)}</pre>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyAttestation}
              >
                {copiedAttestation ? (
                  <>
                    <Check size={14} style={{ marginRight: 6 }} className="text-success" />
                    Copied Attestation
                  </>
                ) : (
                  <>
                    <Copy size={14} style={{ marginRight: 6 }} />
                    Copy Attestation JSON
                  </>
                )}
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowEvidenceModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
