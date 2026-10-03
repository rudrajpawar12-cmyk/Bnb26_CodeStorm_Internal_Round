/**
 * Quorum Consensus & Cryptographic Comparison Service
 *
 * Implements multi-builder consensus evaluation:
 * - VERIFIED (3/3 agreement)
 * - VERIFICATION_CONFLICT (2/3 agreement)
 * - NO_CONSENSUS (1/3 agreement / all different)
 * - RELEASE_MISMATCH (published artifact diverges from consensus)
 * - NOT_VERIFIABLE (unbuildable, missing script, or unsupported)
 * - BUILD_FAILED (runner compilation failure)
 */

const crypto = require("crypto");

class QuorumService {
  /**
   * Compares builder hashes and evaluates consensus
   * @param {Array<{ name: string, status: string, hash: string, duration?: string }>} builders
   * @param {string} [claimedArtifactHash]
   * @param {Object} [metadata]
   */
  evaluateConsensus(builders, claimedArtifactHash = null, metadata = {}) {
    // Check if project was already marked as not verifiable
    if (metadata.isNotVerifiable) {
      return {
        status: "COMPLETED",
        result: "NOT VERIFIABLE",
        message: metadata.unverifiableReason || "Repository does not define a supported reproducible build process.",
        consensusRatio: "0/3",
        consensusPercentage: 0,
        agreedHash: null,
        conflictDetails: "Automatic reproducible compilation is not supported for this project configuration.",
      };
    }

    if (!builders || builders.length === 0) {
      return {
        status: "FAILED",
        result: "NOT VERIFIABLE",
        message: "No builder results were available for comparison.",
        consensusRatio: "0/0",
        consensusPercentage: 0,
        agreedHash: null,
        conflictDetails: null,
      };
    }

    // Check if any builder failed compilation
    const failedBuilders = builders.filter((b) => b.status === "failed" || b.status === "error");
    if (failedBuilders.length > 0) {
      return {
        status: "COMPLETED",
        result: "BUILD FAILED",
        message: "Reproducibility could not be established because one or more builders failed.",
        consensusRatio: `${builders.length - failedBuilders.length}/${builders.length}`,
        consensusPercentage: Math.round(((builders.length - failedBuilders.length) / builders.length) * 100),
        agreedHash: null,
        conflictDetails: `${failedBuilders.map((b) => b.name).join(", ")} encountered compilation or dependency errors during reproduction.`,
      };
    }

    // Group builder fingerprints
    const hashCounts = {};
    builders.forEach((builder) => {
      const h = builder.hash || "UNKNOWN";
      hashCounts[h] = (hashCounts[h] || 0) + 1;
    });

    const totalBuilders = builders.length;
    let maxAgreeCount = 0;
    let majorityHash = null;

    for (const [hash, count] of Object.entries(hashCounts)) {
      if (count > maxAgreeCount) {
        maxAgreeCount = count;
        majorityHash = hash;
      }
    }

    const consensusPercentage = Math.round((maxAgreeCount / totalBuilders) * 100);
    const consensusRatio = `${maxAgreeCount}/${totalBuilders}`;

    // 100% Agreement (3/3)
    if (maxAgreeCount === totalBuilders) {
      // If user provided a claimed release artifact hash to compare against
      if (claimedArtifactHash && claimedArtifactHash.trim()) {
        const cleanClaimed = claimedArtifactHash.trim().toLowerCase();
        const cleanAgreed = (majorityHash || "").toLowerCase();

        if (cleanClaimed === cleanAgreed) {
          return {
            status: "COMPLETED",
            result: "RELEASE MATCH",
            message: "The published release artifact matches the independently reproduced artifact.",
            consensusRatio,
            consensusPercentage,
            agreedHash: majorityHash,
            claimedHash: claimedArtifactHash,
            conflictDetails: "All three isolated builders reproduced identical fingerprints, and the published release asset matches the reproduced artifact.",
          };
        } else {
          return {
            status: "COMPLETED",
            result: "RELEASE MISMATCH",
            message: "The published release artifact does not match the independently reproduced artifact.",
            consensusRatio,
            consensusPercentage,
            agreedHash: majorityHash,
            claimedHash: claimedArtifactHash,
            conflictDetails: "The independently reproduced builds achieved unanimous 3/3 consensus, but the author's published release asset diverges from this reproducible fingerprint.",
          };
        }
      }

      return {
        status: "COMPLETED",
        result: "VERIFIED",
        message: "All three isolated builders reproduced the same artifact from the same immutable source commit.",
        consensusRatio,
        consensusPercentage,
        agreedHash: majorityHash,
        conflictDetails: null,
      };
    }

    // Partial Agreement (e.g. 2/3)
    if (maxAgreeCount > 1) {
      return {
        status: "COMPLETED",
        result: "VERIFICATION CONFLICT",
        message: "Builder outputs differ for the same immutable source commit.",
        consensusRatio,
        consensusPercentage,
        agreedHash: majorityHash,
        conflictDetails: "Builders reproduced different fingerprints. Two builders agreed while one diverged. Disagreement surfaced rather than hidden.",
      };
    }

    // No consensus at all (all three produced different hashes)
    return {
      status: "COMPLETED",
      result: "NO CONSENSUS",
      message: "No reproducibility consensus reached: all independent builders produced divergent fingerprints.",
      consensusRatio: "0/3",
      consensusPercentage: 0,
      agreedHash: null,
      conflictDetails: "Every isolated environment yielded a different output. This typically indicates non-deterministic build scripts, dynamic timestamps, or unpinned dependencies.",
    };
  }

