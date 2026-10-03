import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Play,
  RotateCcw,
  AlertCircle,
  Zap,
  Shield,
  Layers,
  Search,
  CheckCircle2,
  GitBranch,
  Star,
  Calendar,
  Box,
  Cpu,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import verificationApi from "../services/api";
import VerificationProgress from "../components/VerificationProgress";
import BuilderCard from "../components/BuilderCard";
import ResultDashboard from "../components/ResultDashboard";

export default function Verify({ prefillDemo = false }) {
  // Step 1: Input & Analysis
  const [repository, setRepository] = useState("");
  const [refInput, setRefInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  // Step 2: Verification
  const [releaseArtifact, setReleaseArtifact] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [session, setSession] = useState(null);
  const [isTampering, setIsTampering] = useState(false);
  const pollingRef = useRef(null);

  // Quick preset helper for multiple public publishers
  const handlePresetSelect = (repoUrl, ref) => {
    setRepository(repoUrl);
    setRefInput(ref || "");
    setAnalysisError("");
    setVerifyError("");
    setAnalysis(null);
    setSession(null);
  };

  // If triggered via Navbar "Try Demo"
  useEffect(() => {
    if (prefillDemo && !repository) {
      handlePresetSelect("https://github.com/vitejs/vite", "main");
    }
  }, [prefillDemo]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Step 1 Action: Analyze Repository
  const handleAnalyzeRepository = async (e) => {
    if (e) e.preventDefault();
    setAnalysisError("");
    setVerifyError("");
    setAnalysis(null);
    setSession(null);

    if (!repository.trim()) {
      setAnalysisError("Enter a GitHub repository URL or owner/project identifier.");
      return;
    }

    try {
      setAnalyzing(true);
      const data = await verificationApi.analyzeRepository({
        repository: repository.trim(),
        ref: refInput.trim() || null,
      });
      setAnalysis(data);
      // Auto-populate refInput from URL if user hadn't typed one
      if (!refInput.trim() && data.parsedRef) {
        setRefInput(data.parsedRef);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setAnalysisError(
        err.response?.data?.error ||
          "Could not analyze repository. Ensure the repository is public and accessible on GitHub."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2 Action: Start Verification
  const handleStartVerification = async (demoConflict = false) => {
    setVerifyError("");
    if (!analysis) return;

    try {
      setLoading(true);
      setSession(null);

      const effectiveArtifact = releaseArtifact.trim() || selectedAsset || null;

      const initData = await verificationApi.startVerification({
        repository: analysis.repository,
        commit: analysis.resolvedCommit,
        ref: analysis.refUsed,
        releaseArtifact: effectiveArtifact,
        projectConfig: analysis.projectConfig,
        demoConflict: Boolean(demoConflict),
      });

      // Initialize session in UI
      setSession({
        id: initData.verificationId,
        repository: analysis.repository,
        commit: analysis.resolvedCommit,
        status: initData.status || "QUEUED",
        currentStep: initData.currentStep || "INITIALIZING",
        stepMessage: initData.message || "Initializing verification session...",
        projectConfig: analysis.projectConfig,
        mode: initData.mode || (demoConflict ? "DEMO MODE — SIMULATED BUILDER CONFLICT" : "GITHUB_ACTIONS"),
        demoConflict: Boolean(demoConflict),
        isTamperedDemo: Boolean(demoConflict),
        builders: [
          { name: "Builder A", status: "waiting", hash: null, duration: null },
          { name: "Builder B", status: "waiting", hash: null, duration: null },
          { name: "Builder C", status: "waiting", hash: null, duration: null },
        ],
        consensus: null,
        result: null,
      });

      // Poll for status
      pollVerification(initData.verificationId);
    } catch (err) {
      console.error(err);
      setVerifyError(
        err.response?.data?.error ||
          "Could not start verification. Please check backend connection."
      );
      setLoading(false);
    }
  };

  // Status Poller
  const pollVerification = (verificationId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const statusData = await verificationApi.getVerificationStatus(verificationId);
        setSession(statusData);

        if (statusData.status === "COMPLETED" || statusData.status === "FAILED") {
          clearInterval(pollingRef.current);
          setLoading(false);
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(pollingRef.current);
        setVerifyError("Lost connection to verification engine during polling.");
        setLoading(false);
      }
    }, 1200);
  };

  // Tamper Simulation Trigger
  const handleSimulateTampering = async () => {
    if (!session?.id) return;
    try {
      setIsTampering(true);
      const updated = await verificationApi.simulateTampering(session.id);
      setSession(updated);
    } catch (err) {
      console.error(err);
      setVerifyError("Failed to simulate tampering scenario.");
    } finally {
      setIsTampering(false);
    }
  };

  // Instant Demo Presets for Judges
  const handleLoadDemo = async (type) => {
    setAnalysisError("");
    setVerifyError("");
    setLoading(true);
    try {
      const demo = await verificationApi.getDemoScenario(type);
      setRepository(demo.repository);
      setAnalysis({
        repository: demo.repository,
        owner: demo.owner,
        repo: demo.repo,
        visibility: "Public",
        defaultBranch: "main",
        stars: 72000,
        resolvedCommit: demo.commit,
        refUsed: "main",
        projectConfig: {
          framework: "React / Vite",
          packageManager: "npm",
          buildCommand: "npm run build",
          nodeVersion: "22",
          verifiable: true,
        },
      });
      setSession(demo);
    } catch (err) {
      setVerifyError("Failed to load demo scenario.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setSession(null);
    setAnalysis(null);
    setLoading(false);
    setAnalyzing(false);
    setAnalysisError("");
    setVerifyError("");
  };

  return (
    <div className="verify-page">
      {/* Page Header */}
      <div className="verify-header">
        <div className="verify-badge">
          <Shield size={14} className="text-cyan" style={{ marginRight: 6 }} />
          <span>UNIVERSAL PUBLIC REPOSITORY VERIFICATION</span>
        </div>
        <h1 className="verify-title">Verify Any Public GitHub Release</h1>
        <p className="verify-subtitle">
          Verify software from <strong>any public GitHub publisher</strong>. Quorum dynamically analyzes the repository,
          resolves branch or tag references to exact immutable commit SHAs, identifies the build configuration,
          and executes multi-builder verification across isolated environments.
        </p>
      </div>

      {/* STEP 1: Repository Input & Analysis Form */}
      {!session && (
        <div className="verify-form-card">
          <div className="form-card-header">
            <div className="flex-align">
              <Terminal size={18} className="text-cyan" style={{ marginRight: 8 }} />
              <h3 className="form-card-title">Step 1: Enter Public Repository Reference</h3>
            </div>
            <span className="badge badge-cyan font-mono">UNIVERSAL ACCESS</span>
          </div>

          {/* Quick Preset Buttons for Diverse Publishers */}
          <div className="preset-strip">
            <span className="preset-label">Quick Examples:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() => handlePresetSelect("https://github.com/facebook/react", "")}
            >
              facebook/react
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => handlePresetSelect("https://github.com/vitejs/vite", "")}
            >
              vitejs/vite
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => handlePresetSelect("https://github.com/expressjs/express", "")}
            >
              expressjs/express
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => handlePresetSelect("https://github.com/yashnanavare6/Bit", "")}
            >
              yashnanavare6/Bit
            </button>
          </div>

          <form onSubmit={handleAnalyzeRepository} className="form-grid">
            {/* Repository URL Input */}
            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="repo-input">
                GitHub Repository URL <span className="text-danger">*</span>
              </label>
              <input
                id="repo-input"
                type="text"
                className="form-input font-mono"
                placeholder="https://github.com/owner/repository"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                disabled={analyzing}
              />
              <span className="label-subtext">
                Paste the full GitHub repository URL, branch URL, tag URL, or commit URL.
                Shorthand <code>owner/repository</code> is also accepted. Query parameters are stripped automatically.
              </span>
            </div>

            {/* Version / Branch / Tag / Commit Input */}
            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="ref-input">
                Version / Branch / Tag / Commit Reference <span className="label-subtext">(Optional — auto-detected from URL or defaults to default branch)</span>
              </label>
              <input
                id="ref-input"
                type="text"
                className="form-input font-mono"
                placeholder="e.g. main, develop, v1.0.0, or specific commit SHA"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                disabled={analyzing}
              />
            </div>

            <div className="form-group form-group-full form-actions-row">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={analyzing}
              >
                <Search size={18} style={{ marginRight: 8 }} />
                {analyzing ? "ANALYZING REPOSITORY STRUCTURE..." : "ANALYZE REPOSITORY"}
              </button>

              {/* Instant Demo Presets for Judges */}
              <div className="judge-demo-box">
                <span className="judge-demo-label font-mono">JUDGE DEMOS:</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleLoadDemo("verified")}
                  title="Loads instant 3/3 verified consensus"
                >
                  Verified (3/3)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-warning"
                  onClick={() => handleLoadDemo("conflict")}
                  title="Loads instant divergence scenario"
                >
                  Conflict (2/3)
                </button>
              </div>
            </div>
          </form>

          {/* Analysis Error Notice */}
          {analysisError && (
            <div className="error-banner mt-4">
              <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>{analysisError}</span>
            </div>
          )}
        </div>
      )}

      {/* REPOSITORY INFORMATION PANEL (After Analysis) */}
      {analysis && !session && (
        <div className="repo-analysis-panel">
          <div className="analysis-panel-header">
            <div className="flex-align">
              {analysis.ownerAvatar && (
                <img
                  src={analysis.ownerAvatar}
                  alt={analysis.owner}
                  className="owner-avatar"
                />
              )}
              <div>
                <div className="flex-align gap-2">
                  <h3 className="repo-full-name">{analysis.repository}</h3>
                  <span className="badge badge-success font-mono">
                    <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                    Public Repository
                  </span>
                </div>
                <p className="repo-desc">{analysis.description}</p>
              </div>
            </div>

            {/* Source URL info strip */}
            <div className="source-url-strip">
              <div className="source-url-row">
                <span className="source-url-label">SOURCE REPOSITORY</span>
                <a
                  href={analysis.htmlUrl || `https://github.com/${analysis.repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-url-link font-mono"
                >
                  {analysis.htmlUrl || `https://github.com/${analysis.repository}`}
                  <ExternalLink size={13} style={{ marginLeft: 5 }} />
                </a>
              </div>
              <div className="source-url-row">
                <span className="source-url-label">NORMALIZED</span>
                <span className="source-url-value font-mono">{analysis.repository}</span>
              </div>
              <div className="source-url-row">
                <span className="source-url-label">REFERENCE</span>
                <span className="source-url-value font-mono">{analysis.refUsed || analysis.defaultBranch}</span>
              </div>
              {analysis.originalUrl && analysis.originalUrl !== analysis.repository && (
                <div className="source-url-row">
                  <span className="source-url-label">ORIGINAL INPUT</span>
                  <span className="source-url-value font-mono text-muted" style={{ wordBreak: "break-all" }}>
                    {analysis.originalUrl}
                  </span>
                </div>
              )}
            </div>

            <div className="repo-stats-strip">
              <span className="stat-pill font-mono">
                <Star size={13} style={{ marginRight: 4 }} className="text-warning" />
                {analysis.stars?.toLocaleString()} stars
              </span>
              <span className="stat-pill font-mono">
                <GitBranch size={13} style={{ marginRight: 4 }} className="text-cyan" />
                {analysis.defaultBranch}
              </span>
            </div>
          </div>

          {/* Detected Build Environment Matrix */}
          <div className="detected-env-grid">
            <div className="env-cell">
              <span className="env-label">Detected Project Type</span>
              <span className="env-val text-cyan font-semibold">
                {analysis.projectConfig?.projectType || analysis.projectConfig?.framework || "Unknown"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Verification Mode</span>
              <span className="env-val text-cyan font-semibold">
                {analysis.projectConfig?.verificationMode || "Artifact Reproducibility"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Build System</span>
              <span className="env-val font-mono font-semibold text-white">
                {analysis.projectConfig?.buildSystem || analysis.projectConfig?.framework || "None"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Package Manager</span>
              <span className="env-val font-mono">
                {analysis.projectConfig?.packageManager || "None"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Install Command</span>
              <span className="env-val font-mono text-muted text-sm">
                {analysis.projectConfig?.installCommand || "None"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Build Command</span>
              <span className="env-val font-mono font-semibold text-white text-sm">
                {analysis.projectConfig?.buildCommand || "None"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Artifact Directory</span>
              <span className="env-val font-mono text-cyan">
                {analysis.projectConfig?.artifactPath === "N/A"
                  ? "N/A"
                  : analysis.projectConfig?.artifactPath
                  ? `${analysis.projectConfig.artifactPath}/`
                  : "None"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Verification Status</span>
              <span className={`env-val font-semibold ${analysis.projectConfig?.verifiable !== false ? "text-success" : "text-warning"}`}>
                {analysis.projectConfig?.verifiable !== false
                  ? (analysis.projectConfig?.verificationMode === "Source Reproducibility" ? "SOURCE REPRODUCIBILITY SUPPORTED" : "REPRODUCIBLE BUILD SUPPORTED")
                  : "NOT VERIFIABLE"}
              </span>
            </div>

            <div className="env-cell">
              <span className="env-label">Repository Owner</span>
              <span className="env-val font-mono">{analysis.owner}</span>
            </div>
          </div>

          {/* Resolved Immutable Commit Banner */}
          <div className="resolved-commit-banner">
            <div className="flex-between mb-1">
              <span className="commit-banner-title flex-align">
                <GitBranch size={15} className="text-cyan" style={{ marginRight: 6 }} />
                Resolved Immutable Commit SHA (Pinned for All Builders)
              </span>
              <span className="badge badge-cyan font-mono">
                Ref: {analysis.refUsed}
              </span>
            </div>
            <div className="resolved-commit-sha font-mono">
              {analysis.resolvedCommit}
            </div>
            {analysis.commitMessage && (
              <div className="commit-meta-subtext">
                "{analysis.commitMessage}" — <em>{analysis.commitAuthor}</em> ({new Date(analysis.commitDate).toLocaleDateString()})
              </div>
            )}
          </div>

          {/* Optional GitHub Releases / Asset Selector */}
          {analysis.releases && analysis.releases.length > 0 && (
            <div className="releases-strip">
              <div className="releases-header">
                <Box size={15} className="text-cyan" style={{ marginRight: 6 }} />
                <span className="font-semibold text-white">Published GitHub Release Available</span>
                <span className="badge badge-sm badge-muted font-mono" style={{ marginLeft: 8 }}>
                  {analysis.releases[0].tagName}
                </span>
              </div>
              <p className="releases-subtext">
                You can optionally compare the independent build consensus against a published release asset:
              </p>
              <div className="assets-chips">
                {analysis.releases[0].assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`asset-chip ${selectedAsset === asset.name ? "asset-chip-selected" : ""}`}
                    onClick={() => {
                      setSelectedAsset(asset.name);
                      setReleaseArtifact(`asset:${asset.name}`);
                    }}
                  >
                    <Box size={13} style={{ marginRight: 4 }} />
                    {asset.name} ({(asset.size / 1024 / 1024).toFixed(1)} MB)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Custom Artifact Fingerprint Input */}
          <div className="form-group mt-4">
            <label className="form-label" htmlFor="custom-artifact-input">
              Claimed Release Artifact Fingerprint (Optional)
            </label>
            <input
              id="custom-artifact-input"
              type="text"
              className="form-input font-mono"
              placeholder="Paste SHA-256 fingerprint if verifying against an existing downloaded release file"
              value={releaseArtifact}
              onChange={(e) => setReleaseArtifact(e.target.value)}
            />
          </div>

          {/* Verification Launch or Honest Unverifiable Explanation */}
          {analysis.projectConfig?.verifiable === false ? (
            <div className="unverifiable-notice-card">
              <div className="flex-align mb-2">
                <AlertTriangle size={20} className="text-warning" style={{ marginRight: 8 }} />
                <h4 className="text-warning">Repository Cannot Be Automatically Built</h4>
              </div>
              <p className="mb-3">
                {analysis.projectConfig?.unverifiableReason ||
                  "Quorum does not currently support automatic reproducible builds for this project type."}
              </p>
              <p className="text-muted text-sm">
                Quorum does not fabricate build commands or pretend unbuildable projects succeeded.
              </p>
            </div>
          ) : (
            <div className="analysis-actions-row">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleStartVerification(false)}
                disabled={loading}
              >
                <Play size={18} style={{ marginRight: 8 }} />
                {loading ? "INITIALIZING BUILDERS..." : "START QUORUM VERIFICATION"}
              </button>

              <button
                className="btn btn-warning btn-lg"
                onClick={() => handleStartVerification(true)}
                disabled={loading}
                title="Executes independent reproduction with intentional tamper injection in Builder C (2/3 conflict demo)"
              >
                <AlertTriangle size={18} style={{ marginRight: 8 }} />
                SIMULATE BUILDER CONFLICT (DEMO)
              </button>

              <button className="btn btn-outline" onClick={() => setAnalysis(null)}>
                Change Repository
              </button>
            </div>
          )}

          {verifyError && (
            <div className="error-banner mt-3">
              <AlertCircle size={18} style={{ marginRight: 8 }} />
              <span>{verifyError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Live Verification Stepper & Builder Results */}
      {session && (
        <div className="verification-session-container">
          {(session.mode?.includes("DEMO") || session.isTamperedDemo || session.demoConflict) && (
            <div className="demo-conflict-banner">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>DEMO MODE — SIMULATED BUILDER CONFLICT</span>
            </div>
          )}

          <VerificationProgress
            currentStep={session.currentStep}
            status={session.status}
            message={session.stepMessage}
            builders={session.builders}
          />

          {/* Builder Cards Section */}
          <div className="builders-section">
            <div className="builders-section-header">
              <div className="flex-align">
                <Layers size={20} className="text-cyan" style={{ marginRight: 8 }} />
                <h3>Independent Build Jobs (Parallel Reproduction)</h3>
              </div>
              <span className="badge badge-cyan font-mono">
                {session.repository} @ {session.commit.slice(0, 8)}
              </span>
            </div>

            <div className="builders-grid">
              {session.builders.map((builder) => (
                <BuilderCard
                  key={builder.name}
                  builder={builder}
                  commit={session.commit}
                  isConflict={builder.status === "conflict"}
                />
              ))}
            </div>
          </div>

          {/* Final Quorum Result Dashboard */}
          {(session.status === "COMPLETED" || session.status === "FAILED") && (
            <ResultDashboard
              result={session}
              onReset={handleReset}
              onSimulateTamper={handleSimulateTampering}
              isTampering={isTampering}
            />
          )}
        </div>
      )}
    </div>
  );
}
