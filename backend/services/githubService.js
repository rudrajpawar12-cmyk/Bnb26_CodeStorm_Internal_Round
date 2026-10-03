/**
 * GitHub API Service for Quorum
 *
 * Provides:
 * - Dynamic public repository metadata extraction
 * - Branch / Tag / Ref resolution to immutable commit SHAs
 * - Deep project structure inspection (package.json, lockfiles, engines, build scripts)
 * - GitHub Releases and asset discovery
 * - GitHub Actions workflow triggering and polling
 * - In-memory TTL caching to respect GitHub rate limits
 */

const axios = require("axios");

class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN || "";
    this.owner = process.env.GITHUB_OWNER || "yashnanavare6";
    this.repo = process.env.GITHUB_REPO || "Bit";
    this.workflow = process.env.GITHUB_WORKFLOW || "verify.yml";

    // 5-minute in-memory cache to prevent burning rate limits
    this.cache = new Map();
    this.CACHE_TTL_MS = 5 * 60 * 1000;
  }

  isConfigured() {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  getHeaders() {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Quorum-Verification-Engine",
    };
    if (this.token && this.token.trim().length > 0) {
      headers.Authorization = `Bearer ${this.token.trim()}`;
    }
    return headers;
  }

  _getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  _setCached(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetches public repository metadata from GitHub
   */
  async fetchRepositoryInfo(owner, repo) {
    const cacheKey = `repo-info:${owner}/${repo}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const url = `https://api.github.com/repos/${owner}/${repo}`;

    try {
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const d = response.data;

      if (d.private) {
        throw new Error("Private repositories require appropriate GitHub authorization.");
      }

      const info = {
        owner: d.owner.login,
        ownerAvatar: d.owner.avatar_url,
        repo: d.name,
        fullName: d.full_name,
        isPrivate: false,
        visibility: "Public",
        defaultBranch: d.default_branch || "main",
        stars: d.stargazers_count || 0,
        forks: d.forks_count || 0,
        openIssues: d.open_issues_count || 0,
        lastUpdated: d.updated_at,
        pushedAt: d.pushed_at,
        description: d.description || "No description provided.",
        language: d.language || "Unknown",
        topics: d.topics || [],
        htmlUrl: d.html_url,
      };

      this._setCached(cacheKey, info);
      return info;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error(`Repository '${owner}/${repo}' was not found on GitHub. Check spelling or ensure it is public.`);
      }
      if (err.response?.status === 403 && err.response?.data?.message?.includes("rate limit")) {
        throw new Error("GitHub API rate limit reached. Please try again later or configure GITHUB_TOKEN.");
      }
      throw new Error(err.message || "Failed to fetch repository information from GitHub.");
    }
  }

  /**
   * Resolves a branch name, tag, or partial ref to an exact 40-character immutable commit SHA
   */
  async resolveCommitSha(owner, repo, ref, defaultBranch = "main") {
    const targetRef = (ref && ref.trim()) || defaultBranch;
    const cacheKey = `commit-resolve:${owner}/${repo}@${targetRef}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    // Check if it's already a full 40-character SHA
    const isFullSha = /^[0-9a-fA-F]{40}$/.test(targetRef);

    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${targetRef}`;

    try {
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const commitData = response.data;
      const resolved = {
        resolvedCommit: commitData.sha,
        shortCommit: commitData.sha.slice(0, 8),
        commitMessage: commitData.commit?.message?.split("\n")[0] || "",
        author: commitData.commit?.author?.name || "Unknown",
        commitDate: commitData.commit?.author?.date || new Date().toISOString(),
        refUsed: targetRef,
        isExactShaProvided: isFullSha,
      };

      this._setCached(cacheKey, resolved);
      return resolved;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error(`Commit, branch, or tag '${targetRef}' could not be found in repository '${owner}/${repo}'.`);
      }
      throw new Error(`Failed to resolve commit reference for '${targetRef}': ${err.message}`);
    }
  }

  /**
   * Deeply inspects repository files at the target commit to detect:
   * - project type (React/Vite, Next.js, Node.js, Python, Go, Rust, Java)
   * - package manager (npm, yarn, pnpm)
   * - build script
   * - node version
   */
  async inspectProjectConfiguration(owner, repo, commitSha) {
    const cacheKey = `config-inspect:${owner}/${repo}@${commitSha}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      // 1. Fetch root directory contents
      const rootUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${commitSha}`;
      const rootRes = await axios.get(rootUrl, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const rootFiles = Array.isArray(rootRes.data) ? rootRes.data.map((item) => item.name) : [];

      // 2. Check for JavaScript / Node.js
      let pkgPath = null;
      let subDir = "";
      if (rootFiles.includes("package.json")) {
        pkgPath = "package.json";
      } else if (rootFiles.includes("frontend")) {
        pkgPath = "frontend/package.json";
        subDir = "frontend";
      } else if (rootFiles.includes("client")) {
        pkgPath = "client/package.json";
        subDir = "client";
      }

      if (pkgPath) {
        // Fetch package.json content
        const pkgUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pkgPath}?ref=${commitSha}`;
        const pkgRes = await axios.get(pkgUrl, {
          headers: this.getHeaders(),
          timeout: 10000,
        });

        let pkgJson = {};
        if (pkgRes.data.content) {
          const raw = Buffer.from(pkgRes.data.content, "base64").toString("utf-8");
          try {
            pkgJson = JSON.parse(raw);
          } catch (e) {
            console.warn("Failed to parse package.json:", e.message);
          }
        }

        // Framework Detection
        const allDeps = {
          ...(pkgJson.dependencies || {}),
          ...(pkgJson.devDependencies || {}),
        };

        let framework = "Node.js";
        if (allDeps.next || rootFiles.some((f) => f.startsWith("next.config"))) {
          framework = "Next.js";
        } else if (allDeps.vite || rootFiles.some((f) => f.startsWith("vite.config"))) {
          framework = "React / Vite";
        } else if (allDeps.react) {
          framework = "React";
        } else if (allDeps.vue) {
          framework = "Vue.js";
        } else if (allDeps.express) {
          framework = "Node.js (Express)";
        }

        // Package Manager Detection
        let packageManager = "npm";
        let installCommand = "npm ci";

        if (rootFiles.includes("pnpm-lock.yaml")) {
          packageManager = "pnpm";
          installCommand = "pnpm install --frozen-lockfile";
        } else if (rootFiles.includes("yarn.lock")) {
          packageManager = "yarn";
          installCommand = "yarn install --frozen-lockfile";
        } else if (rootFiles.includes("package-lock.json")) {
          packageManager = "npm";
          installCommand = "npm ci";
        } else {
          packageManager = "npm";
          installCommand = "npm install";
        }

        // Build Script Detection
        const scripts = pkgJson.scripts || {};
        let buildScript = null;
        let buildCommand = null;

        if (scripts.build) {
          buildScript = "build";
          buildCommand = `${packageManager === "yarn" ? "yarn" : `${packageManager} run`} build`;
        } else if (scripts.compile) {
          buildScript = "compile";
          buildCommand = `${packageManager === "yarn" ? "yarn" : `${packageManager} run`} compile`;
        }

        // Node Version Detection
        let nodeVersion = "22";
        if (pkgJson.engines?.node) {
          const match = pkgJson.engines.node.match(/\d+/);
          if (match) nodeVersion = match[0];
        }

        // Check for .nvmrc or .node-version
        if (rootFiles.includes(".nvmrc") || rootFiles.includes(".node-version")) {
          const nvFile = rootFiles.includes(".nvmrc") ? ".nvmrc" : ".node-version";
          try {
            const nvUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${nvFile}?ref=${commitSha}`;
            const nvRes = await axios.get(nvUrl, { headers: this.getHeaders(), timeout: 5000 });
            if (nvRes.data.content) {
              const rawNv = Buffer.from(nvRes.data.content, "base64").toString("utf-8").trim();
              const match = rawNv.match(/\d+/);
              if (match) nodeVersion = match[0];
            }
          } catch (e) {
            // Ignore optional file read errors
          }
        }

        // Determine if Verifiable
        if (!buildCommand) {
          // If no build script, check if this repository contains a static HTML entrypoint
          const hasStaticHtml = rootFiles.includes("index.html") || rootFiles.some((f) => f.endsWith(".html"));
          if (hasStaticHtml) {
            const config = {
              projectType: "Static Website",
              verificationMode: "Artifact Reproducibility",
              buildSystem: "None",
              framework: "Static HTML",
              packageManager: "None",
              installCommand: "None",
              buildCommand: "Static file packaging",
              nodeVersion: null,
              artifactPath: "site",
              verifiable: true,
              unverifiableReason: null,
              rootFiles,
            };
            this._setCached(cacheKey, config);
            return config;
          }

          const result = {
            projectType: "Node.js",
            verificationMode: "Artifact Reproducibility",
            buildSystem: "npm",
            framework,
            packageManager,
            installCommand,
            buildScript: null,
            buildCommand: "None",
            nodeVersion,
            artifactPath: "dist",
            verifiable: false,
            unverifiableReason: "package.json does not define a 'build' or 'compile' script, and no static HTML entrypoint was detected. Quorum does not fabricate build commands for non-compilable repositories.",
            rootFiles,
          };
          this._setCached(cacheKey, result);
          return result;
        }

        let artifactPath = framework === "Next.js" ? ".next" : "dist";

        let finalInstall = installCommand;
        let finalBuild = buildCommand;
        let finalArtifact = artifactPath;

        if (subDir) {
          finalInstall = `cd ${subDir} && (${installCommand} || npm install)`;
          finalBuild = `cd ${subDir} && ${buildCommand}`;
          finalArtifact = `${subDir}/${artifactPath}`;
        }

        const config = {
          projectType: `Node.js (${framework})`,
          verificationMode: "Artifact Reproducibility",
          buildSystem: framework,
          framework,
          packageManager,
          installCommand: finalInstall,
          buildScript,
          buildCommand: finalBuild,
          nodeVersion,
          artifactPath: finalArtifact,
          verifiable: true,
          unverifiableReason: null,
          rootFiles,
        };

        this._setCached(cacheKey, config);
        return config;
      }

      // 3. Check for Static Website (index.html or HTML/CSS/JS without package manager)
      const hasRootHtml = rootFiles.includes("index.html") || rootFiles.some((f) => f.endsWith(".html") || f.endsWith(".htm"));
      if (hasRootHtml) {
        const config = {
          projectType: "Static Website",
          verificationMode: "Artifact Reproducibility",
          buildSystem: "None",
          framework: "Static HTML/CSS/JS",
          packageManager: "None",
          installCommand: "None",
          buildCommand: "Static file packaging",
          nodeVersion: null,
          artifactPath: "site",
          verifiable: true,
          unverifiableReason: null,
          rootFiles,
        };
        this._setCached(cacheKey, config);
        return config;
      }

      // 4. Check for Python (Dual Mode: PYTHON_PACKAGE vs PYTHON_SCRIPT_SERVICE)
      if (rootFiles.includes("pyproject.toml") || rootFiles.includes("setup.py") || rootFiles.includes("setup.cfg") || rootFiles.includes("requirements.txt")) {
        const hasManifest = rootFiles.includes("pyproject.toml") || rootFiles.includes("setup.py") || rootFiles.includes("setup.cfg");
        if (hasManifest) {
          // PYTHON_PACKAGE: wheel / sdist artifact reproducibility
          const buildSys = rootFiles.includes("pyproject.toml") ? "pyproject.toml" : "setuptools";
          const config = {
            projectType: "Python (Package)",
            verificationMode: "Artifact Reproducibility",
            buildSystem: buildSys,
            framework: "Python Package",
            packageManager: "pip",
            installCommand: "python3 -m pip install --upgrade build setuptools wheel || true",
            buildScript: "python3 -m build",
            buildCommand: "python3 -m build --outdir dist/ || (python3 setup.py sdist bdist_wheel --dist-dir dist/ 2>/dev/null || python3 -m pip wheel . -w dist/ --no-deps)",
            nodeVersion: null,
            artifactPath: "dist",
            verifiable: true,
            unverifiableReason: null,
            rootFiles,
          };
          this._setCached(cacheKey, config);
          return config;
        } else {
          // PYTHON_SCRIPT_SERVICE: requirements.txt exists without packaging manifest
          const config = {
            projectType: "Python (Script / Service)",
            verificationMode: "Source Reproducibility",
            buildSystem: "None",
            framework: "Python Script / Service",
            packageManager: "pip",
            installCommand: "pip install -r requirements.txt",
            buildScript: null,
            buildCommand: "None",
            nodeVersion: null,
            artifactPath: "N/A",
            verifiable: true,
            unverifiableReason: null,
            rootFiles,
          };
          this._setCached(cacheKey, config);
          return config;
        }
      }

      // 5. Check for Go
      if (rootFiles.includes("go.mod")) {
        const config = {
          projectType: "Go",
          verificationMode: "Artifact Reproducibility",
          buildSystem: "Go Modules",
          framework: "Go Module",
          packageManager: "go",
          installCommand: "go mod download || true",
          buildScript: "go build",
          buildCommand: "mkdir -p bin && CGO_ENABLED=0 go build -trimpath -o bin/ ./... || go build -trimpath -o bin/app .",
          nodeVersion: null,
          artifactPath: "bin",
          verifiable: true,
          unverifiableReason: null,
          rootFiles,
        };
        this._setCached(cacheKey, config);
        return config;
      }

      // 6. Check for Rust
      if (rootFiles.includes("Cargo.toml")) {
        const config = {
          projectType: "Rust",
          verificationMode: "Artifact Reproducibility",
          buildSystem: "Cargo",
          framework: "Cargo Crate",
          packageManager: "cargo",
          installCommand: "cargo fetch || true",
          buildScript: "cargo build --release",
          buildCommand: "cargo build --release --locked || cargo build --release",
          nodeVersion: null,
          artifactPath: "target/release",
          verifiable: true,
          unverifiableReason: null,
          rootFiles,
        };
        this._setCached(cacheKey, config);
        return config;
      }

      // 7. Check for Java (Maven or Gradle)
      if (rootFiles.includes("pom.xml") || rootFiles.includes("build.gradle") || rootFiles.includes("build.gradle.kts") || rootFiles.includes("gradlew")) {
        const isMaven = rootFiles.includes("pom.xml");
        const config = {
          projectType: isMaven ? "Java (Maven)" : "Java (Gradle)",
          verificationMode: "Artifact Reproducibility",
          buildSystem: isMaven ? "Maven" : "Gradle",
          framework: isMaven ? "Maven" : "Gradle",
          packageManager: isMaven ? "mvn" : "gradle",
          installCommand: isMaven ? "mvn dependency:resolve || true" : "chmod +x ./gradlew 2>/dev/null || true",
          buildScript: isMaven ? "package" : "build",
          buildCommand: isMaven
            ? "(if [ -f mvnw ]; then ./mvnw clean package -DskipTests; else mvn -B clean package -DskipTests; fi)"
            : "(if [ -f gradlew ]; then ./gradlew build -x test; else gradle build -x test; fi)",
          nodeVersion: null,
          artifactPath: isMaven ? "target" : "build/libs",
          verifiable: true,
          unverifiableReason: null,
          rootFiles,
        };
        this._setCached(cacheKey, config);
        return config;
      }

      // Unsupported / Non-Verifiable Project Type
      const config = {
        projectType: "Unknown",
        verificationMode: "None",
        buildSystem: "None",
        framework: "Unknown",
        packageManager: "None",
        installCommand: "None",
        buildScript: null,
        buildCommand: "None",
        nodeVersion: null,
        artifactPath: "dist",
        verifiable: false,
        unverifiableReason: "Repository does not contain recognizable build configuration (package.json, index.html, pyproject.toml/setup.py, Cargo.toml, go.mod, or pom.xml/build.gradle).",
        rootFiles,
      };
      this._setCached(cacheKey, config);
      return config;
    } catch (err) {
      console.error("inspectProjectConfiguration error:", err.message);
      return {
        projectType: "unknown",
        language: "Unknown",
        framework: "Unknown",
        verifiable: false,
        unverifiableReason: `Failed to inspect repository files: ${err.message}`,
        rootFiles: [],
      };
    }
  }

  /**
   * Fetches published GitHub Releases and downloadable binary assets
   */
  async fetchReleasesAndAssets(owner, repo) {
    const cacheKey = `releases:${owner}/${repo}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`;

    try {
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const releases = (response.data || []).map((rel) => ({
        id: rel.id,
        tagName: rel.tag_name,
        name: rel.name || rel.tag_name,
        publishedAt: rel.published_at,
        isPrerelease: rel.prerelease,
        tarballUrl: rel.tarball_url,
        zipballUrl: rel.zipball_url,
        assets: (rel.assets || []).map((asset) => ({
          id: asset.id,
          name: asset.name,
          size: asset.size,
          downloadCount: asset.download_count,
          downloadUrl: asset.browser_download_url,
          contentType: asset.content_type,
        })),
      }));

      this._setCached(cacheKey, releases);
      return releases;
    } catch (err) {
      // Releases are optional
      return [];
    }
  }

  /**
   * Triggers the GitHub Actions verify.yml workflow with dynamic inputs
   */
  async triggerVerificationWorkflow(targetRepository, commitSha, options = {}) {
    if (!this.isConfigured()) {
      throw new Error("GITHUB_TOKEN is not configured in backend environment.");
    }

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflow}/dispatches`;
    let finalInstall = options.installCommand;
    let finalBuild = options.buildCommand;
    let finalArtifact = options.artifactPath || "dist";

    if (options.buildCommand === "Static file packaging" || (options.projectType && options.projectType.includes("Static"))) {
      finalInstall = "echo 'Static website packaging'";
      finalBuild = "mkdir -p site && find . -maxdepth 3 -type f \\( -name '*.html' -o -name '*.htm' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' -o -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.gif' -o -name '*.ico' -o -name '*.json' -o -name '*.txt' \\) ! -path './.git/*' ! -path './site/*' -exec cp --parents {} site/ \\; 2>/dev/null || (mkdir -p site && cp -r * site/ 2>/dev/null || true)";
      finalArtifact = "site";
    }

    if (options.verificationMode === "Source Reproducibility" || options.artifactPath === "N/A") {
      finalInstall = options.installCommand && options.installCommand !== "None" ? options.installCommand : "pip install -r requirements.txt || true";
      finalBuild = "echo 'Source reproducibility: verifying source tree and dependency specifications'";
      finalArtifact = "N/A";
    }

    if (!finalInstall || finalInstall === "None") {
      finalInstall = "echo 'No install step required'";
    }

    const payload = {
      ref: "main",
      inputs: {
        repository: targetRepository,
        commit: commitSha,
        node_version: String(options.nodeVersion || "22"),
        install_command: finalInstall,
        build_command: finalBuild || "echo 'No build command'",
        artifact_path: finalArtifact,
        demo_conflict: String(Boolean(options.demoConflict)),
      },
    };

    const triggerTimestamp = new Date().toISOString();

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
      timeout: 10000,
    });

    return {
      status: response.status === 204 ? "DISPATCHED" : "TRIGGERED",
      triggeredAt: triggerTimestamp,
    };
  }

  /**
   * Finds the latest workflow run dispatched near the given timestamp
   */
  async findWorkflowRun(triggeredAfter) {
    if (!this.isConfigured()) return null;

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflow}/runs?per_page=5&event=workflow_dispatch`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      timeout: 10000,
    });

    const runs = response.data.workflow_runs || [];
    if (runs.length === 0) return null;

    const afterTime = triggeredAfter ? new Date(triggeredAfter).getTime() - 10000 : 0;
    const matchingRun = runs.find((r) => new Date(r.created_at).getTime() >= afterTime);

    return matchingRun || runs[0];
  }

  /**
   * Retrieves status of builder jobs inside a workflow run
   */
  async getRunJobs(runId) {
    if (!this.isConfigured()) return [];

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}/jobs`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      timeout: 10000,
    });

    return response.data.jobs || [];
  }

  /**
   * Retrieves artifacts list for a workflow run
   */
  async getRunArtifacts(runId) {
    if (!this.isConfigured()) return [];

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}/artifacts`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      timeout: 10000,
    });

    return response.data.artifacts || [];
  }

  /**
   * Downloads and unzips an artifact, returning the parsed JSON content
   */
  async downloadAndExtractJsonArtifact(artifactId) {
    if (!this.isConfigured()) return null;

    try {
      const AdmZip = require("adm-zip");
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/artifacts/${artifactId}/zip`;

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        responseType: "arraybuffer",
        timeout: 20000,
      });

      const zip = new AdmZip(Buffer.from(response.data));
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.entryName.endsWith(".json")) {
          const content = zip.readAsText(entry);
          return JSON.parse(content);
        }
      }
      return null;
    } catch (err) {
      console.error(`Error downloading artifact ${artifactId}:`, err.message);
      return null;
    }
  }

  /**
   * Retrieves job logs text to parse output variables
   */
  async getJobLog(jobId) {
    if (!this.isConfigured()) return null;

    try {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        responseType: "text",
        timeout: 15000,
      });
      return response.data;
    } catch (err) {
      return null;
    }
  }
}

module.exports = new GitHubService();
