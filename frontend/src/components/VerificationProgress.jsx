import React from "react";
import { CheckCircle2, Clock, GitBranch, Shield, Cpu, Binary } from "lucide-react";

export default function VerificationProgress({ currentStep, status, message, builders = [] }) {
  const steps = [
    {
      id: "INITIALIZING",
      title: "Repository & Commit",
      subtitle: "Identity resolved",
      icon: GitBranch,
    },
    {
      id: "BUILD_VERIFICATION",
      title: "Independent Builds",
      subtitle: "3 isolated environments",
      icon: Cpu,
    },
    {
      id: "HASHING",
      title: "SHA-256 Fingerprint",
      subtitle: "Deterministic digest",
      icon: Binary,
    },
    {
      id: "QUORUM_ANALYSIS",
      title: "Quorum Consensus",
      subtitle: "Multi-party comparison",
      icon: Shield,
    },
  ];

  const getStepState = (stepId, index) => {
    const stepOrder = ["INITIALIZING", "BUILD_VERIFICATION", "HASHING", "QUORUM_ANALYSIS"];
    const currentIndex = stepOrder.indexOf(currentStep);

    if (status === "COMPLETED") return "completed";
    if (status === "FAILED") return index === currentIndex ? "failed" : index < currentIndex ? "completed" : "pending";

    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="progress-container">
      <div className="progress-stepper">
        {steps.map((step, idx) => {
          const state = getStepState(step.id, idx);
          const IconComponent = step.icon;

          return (
            <div key={step.id} className={`stepper-item ${state}`}>
              <div className="stepper-indicator">
                {state === "completed" ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : state === "active" ? (
                  <div className="spinner-icon">
                    <IconComponent size={18} className="text-cyan animate-spin-slow" />
                  </div>
                ) : (
                  <IconComponent size={18} className="text-muted" />
                )}
              </div>

              <div className="stepper-details">
                <span className="stepper-title">{step.title}</span>
                <span className="stepper-subtitle">{step.subtitle}</span>
              </div>

              {idx < steps.length - 1 && <div className="stepper-connector" />}
            </div>
          );
        })}
      </div>

      {message && (
        <div className="progress-status-bar">
          <div className="status-pulse-dot" />
          <span className="status-text">{message}</span>
        </div>
      )}
    </div>
  );
}
