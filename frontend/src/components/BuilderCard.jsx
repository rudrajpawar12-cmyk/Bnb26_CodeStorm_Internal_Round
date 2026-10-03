import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Copy, Check, ChevronDown, ChevronUp, Server, Box } from "lucide-react";

export default function BuilderCard({ builder, commit, isConflict }) {
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleCopyHash = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    const status = builder.status?.toLowerCase();

    if (status === "verified") {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={13} style={{ marginRight: 4 }} />
          VERIFIED
        </span>
      );
    }
    if (status === "conflict") {
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={13} style={{ marginRight: 4 }} />
          CONFLICT
        </span>
      );
    }
    if (status === "failed" || status === "error") {
      return (
        <span className="badge badge-danger">
          <XCircle size={13} style={{ marginRight: 4 }} />
          FAILED
        </span>
      );
    }
    if (status === "running") {
      return (
        <span className="badge badge-cyan animate-pulse">
          <Clock size={13} style={{ marginRight: 4 }} />
          RUNNING
        </span>
      );
    }
    return (
      <span className="badge badge-muted">
        <Clock size={13} style={{ marginRight: 4 }} />
        QUEUED
      </span>
    );
  };

  const displayHash = builder.hash
    ? `${builder.hash.slice(0, 10)}...${builder.hash.slice(-8)}`
    : "Pending computation...";

  return (
    <div className={`builder-card ${builder.status === "conflict" ? "builder-card-conflict" : ""}`}>
      {/* Header */}
      <div className="builder-header">
        <div className="builder-title-group">
          <div className="builder-avatar">
            <Server size={18} className="text-cyan" />
          </div>
          <div>
            <h4 className="builder-name">{builder.name}</h4>
            <span className="builder-env">{builder.environment || "Isolated Build Environment"}</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Commit, Build Command & Duration Meta */}
      <div className="builder-meta-row">
        <div className="meta-item">
          <span className="meta-label">Source Commit</span>
          <span className="meta-value font-mono">
            {commit ? commit.slice(0, 8) : "—"}
          </span>
        </div>
        {builder.buildCommand && (
          <div className="meta-item">
            <span className="meta-label">Build Command</span>
            <span className="meta-value font-mono text-cyan">
              {builder.buildCommand}
            </span>
          </div>
        )}
        <div className="meta-item">
          <span className="meta-label">Build Duration</span>
          <span className="meta-value">
            {builder.duration || (builder.status === "running" ? "In progress..." : "—")}
          </span>
        </div>
      </div>

      {/* Artifact Fingerprint Display */}
      <div className="builder-fingerprint-box">
        <div className="fingerprint-label-row">
          <span className="fingerprint-label">
            <Box size={13} style={{ marginRight: 4 }} />
            Artifact SHA-256 Fingerprint
          </span>
          {builder.hash && (
            <button
              className="copy-btn"
              onClick={() => handleCopyHash(builder.hash)}
              title="Copy full SHA-256 hash"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className={`fingerprint-hash font-mono ${builder.status === "conflict" ? "text-warning" : ""}`}>
          {builder.hash ? builder.hash : <span className="text-muted">Computing hash...</span>}
        </div>
      </div>

      {/* Expandable Step Logs */}
      {builder.logs && builder.logs.length > 0 && (
        <div className="builder-logs-accordion">
          <button
            className="logs-toggle-btn"
            onClick={() => setShowLogs(!showLogs)}
          >
            <span>Runner Execution Details ({builder.logs.length} events)</span>
            {showLogs ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showLogs && (
            <div className="logs-content font-mono">
              {builder.logs.map((log, idx) => (
                <div key={idx} className="log-line">
                  <span className="log-index">0{idx + 1}</span>
                  <span className="log-text">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
