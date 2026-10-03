/**
 * Quorum Input Validation & Universal GitHub URL Parsing Utilities
 */

/**
 * Parses and normalizes any valid public GitHub repository URL or identifier.
 *
 * Supports:
 *   https://github.com/owner/repository
 *   https://github.com/owner/repository/
 *   https://github.com/owner/repository/tree/main
 *   https://github.com/owner/repository/tree/develop
 *   https://github.com/owner/repository/releases/tag/v1.0.0
 *   https://github.com/owner/repository/commit/<sha>
 *   https://github.com/owner/repository?tab=readme        ← query stripped
 *   https://github.com/owner/repository?utm_source=...    ← query stripped
 *   https://github.com/owner/repository.git
 *   owner/repository
 *
 * @param {string} rawInput
 * @returns {{
 *   valid: boolean,
 *   owner?: string,
 *   repo?: string,
 *   fullRepo?: string,
 *   ref?: string,
 *   originalUrl?: string,
 *   htmlUrl?: string,
 *   error?: string
 * }}
 */
function parseGitHubUrl(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, error: "GitHub repository URL or identifier is required." };
  }

  const trimmed = rawInput.trim();
  const originalUrl = trimmed;

  // ── Branch A: full URL (http/https) ──────────────────────────────────────
  if (/^https?:\/\//i.test(trimmed)) {
    // Reject non-GitHub domains
    if (!/^https?:\/\/(www\.)?github\.com(\/|$)/i.test(trimmed)) {
      return {
        valid: false,
        error: "Only public GitHub repositories are supported (must begin with https://github.com/...).",
      };
    }

    // Use URL constructor to properly separate path from query + fragment.
    // Ensures ?tab=readme, ?utm_source=..., #readme etc. are ignored entirely.
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return { valid: false, error: "The URL you entered is malformed. Please check it and try again." };
    }

    // Work only with the clean pathname (no query string, no hash)
    let path = parsedUrl.pathname;

    // Remove .git suffix
    path = path.replace(/\.git$/i, "");
    // Strip leading/trailing slashes and empty segments
    const segments = path.split("/").filter(Boolean);

    if (segments.length < 2) {
      return {
        valid: false,
        error: "Enter a valid GitHub repository URL (e.g., https://github.com/owner/repository).",
      };
    }

    return _buildResult(segments, originalUrl);
  }

  // ── Branch B: shorthand  owner/repository  ───────────────────────────────
  // Strip .git suffix and leading/trailing slashes
  const cleaned = trimmed.replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const segments = cleaned.split("/").filter(Boolean);

  if (segments.length < 2) {
    return {
      valid: false,
      error: "Enter a valid GitHub repository in 'owner/repository' format (e.g., facebook/react).",
    };
  }

  return _buildResult(segments, originalUrl);
}

/**
 * Internal helper: validates owner/repo names and extracts optional ref from
 * the already-clean path segments array.
 */
function _buildResult(segments, originalUrl) {
  const owner = segments[0];
  const repo  = segments[1];

  // Validate owner and repo names against GitHub identifier rules
  const validOwner = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(owner) || /^[a-zA-Z0-9]$/.test(owner);
  const validRepo  = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(repo)  || /^[a-zA-Z0-9]$/.test(repo);

  if (!validOwner || !validRepo) {
    return {
      valid: false,
      error: "Repository and owner names must contain only alphanumeric characters, hyphens, periods, or underscores.",
    };
  }

  let ref = null;

  if (segments.length > 2) {
    const context = segments[2];

    // /tree/<branch-or-tag>  or  /tree/<a/b>  (multi-segment branches)
    if (context === "tree" && segments.length >= 4) {
      ref = segments.slice(3).join("/");
    }
    // /releases/tag/<tag-name>
    else if (context === "releases" && segments[3] === "tag" && segments.length >= 5) {
      ref = segments.slice(4).join("/");
    }
    // /commit/<sha>
    else if (context === "commit" && segments.length >= 4) {
      ref = segments[3];
    }
    // /blob/<branch>/... — treat as branch ref, ignore file path
    else if (context === "blob" && segments.length >= 4) {
      ref = segments[3];
    }
    // Ignore all other GitHub paths (/issues, /pulls, /wiki, /settings …)
    // so the URL is still valid — we simply don't extract a ref.
  }

  const htmlUrl = `https://github.com/${owner}/${repo}`;

  return {
    valid: true,
    owner,
    repo,
    fullRepo: `${owner}/${repo}`,
    ref: ref || null,
    originalUrl,
    htmlUrl,
  };
}

/**
 * Validates a repository identifier (backward compatible helper)
 */
function validateRepository(rawRepo) {
  const parsed = parseGitHubUrl(rawRepo);
  if (!parsed.valid) {
    return { valid: false, error: parsed.error };
  }
  return {
    valid: true,
    repo: parsed.fullRepo,
    owner: parsed.owner,
    name: parsed.repo,
    ref: parsed.ref,
    originalUrl: parsed.originalUrl,
    htmlUrl: parsed.htmlUrl,
  };
}

/**
 * Validates a commit SHA or git reference (tag / branch).
 * @param {string} rawCommit
 * @returns {{ valid: boolean, commit?: string, error?: string }}
 */
function validateCommit(rawCommit) {
  if (!rawCommit || typeof rawCommit !== "string") {
    return { valid: false, error: "Commit or version reference is required." };
  }

  const cleaned = rawCommit.trim();

  // Commit SHA (7 to 40 hex characters)
  const isHexSha = /^[0-9a-fA-F]{7,40}$/.test(cleaned);

  // Valid semantic version / tag / branch name
  const isValidRef = /^[a-zA-Z0-9._\-\/]{1,100}$/.test(cleaned) && !cleaned.includes("..");

  if (!isHexSha && !isValidRef) {
    return {
      valid: false,
      error: "Commit must be a valid commit SHA (7–40 hex chars) or tag/branch reference without special characters.",
    };
  }

  return { valid: true, commit: cleaned };
}

/**
 * Sanitizes arbitrary text string for safe logging and display
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[<>'"&]/g, "").trim().slice(0, 500);
}

module.exports = {
  parseGitHubUrl,
  validateRepository,
  validateCommit,
  sanitizeText,
};
