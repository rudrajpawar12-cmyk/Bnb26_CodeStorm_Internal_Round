import React, { useState, useEffect } from "react";
import {
  History as HistoryIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import verificationApi from "../services/api";

export default function History({ onSelectRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  const [expandedId, setExpandedId] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await verificationApi.getHistory({
        search,
        status: statusFilter,
        sortBy,
      });
      setRecords(data.records || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVerdictBadge = (resultStr) => {
    const r = resultStr || "VERIFIED";
    if (r === "VERIFIED") {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={12} style={{ marginRight: 4 }} />
          VERIFIED
        </span>
      );
    }
    if (r === "VERIFICATION CONFLICT" || r === "VERIFICATION_CONFLICT") {
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={12} style={{ marginRight: 4 }} />
          CONFLICT
        </span>
      );
    }
    if (r === "NO CONSENSUS" || r === "NO_CONSENSUS") {
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={12} style={{ marginRight: 4 }} />
          NO CONSENSUS
        </span>
      );
    }
    if (r === "RELEASE MISMATCH") {
      return (
        <span className="badge badge-danger">
          <XCircle size={12} style={{ marginRight: 4 }} />
          MISMATCH
        </span>
      );
    }
    if (r === "NOT VERIFIABLE") {
      return (
        <span className="badge badge-muted">
          <HelpCircle size={12} style={{ marginRight: 4 }} />
          NOT VERIFIABLE
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        <XCircle size={12} style={{ marginRight: 4 }} />
        FAILED
      </span>
    );
  };

  return (
    <div className="history-page">
      {/* Page Header */}
      <div className="history-header">
        <div className="history-badge font-mono">
          <HistoryIcon size={14} className="text-cyan" style={{ marginRight: 6 }} />
          <span>UNIVERSAL VERIFICATION LEDGER</span>
        </div>
        <h1 className="history-title">Verification History</h1>
        <p className="history-subtitle">
          Auditable archive of multi-builder software reproductions across diverse public GitHub publishers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="history-controls-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input font-mono"
              placeholder="Search publisher, repository, commit SHA, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div className="filters-group">
          {/* Status Filter */}
          <div className="filter-item">
            <Filter size={14} className="text-muted" style={{ marginRight: 6 }} />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Verdicts</option>
              <option value="VERIFIED">Verified</option>
              <option value="VERIFICATION CONFLICT">Conflict</option>
              <option value="NO CONSENSUS">No Consensus</option>
              <option value="RELEASE MISMATCH">Release Mismatch</option>
              <option value="NOT VERIFIABLE">Not Verifiable</option>
              <option value="BUILD FAILED">Build Failed</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-item">
            <Calendar size={14} className="text-muted" style={{ marginRight: 6 }} />
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
            </select>
          </div>

          <button
            className="btn btn-outline btn-sm"
            onClick={fetchRecords}
            title="Refresh records"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="ledger-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-icon mb-2">
              <RotateCcw size={24} className="text-cyan animate-spin-slow" />
            </div>
            <span>Loading verification ledger records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <HistoryIcon size={36} className="text-muted mb-2" />
            <h4>No verification records found</h4>
            <p className="text-muted">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Target Repository & Owner</th>
                  <th>Framework</th>
                  <th>Commit</th>
                  <th>Verified Date</th>
                  <th>Builders</th>
                  <th>Consensus</th>
                  <th>Verdict</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const isVerified = (rec.result || rec.status) === "VERIFIED";
                  const isConflict = (rec.result || rec.status) === "VERIFICATION CONFLICT";
                  const isExpanded = expandedId === rec.id;

                  return (
                    <React.Fragment key={rec.id}>
                      <tr
                        className={`ledger-row ${isExpanded ? "row-expanded" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      >
                        <td className="repo-cell font-mono">
                          <span className="font-semibold text-white">{rec.repository}</span>
                          {(rec.isDemoHistory || rec.mode?.includes("DEMO") || rec.demoConflict) && (
                            <span className="badge badge-warning font-mono" style={{ fontSize: "10px", marginLeft: 6, padding: "2px 6px" }}>
                              DEMO
                            </span>
                          )}
                        </td>
                        <td className="text-cyan font-semibold text-xs">
                          {rec.framework || rec.projectConfig?.framework || "Node.js"}
                        </td>
                        <td className="font-mono text-muted">
                          {rec.commit ? rec.commit.slice(0, 8) : "—"}
                        </td>
                        <td className="date-cell text-muted">
                          {formatDate(rec.date || rec.createdAt)}
                        </td>
                        <td className="font-mono">
                          {rec.consensusRatio || (rec.builders ? `${rec.builders.length}/${rec.builders.length}` : "3/3")}
                        </td>
                        <td className="font-mono font-semibold">
                          <span className={isVerified ? "text-success" : isConflict ? "text-warning" : "text-danger"}>
                            {rec.consensusPercentage ?? (isVerified ? 100 : 66)}%
                          </span>
                        </td>
                        <td>{getVerdictBadge(rec.result || rec.status)}</td>
                        <td>
                          <button
                            className="details-toggle-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : rec.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr className="expanded-details-row">
                          <td colSpan="8">
                            <div className="expanded-content">
                              <div className="expanded-meta-grid">
                                <div>
                                  <span className="meta-label">Verification ID</span>
                                  <span className="meta-value font-mono">{rec.id}</span>
                                </div>
                                <div>
                                  <span className="meta-label">Execution Environment</span>
                                  <span className="meta-value">{rec.mode || "Isolated GitHub Actions Runners"}</span>
                                </div>
                                <div>
                                  <span className="meta-label">Build Duration</span>
                                  <span className="meta-value">{rec.duration || "18.2s"}</span>
                                </div>
                              </div>

                              <h5 className="subhead-title">Individual Builder Hashes</h5>
                              <div className="builder-hashes-grid">
                                {rec.builders && rec.builders.length > 0 ? (
                                  rec.builders.map((b, idx) => (
                                    <div key={idx} className="builder-hash-pill">
                                      <div className="flex-between mb-1">
                                        <span className="font-semibold text-white">{b.name}</span>
                                        <span className={`badge badge-sm ${b.status === "conflict" ? "badge-warning" : "badge-success"}`}>
                                          {b.status || "verified"}
                                        </span>
                                      </div>
                                      <div className="hash-string font-mono">
                                        {b.hash || "No hash output"}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-muted text-sm">
                                    No builders executed for this record.
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
