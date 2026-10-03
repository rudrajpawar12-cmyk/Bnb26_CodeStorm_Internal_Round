/**
 * Quorum Verification API Routes
 *
 * Exposes repository analysis, commit resolution, multi-builder verification,
 * tamper simulation, and audit history.
 */

const express = require("express");
const router = express.Router();
const { parseGitHubUrl, validateCommit, sanitizeText } = require("../utils/validation");
const githubService = require("../services/githubService");
const verificationService = require("../services/verificationService");
const artifactService = require("../services/artifactService");

/**
 * POST /api/analyze-repository
 * Inspects any public repository URL, resolves branch/tag to immutable commit SHA,
 * and analyzes build configuration.
 */
router.post("/analyze-repository", async (req, res) => {
  try {
    const { repository, ref } = req.body;

    // 1. Parse and validate GitHub URL / identifier
    const parsed = parseGitHubUrl(repository);
    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
        field: "repository",
      });
    }

    const { owner, repo, fullRepo } = parsed;
    const targetRef = ref ? ref.trim() : parsed.ref;

    // 2. Fetch public repository info
    let repoInfo;
    try {
      repoInfo = await githubService.fetchRepositoryInfo(owner, repo);
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        field: "repository",
      });
    }

    // 3. Resolve commit reference (branch, tag, or commit SHA)
    let commitInfo;
    try {
      commitInfo = await githubService.resolveCommitSha(
        owner,
        repo,
        targetRef,
        repoInfo.defaultBranch
      );
    } catch (err) {
      return res.status(400).json({
        error: err.message,
        field: "ref",
      });
    }

    // 4. Inspect project configuration and build scripts at target commit
    const projectConfig = await githubService.inspectProjectConfiguration(
      owner,
      repo,
      commitInfo.resolvedCommit
    );

    // Identify candidate artifact directory if not already set
    if (!projectConfig.artifactPath) {
      projectConfig.artifactPath = artifactService.identifyArtifactDirectory(
        projectConfig.projectType,
        projectConfig.buildCommand,
        projectConfig.rootFiles || []
      );
    }

    // 5. Fetch GitHub Releases and binary assets if available
    const releases = await githubService.fetchReleasesAndAssets(owner, repo);

    return res.json({
      valid: true,
      repository: fullRepo,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      ownerAvatar: repoInfo.ownerAvatar,
      visibility: repoInfo.visibility,
      defaultBranch: repoInfo.defaultBranch,
      stars: repoInfo.stars,
      forks: repoInfo.forks,
      lastUpdated: repoInfo.lastUpdated,
      description: repoInfo.description,
      language: repoInfo.language,
      // Original user input (full URL or owner/repo shorthand)
      originalUrl: parsed.originalUrl || repository,
      // Canonical GitHub HTML URL always pointing at repo root
      htmlUrl: repoInfo.htmlUrl || `https://github.com/${owner}/${repo}`,
      // Ref extracted from URL (e.g. "main" from /tree/main)
      parsedRef: parsed.ref || null,
      resolvedCommit: commitInfo.resolvedCommit,
      shortCommit: commitInfo.shortCommit,
      commitMessage: commitInfo.commitMessage,
      commitAuthor: commitInfo.author,
      commitDate: commitInfo.commitDate,
      refUsed: commitInfo.refUsed,
      projectConfig,
      releases,
    });
  } catch (error) {
    console.error("Repository analysis error:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze repository.",
    });
  }
});

/**
 * POST /api/verify
 * Initiates software release verification across isolated builders
 */
router.post("/verify", async (req, res) => {
  try {
    const { repository, commit, ref, releaseArtifact, forceSimulated, projectConfig, demoConflict } = req.body;

    const parsed = parseGitHubUrl(repository);
    if (!parsed.valid) {
      return res.status(400).json({
        error: parsed.error,
        field: "repository",
      });
    }

    const commitValidation = validateCommit(commit);
    if (!commitValidation.valid) {
      return res.status(400).json({
        error: commitValidation.error,
        field: "commit",
      });
    }

    const cleanReleaseArtifact = releaseArtifact ? sanitizeText(releaseArtifact) : null;

    const session = await verificationService.startVerification({
      repository: parsed.fullRepo,
      commit: commitValidation.commit,
      ref: ref ? sanitizeText(ref) : null,
      releaseArtifact: cleanReleaseArtifact,
      forceSimulated: Boolean(forceSimulated),
      projectConfig: projectConfig || {},
      demoConflict: Boolean(demoConflict),
    });

    return res.status(202).json({
      verificationId: session.id,
      status: session.status,
      currentStep: session.currentStep,
      mode: session.mode,
      message: session.stepMessage,
    });
  } catch (error) {
    console.error("Verification initiation failed:", error);
    return res.status(500).json({
      error: "Failed to initiate release verification. Please try again.",
      details: error.message,
    });
  }
});

/**
 * GET /api/verify/:id
 * Polls status and retrieves builder/consensus details
 */
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await verificationService.getVerificationStatus(id);

    if (!session) {
      return res.status(404).json({
        error: `Verification session '${id}' was not found.`,
      });
    }

    return res.json(session);
  } catch (error) {
    console.error("Verification polling error:", error);
    return res.status(500).json({
      error: "Error retrieving verification status.",
    });
  }
});

/**
 * POST /api/simulate-tampering
 * Demonstrates a supply-chain attack scenario by altering one builder's fingerprint
 */
router.post("/simulate-tampering", async (req, res) => {
  try {
    const { verificationId } = req.body;

    if (!verificationId) {
      return res.status(400).json({
        error: "verificationId is required to simulate tampering.",
      });
    }

    const updated = verificationService.simulateTampering(verificationId);
    return res.json(updated);
  } catch (error) {
    console.error("Simulate tampering error:", error);
    return res.status(400).json({
      error: error.message || "Failed to simulate tampering scenario.",
    });
  }
});

/**
 * GET /api/history
 * Returns verification ledger with search, filtering, and sorting
 */
router.get("/history", (req, res) => {
  try {
    const { search, status, sortBy } = req.query;
    const records = verificationService.getHistory({ search, status, sortBy });
    return res.json({
      total: records.length,
      records,
    });
  } catch (error) {
    console.error("History retrieval error:", error);
    return res.status(500).json({
      error: "Failed to retrieve verification history.",
    });
  }
});

/**
 * GET /api/demo/:type
 * Returns instant mock scenario for rapid hackathon judge presentations
 */
router.get("/demo/:type", (req, res) => {
  try {
    const { type } = req.params;
    const demo = verificationService.getDemoScenario(type);
    return res.json(demo);
  } catch (error) {
    console.error("Demo retrieval error:", error);
    return res.status(500).json({
      error: "Failed to retrieve demo data.",
    });
  }
});

/**
 * GET /api/system-status
 * Safe public diagnostics without exposing secret keys
 */
router.get("/system-status", (req, res) => {
  res.json({
    engine: "Quorum Universal Verification Engine v1.2",
    publicRepositorySupport: "Universal (Any Public GitHub Repository)",
    supportedEcosystems: ["Node.js", "React / Vite", "Next.js", "TypeScript"],
    fingerprintAlgorithm: "Canonical-Manifest-SHA256",
    githubActionsConfigured: githubService.isConfigured(),
    independentBuilders: ["Builder A", "Builder B", "Builder C"],
  });
});

module.exports = router;
