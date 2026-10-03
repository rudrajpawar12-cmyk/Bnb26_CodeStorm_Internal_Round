/**
 * Quorum Artifact Discovery & Deterministic Canonical Fingerprinting Service
 *
 * Implements canonical manifest generation to eliminate packaging & timestamp variances.
 */

const crypto = require("crypto");

class ArtifactService {
  /**
   * Identifies candidate artifact output directory based on project configuration
   * @param {string} projectType
   * @param {string} buildCommand
   * @param {Array<string>} [rootFiles]
   * @returns {string} Relative artifact directory
   */
  identifyArtifactDirectory(projectType, buildCommand = "", rootFiles = []) {
    const cmd = (buildCommand || "").toLowerCase();
    const type = (projectType || "").toLowerCase();

    if (type.includes("static") || rootFiles.includes("index.html")) {
      return "site";
    }

    if (type.includes("rust") || rootFiles.includes("Cargo.toml")) {
      return "target/release";
    }

    if (type.includes("java") || rootFiles.includes("pom.xml")) {
      return "target";
    }

    if (type.includes("gradle") || rootFiles.includes("build.gradle") || rootFiles.includes("build.gradle.kts")) {
      return "build/libs";
    }

    if (type.includes("go") || rootFiles.includes("go.mod")) {
      return "bin";
    }

    if (cmd.includes("next build")) {
      return ".next";
    }

    if (cmd.includes("vite build") || cmd.includes("rollup") || cmd.includes("webpack")) {
      return "dist";
    }

    if (cmd.includes("react-scripts build")) {
      return "build";
    }

    // Default universal fallbacks for modern frontend and web runtimes
    return "dist";
  }

  /**
   * Generates a canonical artifact fingerprint from a list of files and their hashes.
   * Format:
   * 1. Sort all files by relative path in ascending ASCII order (LC_ALL=C).
   * 2. Construct manifest: `${relativePath}  ${fileSha256}\n`
   * 3. Compute SHA-256 digest of the entire canonical manifest.
   *
   * @param {Array<{ path: string, hash: string }>} fileEntries
   * @returns {{ canonicalFingerprint: string, manifest: string, fileCount: number }}
   */
  computeCanonicalFingerprint(fileEntries) {
    if (!fileEntries || fileEntries.length === 0) {
      throw new Error("Cannot compute fingerprint: artifact list is empty.");
    }

    // Sort entries strictly by ASCII path
    const sorted = [...fileEntries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

    const manifestLines = sorted.map((entry) => `${entry.path}  ${entry.hash.toLowerCase()}`);
    const manifest = manifestLines.join("\n") + "\n";

    const canonicalFingerprint = crypto.createHash("sha256").update(manifest).digest("hex");

    return {
      canonicalFingerprint,
      manifest,
      fileCount: sorted.length,
    };
  }

  /**
   * Generates simulated realistic canonical artifact files for a repository & commit
   * (Used in controlled local runs or demo verification)
   */
  generateSimulatedArtifactManifest(repo, commit, artifactDir = "dist", isTampered = false) {
    let baseFiles;
    if (artifactDir === "N/A" || artifactDir === "SOURCE" || !artifactDir) {
      baseFiles = [
        "app.py",
        "main.py",
        "requirements.txt",
        "config.py",
        "utils.py",
      ];
    } else if (artifactDir.endsWith("bin")) {
      baseFiles = [
        `${artifactDir}/app`,
        `${artifactDir}/app.checksum`,
      ];
    } else if (artifactDir.endsWith("site")) {
      baseFiles = [
        `${artifactDir}/index.html`,
        `${artifactDir}/style.css`,
        `${artifactDir}/script.js`,
      ];
    } else if (artifactDir.endsWith("target/release")) {
      baseFiles = [
        `${artifactDir}/release-binary`,
        `${artifactDir}/lib.rlib`,
      ];
    } else {
      baseFiles = [
        `${artifactDir}/index.html`,
        `${artifactDir}/assets/index.js`,
        `${artifactDir}/assets/vendor.js`,
        `${artifactDir}/assets/style.css`,
        `${artifactDir}/manifest.json`,
      ];
    }

    const fileEntries = baseFiles.map((filePath, idx) => {
      // Deterministic file hash based on repo + commit + path
      const salt = isTampered && idx === 0 ? "-tampered-divergence" : "";
      const hash = crypto
        .createHash("sha256")
        .update(`${repo}@${commit}:${filePath}${salt}`)
        .digest("hex");
      return { path: filePath, hash };
    });

    return this.computeCanonicalFingerprint(fileEntries);
  }
}

module.exports = new ArtifactService();
