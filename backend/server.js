const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Quorum Backend is running",
  });
});

app.post("/api/verify", async (req, res) => {
  try {
    const { repository, commit } = req.body;

    if (!repository || !commit) {
      return res.status(400).json({
        error: "Repository and commit are required",
      });
    }

    console.log("Verification requested:");
    console.log("Repository:", repository);
    console.log("Commit:", commit);

    // Builders will be connected here.
    // For now we return demo data.

    const result = {
      repository,
      commit,
      builders: [
        {
          name: "Builder A",
          status: "verified",
          hash: "ABC123",
        },
        {
          name: "Builder B",
          status: "verified",
          hash: "ABC123",
        },
        {
          name: "Builder C",
          status: "verified",
          hash: "ABC123",
        },
      ],
      result: "VERIFIED",
    };

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Verification failed",
    });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Quorum backend running on http://localhost:${PORT}`);
});