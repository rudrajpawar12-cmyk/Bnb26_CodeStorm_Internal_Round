import React, { useState } from "react";
import {
  Layers,
  Terminal,
  Cpu,
  Fingerprint,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  GitBranch,
} from "lucide-react";

export default function ArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState("builders");

  const nodes = [
    {
      id: "frontend",
      title: "React Frontend",
      tech: "React 19 + Vite",
      icon: Layers,
      description:
        "Developer and auditor client interface. Dispatches verification requests, validates repository format, and renders live builder state transitions with SHA-256 copyable digests.",
      specs: ["Axios HTTP Client", "Live Status Polling", "Attestation Inspector"],
    },
    {
      id: "backend",
      title: "Express Backend",
      tech: "Node.js + REST API",
      icon: Terminal,
      description:
        "Secure orchestrator. Validates inputs, manages verification sessions, authenticates with GitHub API, sanitizes repo/commit parameters, and coordinates attestation generation.",
      specs: ["Strict Input Sanitization", "GitHub API v3 Integration", "In-Memory Ledger Cache"],
    },
    {
      id: "builders",
      title: "GitHub Actions Cluster",
      tech: "Builder A / B / C",
      icon: Cpu,
      description:
        "Three independently scheduled workflow runners. Each checks out the exact commit SHA, provisions isolated Node.js environments, runs reproducible builds, and tars the output dist.",
      specs: ["actions/checkout@v4", "Deterministic Tar & Mtime", "SHA-256 Checksums"],
    },
    {
      id: "quorum",
      title: "Quorum Consensus Engine",
      tech: "Multi-Party Aggregator",
      icon: ShieldCheck,
      description:
        "Cryptographic aggregation layer. Compares artifact fingerprints from all runners. If 100% agree, signs an attestation. If any hash diverges, immediately surfaces a non-accusatory CONFLICT.",
      specs: ["Unanimous Threshold", "Divergence Warning", "Signed JSON-LD Attestation"],
    },
  ];

  const currentNode = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="arch-container">
      <div className="arch-header">
        <h3 className="section-title">Quorum Multi-Builder Architecture</h3>
        <p className="section-subtitle">
          How source code moves from developer repository to verified multi-party cryptographic attestation.
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="pipeline-flow-wrapper">
        <div className="pipeline-flow">
          {nodes.map((node, idx) => {
            const Icon = node.icon;
            const isSelected = selectedNode === node.id;

            return (
              <React.Fragment key={node.id}>
                <div
                  className={`pipeline-node ${isSelected ? "pipeline-node-active" : ""}`}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="pipeline-node-header">
                    <Icon size={20} className="node-icon" />
                    <span className="node-tech font-mono">{node.tech}</span>
                  </div>
                  <h4 className="node-title">{node.title}</h4>
                </div>

                {idx < nodes.length - 1 && (
                  <div className="pipeline-connector">
                    <ArrowRight size={18} className="connector-arrow" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep Dive Card */}
      <div className="node-details-card">
        <div className="node-details-header">
          <div className="flex-align">
            <currentNode.icon size={24} className="text-cyan" style={{ marginRight: 10 }} />
            <div>
              <h4 className="node-details-title">{currentNode.title}</h4>
              <span className="node-details-subtitle font-mono">{currentNode.tech}</span>
            </div>
          </div>
          <span className="badge badge-cyan font-mono">TIER {nodes.findIndex((n) => n.id === selectedNode) + 1} OF 4</span>
        </div>

        <p className="node-description">{currentNode.description}</p>

        <div className="node-specs-list">
          <span className="specs-label">Key Security & Infrastructure Controls:</span>
          <div className="specs-chips">
            {currentNode.specs.map((spec, i) => (
              <span key={i} className="spec-chip">
                <CheckCircle size={13} className="text-success" style={{ marginRight: 6 }} />
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
