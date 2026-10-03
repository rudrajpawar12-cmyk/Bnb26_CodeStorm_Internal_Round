import { useState } from "react";
import axios from "axios";

function App() {
  const [repository, setRepository] = useState("");
  const [commit, setCommit] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const verifyRelease = async () => {
    setError("");
    setResult(null);

    if (!repository || !commit) {
      setError("Please enter the repository and commit.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/verify",
        {
          repository,
          commit,
        }
      );

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Something went wrong during verification."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>
          QUO<span>RUM</span>
        </div>

        <div style={styles.navText}>
          Software Release Verification
        </div>
      </nav>

      <main style={styles.container}>
        <section style={styles.hero}>
          <p style={styles.badge}>TRUSTED SOFTWARE VERIFICATION</p>

          <h1 style={styles.heroTitle}>
            Don't Trust the Binary.
            <br />
            <span>Trust the Builders.</span>
          </h1>

          <p style={styles.description}>
            Quorum independently verifies software releases by
            comparing results from multiple build environments.
          </p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Verify a Release</h2>

          <label style={styles.cardLabel}>GitHub Repository</label>

          <input
            type="text"
            placeholder="https://github.com/user/project"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            style={styles.cardInput}
          />

          <label style={styles.cardLabel}>Commit / Version</label>

          <input
            type="text"
            placeholder="e.g. a82f91c"
            value={commit}
            onChange={(e) => setCommit(e.target.value)}
            style={styles.cardInput}
          />

          <button onClick={verifyRelease} disabled={loading} style={styles.cardButton}>
            {loading ? "VERIFYING..." : "VERIFY RELEASE →"}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </section>

        {result && (
          <section style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <div>
                <p style={styles.smallTitle}>VERIFICATION RESULT</p>

                <h2
                  style={{
                    color:
                      result.result === "VERIFIED"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  {result.result === "VERIFIED"
                    ? "🟢 VERIFIED"
                    : "🔴 VERIFICATION FAILED"}
                </h2>
              </div>

              <div style={styles.score}>
                {result.builders.filter(
                  (b) => b.status === "verified"
                ).length}
                /{result.builders.length}
              </div>
            </div>

            <div style={styles.info}>
              <p>
                <strong>Repository:</strong>{" "}
                {result.repository}
              </p>

              <p>
                <strong>Commit:</strong> {result.commit}
              </p>
            </div>

            <h3>Independent Builders</h3>

            <div style={styles.builders}>
              {result.builders.map((builder) => (
                <div
                  key={builder.name}
                  style={styles.builder}
                >
                  <div>
                    <strong>{builder.name}</strong>

                    <p style={styles.hash}>
                      {builder.hash}
                    </p>
                  </div>

                  <span style={styles.check}>
                    {builder.status === "verified"
                      ? "✓"
                      : "!"}
                  </span>
                </div>
              ))}
            </div>

            <div style={styles.explanation}>
              {result.result === "VERIFIED"
                ? "All independent builders produced matching results."
                : "The builders produced different results. Further investigation is required."}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#070b12",
    color: "#f8fafc",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  navbar: {
    height: "70px",
    borderBottom: "1px solid #1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 7%",
  },

  logo: {
    fontSize: "22px",
    fontWeight: "800",
    letterSpacing: "2px",
  },

  navText: {
    color: "#64748b",
    fontSize: "14px",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "80px 24px",
  },

  hero: {
    textAlign: "center",
    marginBottom: "60px",
  },

  badge: {
    color: "#38bdf8",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px",
  },

  heroTitle: {
    fontSize: "56px",
  },

  description: {
    maxWidth: "650px",
    margin: "20px auto",
    color: "#94a3b8",
    fontSize: "18px",
    lineHeight: "1.7",
  },

  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "35px",
    maxWidth: "650px",
    margin: "0 auto",
  },

  cardTitle: {
    marginBottom: "30px",
  },

  cardLabel: {
    display: "block",
    marginTop: "20px",
    marginBottom: "8px",
    color: "#cbd5e1",
    fontSize: "14px",
  },

  cardInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
  },

  cardButton: {
    width: "100%",
    marginTop: "30px",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    background: "#38bdf8",
    color: "#020617",
    fontWeight: "800",
    cursor: "pointer",
  },

  error: {
    marginTop: "15px",
    color: "#f87171",
  },

  resultCard: {
    marginTop: "35px",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "35px",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallTitle: {
    color: "#64748b",
    fontSize: "12px",
    letterSpacing: "2px",
  },

  score: {
    fontSize: "28px",
    fontWeight: "800",
  },

  info: {
    marginTop: "20px",
    color: "#94a3b8",
    fontSize: "14px",
    wordBreak: "break-all",
  },

  builders: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  builder: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "18px",
  },

  hash: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "8px",
  },

  check: {
    color: "#22c55e",
    fontSize: "24px",
    fontWeight: "800",
  },

  explanation: {
    marginTop: "25px",
    padding: "15px",
    borderRadius: "10px",
    background: "#020617",
    color: "#94a3b8",
  },
};

export default App;