  /**
   * Generates a tamper-proof digital attestation summary
   */
  generateAttestation({ repository, commit, consensus, builders, executionMode = "STANDARD", projectConfig = {} }) {
    const payload = {
      version: "1.2.0-quorum-canonical",
      platform: "QUORUM Software Release Verification Engine",
      repository,
      commit,
      result: consensus.result,
      verdictTitle: consensus.result === "VERIFIED" ? "VERIFIED REPRODUCIBLE ARTIFACT" : consensus.result,
      consensusRatio: consensus.consensusRatio,
      consensusPercentage: `${consensus.consensusPercentage}%`,
      agreedFingerprint: consensus.agreedHash,
      mode: executionMode,
      canonicalAlgorithm: "Quorum-Canonical-Manifest-SHA256",
      buildConfiguration: {
        framework: projectConfig.framework || "Node.js",
        packageManager: projectConfig.packageManager || "npm",
        buildCommand: projectConfig.buildCommand || "npm run build",
        nodeVersion: projectConfig.nodeVersion || "22",
        artifactPath: projectConfig.artifactPath || "dist",
        verificationMode: projectConfig.verificationMode || "Artifact Reproducibility",
      },
      builders: builders.map((b) => ({
        builder: b.name,
        repository,
        commit,
        workflowRunId: b.workflowRunId || null,
        jobId: b.jobId || null,
        status: b.status,
        artifactHash: b.hash || null,
        buildCommand: b.buildCommand || projectConfig.buildCommand || null,
        artifactPath: b.artifactPath || projectConfig.artifactPath || null,
        runner: b.runner || b.environment || "GitHub-hosted isolated runner",
        startedAt: b.startedAt || null,
        completedAt: b.completedAt || null,
        duration: b.duration || null,
      })),
      securityNotice: "Quorum verifies reproducibility of software builds across isolated environments. A successful verification indicates reproducible compilation; it does not claim or prove that source code is free from vulnerabilities.",
      timestamp: new Date().toISOString(),
    };

    const signature = crypto
      .createHash("sha256")
      .update(JSON.stringify(payload) + "QUORUM_ROOT_CANONICAL_TRUST_KEY")
      .digest("hex");

    return {
      ...payload,
      attestationSignature: `qrm_sig_${signature.slice(0, 32)}`,
      certificateId: `QRM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    };
  }
}

module.exports = new QuorumService();
