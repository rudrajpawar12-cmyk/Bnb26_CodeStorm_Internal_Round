/**
 * Quorum Verification Session Manager & Orchestrator
 *
 * Implements real GitHub Actions artifact downloading and hash comparison.
 * Eliminates fake/static fallback hashes from the real verification path.
 */

const crypto = require("crypto");
const githubService = require("./githubService");
const quorumService = require("./quorumService");
const artifactService = require("./artifactService");

// In-memory verification storage
const verifications = new Map();

// Seed initial history — clearly marked DEMO_HISTORY so UI can label them
const initialHistory = [
  {
    id: "qrm-hist-001",
    owner: "facebook",
    repo: "react",
    repository: "facebook/react",
    commit: "c55e90214a72d733ecbe12089b21844a91ad22e1",
    shortCommit: "c55e9021",
    branchOrTag: "main",
    projectType: "node",
    framework: "React",
    claimedArtifact: null,
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "COMPLETED",
    result: "VERIFIED",
    consensusRatio: "3/3",
    consensusPercentage: 100,
    duration: "24.6s",
    mode: "DEMO_HISTORY",
    isDemoHistory: true,
    builders: [
      {
        name: "Builder A",
        status: "verified",
        hash: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "22.1s",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        name: "Builder B",
        status: "verified",
        hash: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
        environment: "GitHub-hosted isolated runner (Ubuntu 22.04)",
        duration: "23.4s",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        name: "Builder C",
        status: "verified",
        hash: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "24.0s",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
    hashComparison: {
      hashA: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
      hashB: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
      hashC: "e4a821bf901cde4582aa1928470a1cb0194857201bce47102938a491827401aa",
      aEqualsB: true,
      aEqualsC: true,
      bEqualsC: true,
    },
  },
  {
    id: "qrm-hist-002",
    owner: "random-user",
    repo: "unpinned-crypto-bot",
    repository: "random-user/unpinned-crypto-bot",
    commit: "73dd19a2b84cf019eec8a33501fbb892c55e9021",
    shortCommit: "73dd19a2",
    branchOrTag: "v1.2.0",
    projectType: "node",
    framework: "Node.js",
    date: new Date(Date.now() - 3600000 * 36).toISOString(),
    status: "COMPLETED",
    result: "VERIFICATION CONFLICT",
    consensusRatio: "2/3",
    consensusPercentage: 66,
    duration: "21.0s",
    mode: "DEMO_HISTORY",
    isDemoHistory: true,
    builders: [
      {
        name: "Builder A",
        status: "verified",
        hash: "73dd19a2b84cf019eec8a33501fbb892c55e90214a72d733ecbe12089b21844a",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "18.2s",
      },
      {
        name: "Builder B",
        status: "verified",
        hash: "73dd19a2b84cf019eec8a33501fbb892c55e90214a72d733ecbe12089b21844a",
        environment: "GitHub-hosted isolated runner (Ubuntu 22.04)",
        duration: "19.1s",
      },
      {
        name: "Builder C",
        status: "conflict",
        hash: "e7f910ba451ca1892fe89104fa289c091924619d08470a1ce8832a823bb01aab",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "20.4s",
      },
    ],
    hashComparison: {
      hashA: "73dd19a2b84cf019eec8a33501fbb892c55e90214a72d733ecbe12089b21844a",
      hashB: "73dd19a2b84cf019eec8a33501fbb892c55e90214a72d733ecbe12089b21844a",
      hashC: "e7f910ba451ca1892fe89104fa289c091924619d08470a1ce8832a823bb01aab",
      aEqualsB: true,
      aEqualsC: false,
      bEqualsC: false,
    },
  },
];

initialHistory.forEach((item) => verifications.set(item.id, item));

class VerificationService {
  /**
   * Starts a new verification session
   */
  async startVerification({
    repository,
    commit,
    ref = null,
    releaseArtifact = null,
    projectConfig = {},
    demoConflict = false,
  }) {
    const id = `qrm-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const startTime = Date.now();
    const [owner, repo] = repository.split("/");

    // 1. Check if the project is verifiable
    if (projectConfig.verifiable === false) {
      const consensus = quorumService.evaluateConsensus([], releaseArtifact, {
        isNotVerifiable: true,
        unverifiableReason: projectConfig.unverifiableReason,
      });

      const session = {
        id,
        owner: owner || "unknown",
        repo: repo || repository,
        repository,
        commit,
        branchOrTag: ref || "HEAD",
        releaseArtifact: releaseArtifact || null,
        mode: "VERIFICATION_ABORTED",
        status: "COMPLETED",
        currentStep: "NOT_VERIFIABLE",
        stepMessage: projectConfig.unverifiableReason || "Repository is not verifiable.",
        createdAt: new Date().toISOString(),
        startedAt: startTime,
        projectConfig,
        builders: [],
        consensus,
        result: "NOT VERIFIABLE",
        attestation: null,
      };

      verifications.set(id, session);
      return session;
    }

    // 2. Check if Demo Conflict Mode is requested
    if (demoConflict) {
      const session = {
        id,
        owner: owner || "unknown",
        repo: repo || repository,
        repository,
        commit,
        branchOrTag: ref || "HEAD",
        releaseArtifact: releaseArtifact || null,
        mode: "DEMO MODE — SIMULATED BUILDER CONFLICT",
        isTamperedDemo: true,
        demoConflict: true,
        status: "QUEUED",
        currentStep: "INITIALIZING",
        stepMessage: "DEMO CONFLICT MODE: Initializing isolated builders (Builder C will be injected with simulated tamper)...",
        createdAt: new Date().toISOString(),
        startedAt: startTime,
        projectConfig,
        verificationMode: projectConfig?.verificationMode || "Artifact Reproducibility",
        builders: [
          {
            name: "Builder A",
            environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
            status: "waiting",
            step: "Queued",
            hash: null,
            duration: null,
            logs: [`Job queued for ${repository}@${commit.slice(0, 8)} in runner A`],
          },
          {
            name: "Builder B",
            environment: "GitHub-hosted isolated runner (Ubuntu 22.04)",
            status: "waiting",
            step: "Queued",
            hash: null,
            duration: null,
            logs: [`Job queued for ${repository}@${commit.slice(0, 8)} in runner B`],
          },
          {
            name: "Builder C",
            environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
            status: "waiting",
            step: "Queued",
            hash: null,
            duration: null,
            logs: [
              `Job queued for ${repository}@${commit.slice(0, 8)} in runner C`,
              `[DEMO MODE] Tamper injection scheduled after build completion.`,
            ],
          },
        ],
        result: null,
        consensus: null,
        attestation: null,
      };

      verifications.set(id, session);
      return session;
    }

    // 3. Normal Verification: Must use GitHub Actions
    if (!githubService.isConfigured()) {
      // GITHUB_TOKEN is not configured in environment!
      // Do NOT fabricate fake hashes! Return honest NOT_VERIFIABLE state explaining the missing prerequisite.
      const session = {
        id,
        owner: owner || "unknown",
        repo: repo || repository,
        repository,
        commit,
        branchOrTag: ref || "HEAD",
        releaseArtifact: releaseArtifact || null,
        mode: "GITHUB_ACTIONS_REQUIRED",
        status: "COMPLETED",
        currentStep: "NOT_VERIFIABLE",
        stepMessage:
          "Real verification requires GITHUB_TOKEN configured in backend/.env to dispatch isolated GitHub Actions runners. Please set GITHUB_TOKEN in backend/.env, or use 'Simulate Builder Conflict' for a presentation demo.",
        createdAt: new Date().toISOString(),
        startedAt: startTime,
        projectConfig,
        builders: [],
        consensus: {
          status: "COMPLETED",
          result: "NOT VERIFIABLE",
          message:
            "GITHUB_TOKEN is not configured in backend/.env. Real multi-builder execution requires GitHub Actions dispatch authorization.",
          consensusRatio: "0/0",
          consensusPercentage: 0,
          agreedHash: null,
        },
        result: "NOT VERIFIABLE",
        attestation: null,
      };

      verifications.set(id, session);
      return session;
    }

    // 4. Dispatch Real GitHub Actions Workflow
    const session = {
      id,
      owner: owner || "unknown",
      repo: repo || repository,
      repository,
      commit,
      branchOrTag: ref || "HEAD",
      releaseArtifact: releaseArtifact || null,
      mode: "GITHUB_ACTIONS",
      status: "QUEUED",
      currentStep: "INITIALIZING",
      stepMessage: `Resolved commit ${commit.slice(0, 8)} for ${repository}. Dispatching GitHub Actions runners...`,
      createdAt: new Date().toISOString(),
      startedAt: startTime,
      githubRunId: null,
      projectConfig,
      verificationMode: projectConfig?.verificationMode || "Artifact Reproducibility",
      builders: [
        {
          name: "Builder A",
          environment: `GitHub-hosted isolated runner (Ubuntu 24.04, Node ${projectConfig.nodeVersion || "22"})`,
          status: "waiting",
          step: "Queued",
          hash: null,
          duration: null,
          logs: [`Job queued in GitHub Actions cluster`],
        },
        {
          name: "Builder B",
          environment: `GitHub-hosted isolated runner (Ubuntu 22.04, Node ${projectConfig.nodeVersion || "22"})`,
          status: "waiting",
          step: "Queued",
          hash: null,
          duration: null,
          logs: [`Job queued in GitHub Actions cluster`],
        },
        {
          name: "Builder C",
          environment: `GitHub-hosted isolated runner (Ubuntu 24.04, Node ${projectConfig.nodeVersion || "22"})`,
          status: "waiting",
          step: "Queued",
          hash: null,
          duration: null,
          logs: [`Job queued in GitHub Actions cluster`],
        },
      ],
      result: null,
      consensus: null,
      attestation: null,
    };

    verifications.set(id, session);

    try {
      const dispatchResult = await githubService.triggerVerificationWorkflow(repository, commit, {
        nodeVersion: projectConfig.nodeVersion,
        installCommand: projectConfig.installCommand,
        buildCommand: projectConfig.buildCommand,
        artifactPath: projectConfig.artifactPath,
        verificationMode: projectConfig.verificationMode,
        projectType: projectConfig.projectType,
        demoConflict: false,
      });
      session.dispatchResult = dispatchResult;
      session.stepMessage = `Dispatched GitHub Actions verification workflow for ${repository}.`;
    } catch (err) {
      console.error("GitHub Actions dispatch failed:", err.message);
      session.status = "FAILED";
      session.result = "NOT VERIFIABLE";
      session.stepMessage = `GitHub Actions dispatch error: ${err.message}`;
    }

    return session;
  }

  /**
   * Retrieves current status and steps for active or completed verification
   */
  async getVerificationStatus(id) {
    const session = verifications.get(id);
    if (!session) return null;

    if (session.status === "COMPLETED" || session.status === "FAILED") {
      return session;
    }

    // Handle DEMO CONFLICT MODE (Simulated Conflict Demonstration for judges)
    if (session.demoConflict) {
      const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
      const artifactDir = session.projectConfig?.artifactPath || "dist";

      if (elapsedSeconds < 2.0) {
        session.status = "INITIALIZING";
        session.currentStep = "INITIALIZING";
        session.stepMessage = `[DEMO CONFLICT] Resolving commit ${session.commit.slice(0, 8)}...`;
      } else if (elapsedSeconds < 4.5) {
        session.status = "RUNNING";
        session.currentStep = "BUILD_VERIFICATION";
        session.stepMessage = "[DEMO CONFLICT] Builders A, B, and C reproducing build from source in parallel...";
        session.builders[0].status = "running";
        session.builders[1].status = "running";
        session.builders[2].status = "running";
      } else if (elapsedSeconds < 7.0) {
        session.status = "RUNNING";
        session.currentStep = "HASHING";
        session.stepMessage = "[DEMO CONFLICT] Calculating fingerprints: Intentionally altering Builder C artifact...";
        session.builders[0].status = "verified";
        session.builders[1].status = "verified";
        session.builders[2].status = "running";
      } else {
        // Complete Demo Conflict
        const baseManifest = artifactService.generateSimulatedArtifactManifest(
          session.repository,
          session.commit,
          artifactDir,
          false
        );
        const tamperedManifest = artifactService.generateSimulatedArtifactManifest(
          session.repository,
          session.commit,
          artifactDir,
          true
        );

        const hashA = baseManifest.canonicalFingerprint;
        const hashB = baseManifest.canonicalFingerprint;
        const hashC = tamperedManifest.canonicalFingerprint;

        session.builders[0].status = "verified";
        session.builders[0].hash = hashA;
        session.builders[0].duration = "16.2s";
        session.builders[0].runner = "GitHub-hosted isolated runner (Ubuntu 24.04)";

        session.builders[1].status = "verified";
        session.builders[1].hash = hashB;
        session.builders[1].duration = "16.8s";
        session.builders[1].runner = "GitHub-hosted isolated runner (Ubuntu 22.04)";

        session.builders[2].status = "conflict";
        session.builders[2].hash = hashC;
        session.builders[2].duration = "17.1s";
        session.builders[2].runner = "GitHub-hosted isolated runner (Ubuntu 24.04)";
        session.builders[2].logs.push(
          "⚠️ [DEMO CONFLICT] Injected tamper signature into artifact after build.",
          `Canonical digest diverted to: ${hashC}`
        );

        console.log("\n==========================================");
        console.log(`[QUORUM DEMO CONFLICT] FINGERPRINT COMPARISON:`);
        console.log(`BUILDER A HASH = ${hashA}`);
        console.log(`BUILDER B HASH = ${hashB}`);
        console.log(`BUILDER C HASH = ${hashC}`);
        console.log("==========================================\n");

        const consensus = quorumService.evaluateConsensus(session.builders, session.releaseArtifact);
        session.consensus = consensus;
        session.result = "VERIFICATION CONFLICT";
        session.status = "COMPLETED";
        session.currentStep = "QUORUM_ANALYSIS";
        session.stepMessage = "Independent builders produced different artifact fingerprints (2/3 consensus).";

        session.hashComparison = {
          hashA,
          hashB,
          hashC,
          aEqualsB: true,
          aEqualsC: false,
          bEqualsC: false,
        };
      }
      return session;
    }

    // Handle Real GitHub Actions polling
    if (session.mode.startsWith("GITHUB_ACTIONS")) {
      try {
        const matchingRun = await githubService.findWorkflowRun(session.createdAt);
        if (matchingRun) {
          session.githubRunId = matchingRun.id;
          session.githubRunUrl = matchingRun.html_url;

          if (matchingRun.status === "in_progress" || matchingRun.status === "queued") {
            session.status = "RUNNING";
            session.currentStep = "BUILD_VERIFICATION";
            session.stepMessage = `GitHub Actions run #${matchingRun.run_number} executing isolated builders in parallel...`;

            const jobs = await githubService.getRunJobs(matchingRun.id);
            jobs.forEach((job) => {
              const nameLower = job.name.toLowerCase();
              let targetIndex = -1;
              if (nameLower.includes("builder a")) targetIndex = 0;
              else if (nameLower.includes("builder b")) targetIndex = 1;
              else if (nameLower.includes("builder c")) targetIndex = 2;

              if (targetIndex >= 0) {
                session.builders[targetIndex].status =
                  job.status === "completed"
                    ? job.conclusion === "success"
                      ? "verified"
                      : "failed"
                    : "running";
                session.builders[targetIndex].step =
                  job.status === "completed"
                    ? job.conclusion === "success"
                      ? "Build and fingerprint complete"
                      : "Build failed"
                    : "Compiling from source";
              }
            });
          } else if (matchingRun.status === "completed") {
            // Workflow complete!
            // Retrieve actual artifacts from GitHub API
            const artifacts = await githubService.getRunArtifacts(matchingRun.id);
            const jobs = await githubService.getRunJobs(matchingRun.id);

            const artA = artifacts.find((a) => a.name === "builder-a-result");
            const artB = artifacts.find((a) => a.name === "builder-b-result");
            const artC = artifacts.find((a) => a.name === "builder-c-result");

            const resA = artA ? await githubService.downloadAndExtractJsonArtifact(artA.id) : null;
            const resB = artB ? await githubService.downloadAndExtractJsonArtifact(artB.id) : null;
            const resC = artC ? await githubService.downloadAndExtractJsonArtifact(artC.id) : null;

            // Extract job logs as backup/supplement
            let logHashA = null;
            let logHashB = null;
            let logHashC = null;

            for (const job of jobs) {
              const jName = job.name.toLowerCase();
              if (jName.includes("builder a") && (!resA || !resA.artifactHash)) {
                const logs = await githubService.getJobLog(job.id);
                const m = logs ? logs.match(/BUILDER_A_HASH=([a-f0-9]{64})/i) : null;
                if (m) logHashA = m[1];
              } else if (jName.includes("builder b") && (!resB || !resB.artifactHash)) {
                const logs = await githubService.getJobLog(job.id);
                const m = logs ? logs.match(/BUILDER_B_HASH=([a-f0-9]{64})/i) : null;
                if (m) logHashB = m[1];
              } else if (jName.includes("builder c") && (!resC || !resC.artifactHash)) {
                const logs = await githubService.getJobLog(job.id);
                const m = logs ? logs.match(/BUILDER_C_HASH=([a-f0-9]{64})/i) : null;
                if (m) logHashC = m[1];
              }
            }

            const hashA = resA?.artifactHash || logHashA || null;
            const hashB = resB?.artifactHash || logHashB || null;
            const hashC = resC?.artifactHash || logHashC || null;

            // Check job conclusions
            const jobA = jobs.find((j) => j.name.toLowerCase().includes("builder a"));
            const jobB = jobs.find((j) => j.name.toLowerCase().includes("builder b"));
            const jobC = jobs.find((j) => j.name.toLowerCase().includes("builder c"));

            session.builders[0].status = jobA?.conclusion === "success" && hashA ? "verified" : "failed";
            session.builders[0].hash = hashA;
            session.builders[0].buildCommand = resA?.buildCommand || session.projectConfig?.buildCommand;
            session.builders[0].runner = resA?.runner || "GitHub-hosted isolated runner (Ubuntu 24.04)";
            session.builders[0].workflowRunId = matchingRun.id ? String(matchingRun.id) : null;
            session.builders[0].jobId = jobA?.id ? String(jobA.id) : null;
            session.builders[0].startedAt = resA?.timestamp || jobA?.started_at || null;
            session.builders[0].completedAt = jobA?.completed_at || null;

            session.builders[1].status = jobB?.conclusion === "success" && hashB ? "verified" : "failed";
            session.builders[1].hash = hashB;
            session.builders[1].buildCommand = resB?.buildCommand || session.projectConfig?.buildCommand;
            session.builders[1].runner = resB?.runner || "GitHub-hosted isolated runner (Ubuntu 22.04)";
            session.builders[1].workflowRunId = matchingRun.id ? String(matchingRun.id) : null;
            session.builders[1].jobId = jobB?.id ? String(jobB.id) : null;
            session.builders[1].startedAt = resB?.timestamp || jobB?.started_at || null;
            session.builders[1].completedAt = jobB?.completed_at || null;

            session.builders[2].status = jobC?.conclusion === "success" && hashC ? "verified" : "failed";
            session.builders[2].hash = hashC;
            session.builders[2].buildCommand = resC?.buildCommand || session.projectConfig?.buildCommand;
            session.builders[2].runner = resC?.runner || "GitHub-hosted isolated runner (Ubuntu 24.04)";
            session.builders[2].workflowRunId = matchingRun.id ? String(matchingRun.id) : null;
            session.builders[2].jobId = jobC?.id ? String(jobC.id) : null;
            session.builders[2].startedAt = resC?.timestamp || jobC?.started_at || null;
            session.builders[2].completedAt = jobC?.completed_at || null;

            // Store top-level workflowRunId on the session for easy access
            session.workflowRunId = matchingRun.id ? String(matchingRun.id) : null;
            session.workflowRunUrl = `https://github.com/${githubService.owner}/${githubService.repo}/actions/runs/${matchingRun.id}`;

            // REQUIREMENT 20: Print/log individual hashes
            console.log("\n==========================================");
            console.log(`[QUORUM GITHUB ACTIONS] REAL BUILD RESULTS:`);
            console.log(`BUILDER A HASH = ${hashA}`);
            console.log(`BUILDER B HASH = ${hashB}`);
            console.log(`BUILDER C HASH = ${hashC}`);
            console.log("==========================================\n");

            // Evaluate Quorum consensus on REAL builder outputs
            const consensus = quorumService.evaluateConsensus(session.builders, session.releaseArtifact);
            session.consensus = consensus;
            session.result = consensus.result;
            session.status = "COMPLETED";
            session.currentStep = "QUORUM_ANALYSIS";
            session.stepMessage = consensus.message;

            // Hash Comparison debug data
            session.hashComparison = {
              hashA,
              hashB,
              hashC,
              aEqualsB: Boolean(hashA && hashB && hashA === hashB),
              aEqualsC: Boolean(hashA && hashC && hashA === hashC),
              bEqualsC: Boolean(hashB && hashC && hashB === hashC),
            };

            if (session.result === "VERIFIED") {
              session.attestation = quorumService.generateAttestation({
                repository: session.repository,
                commit: session.commit,
                consensus,
                builders: session.builders,
                executionMode: "GITHUB_ACTIONS",
                projectConfig: session.projectConfig,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error polling GitHub Actions:", err.message);
      }
      return session;
    }

    return session;
  }

  /**
   * Simulates builder tampering for hackathon demonstration
   */
  simulateTampering(verificationId) {
    const session = verifications.get(verificationId);
    if (!session) {
      throw new Error(`Verification session '${verificationId}' not found.`);
    }

    const artifactDir = session.projectConfig?.artifactPath || "dist";
    const tamperedManifest = artifactService.generateSimulatedArtifactManifest(
      session.repository,
      session.commit,
      artifactDir,
      true
    );

    session.isTamperedDemo = true;
    session.mode = "DEMO MODE — SIMULATED BUILDER CONFLICT";

    // Builder C receives the divergent hash
    const hashA = session.builders[0]?.hash || "UNKNOWN";
    const hashB = session.builders[1]?.hash || "UNKNOWN";
    const hashC = tamperedManifest.canonicalFingerprint;

    session.builders[2].hash = hashC;
    session.builders[2].status = "conflict";
    session.builders[2].logs.push(
      "⚠️ [DEMO CONFLICT] Injected tamper signature into artifact after build.",
      `Canonical fingerprint diverted: ${hashC}`
    );

    console.log("\n==========================================");
    console.log(`[QUORUM DEMO CONFLICT SIMULATION]:`);
    console.log(`BUILDER A HASH = ${hashA}`);
    console.log(`BUILDER B HASH = ${hashB}`);
    console.log(`BUILDER C HASH = ${hashC}`);
    console.log("==========================================\n");

    // Re-evaluate consensus (will yield VERIFICATION CONFLICT 2/3)
    const consensus = quorumService.evaluateConsensus(session.builders, session.releaseArtifact);
    session.consensus = consensus;
    session.result = "VERIFICATION CONFLICT";

    session.hashComparison = {
      hashA,
      hashB,
      hashC,
      aEqualsB: hashA === hashB,
      aEqualsC: false,
      bEqualsC: false,
    };

    return session;
  }

  /**
   * Queries historical records with search, filter, and sort
   */
  getHistory({ search = "", status = "ALL", sortBy = "date_desc" } = {}) {
    let list = Array.from(verifications.values());

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.repository?.toLowerCase().includes(q) ||
          item.owner?.toLowerCase().includes(q) ||
          item.repo?.toLowerCase().includes(q) ||
          item.commit?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q)
      );
    }

    if (status && status !== "ALL") {
      list = list.filter((item) => (item.result || item.status) === status);
    }

    list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      if (sortBy === "date_asc") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }

  /**
   * Returns instant preconfigured demo datasets for judges
   */
  getDemoScenario(type = "conflict") {
    const baseRepo = "vitejs/vite";
    const commit = "91af82e430da275685dfbc599a00b8e723553258";
    const agreedHash = "91af82e430da275685dfbc599a00b8e723553258c701f016abef9eefca88921b";

    if (type === "conflict" || type === "demo_conflict") {
      const tamperedHash = "73kd19a2b84cf019eec8a33501fbb892c55e90214a72d733ecbe12089b21844a";
      const builders = [
        {
          name: "Builder A",
          status: "verified",
          hash: agreedHash,
          buildCommand: "npm run build",
          environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
          duration: "16.2s",
        },
        {
          name: "Builder B",
          status: "verified",
          hash: agreedHash,
          buildCommand: "npm run build",
          environment: "GitHub-hosted isolated runner (Ubuntu 22.04)",
          duration: "16.9s",
        },
        {
          name: "Builder C",
          status: "conflict",
          hash: tamperedHash,
          buildCommand: "npm run build",
          environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
          duration: "17.1s",
          logs: ["⚠️ [DEMO CONFLICT] Injected tamper signature into artifact after build."],
        },
      ];

      const consensus = quorumService.evaluateConsensus(builders);
      return {
        id: "demo-conflict-record",
        owner: "vitejs",
        repo: "vite",
        repository: baseRepo,
        commit,
        mode: "DEMO MODE — SIMULATED BUILDER CONFLICT",
        isTamperedDemo: true,
        status: "COMPLETED",
        result: "VERIFICATION CONFLICT",
        consensus,
        builders,
        hashComparison: {
          hashA: agreedHash,
          hashB: agreedHash,
          hashC: tamperedHash,
          aEqualsB: true,
          aEqualsC: false,
          bEqualsC: false,
        },
      };
    }

    if (type === "no_consensus") {
      const hA = "1111111111111111111111111111111111111111111111111111111111111111";
      const hB = "2222222222222222222222222222222222222222222222222222222222222222";
      const hC = "3333333333333333333333333333333333333333333333333333333333333333";
      const builders = [
        { name: "Builder A", status: "verified", hash: hA, duration: "14.2s" },
        { name: "Builder B", status: "verified", hash: hB, duration: "15.0s" },
        { name: "Builder C", status: "verified", hash: hC, duration: "14.8s" },
      ];
      const consensus = quorumService.evaluateConsensus(builders);
      return {
        id: "demo-no-consensus",
        owner: "unstable-lab",
        repo: "nondeterministic-project",
        repository: "unstable-lab/nondeterministic-project",
        commit,
        mode: "DEMO MODE",
        status: "COMPLETED",
        result: "NO CONSENSUS",
        consensus,
        builders,
        hashComparison: {
          hashA: hA,
          hashB: hB,
          hashC: hC,
          aEqualsB: false,
          aEqualsC: false,
          bEqualsC: false,
        },
      };
    }

    if (type === "failed") {
      const builders = [
        { name: "Builder A", status: "verified", hash: agreedHash, duration: "14.2s" },
        { name: "Builder B", status: "failed", hash: null, duration: "6.1s", logs: ["Error: rollup build failed with exit code 1"] },
        { name: "Builder C", status: "verified", hash: agreedHash, duration: "14.5s" },
      ];
      const consensus = quorumService.evaluateConsensus(builders);
      return {
        id: "demo-failed-record",
        owner: "broken-repo",
        repo: "build-error-example",
        repository: "broken-repo/build-error-example",
        commit,
        mode: "DEMO MODE",
        status: "COMPLETED",
        result: "BUILD FAILED",
        consensus,
        builders,
      };
    }

    // Default Verified Demo
    const builders = [
      {
        name: "Builder A",
        status: "verified",
        hash: agreedHash,
        buildCommand: "npm run build",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "16.2s",
      },
      {
        name: "Builder B",
        status: "verified",
        hash: agreedHash,
        buildCommand: "npm run build",
        environment: "GitHub-hosted isolated runner (Ubuntu 22.04)",
        duration: "16.8s",
      },
      {
        name: "Builder C",
        status: "verified",
        hash: agreedHash,
        buildCommand: "npm run build",
        environment: "GitHub-hosted isolated runner (Ubuntu 24.04)",
        duration: "17.0s",
      },
    ];

    const consensus = quorumService.evaluateConsensus(builders);
    return {
      id: "demo-verified-record",
      owner: "vitejs",
      repo: "vite",
      repository: baseRepo,
      commit,
      mode: "DEMO MODE",
      status: "COMPLETED",
      result: "VERIFIED",
      consensus,
      builders,
      hashComparison: {
        hashA: agreedHash,
        hashB: agreedHash,
        hashC: agreedHash,
        aEqualsB: true,
        aEqualsC: true,
        bEqualsC: true,
      },
      attestation: quorumService.generateAttestation({
        repository: baseRepo,
        commit,
        consensus,
        builders,
        executionMode: "DEMO_VERIFIED",
      }),
    };
  }
}

module.exports = new VerificationService();
