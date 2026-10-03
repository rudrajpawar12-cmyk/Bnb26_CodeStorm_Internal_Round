/**
 * Quorum Frontend API Client
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export const verificationApi = {
  /**
   * Dynamically analyzes any public repository, resolves branch/tag to commit,
   * detects frameworks, package managers, and build commands.
   */
  analyzeRepository: async ({ repository, ref = null }) => {
    const response = await api.post("/api/analyze-repository", {
      repository,
      ref,
    });
    return response.data;
  },

  /**
   * Initiates a release verification
   */
  startVerification: async ({
    repository,
    commit,
    ref = null,
    releaseArtifact = null,
    forceSimulated = false,
    projectConfig = {},
    demoConflict = false,
  }) => {
    const response = await api.post("/api/verify", {
      repository,
      commit,
      ref,
      releaseArtifact,
      forceSimulated,
      projectConfig,
      demoConflict,
    });
    return response.data;
  },

  /**
   * Polls the live status of an ongoing or completed verification session
   */
  getVerificationStatus: async (verificationId) => {
    const response = await api.get(`/api/verify/${verificationId}`);
    return response.data;
  },

  /**
   * Simulates builder tampering for hackathon live demo
   */
  simulateTampering: async (verificationId) => {
    const response = await api.post("/api/simulate-tampering", {
      verificationId,
    });
    return response.data;
  },

  /**
   * Retrieves verification records with search, filter, and sort
   */
  getHistory: async ({ search = "", status = "ALL", sortBy = "date_desc" } = {}) => {
    const response = await api.get("/api/history", {
      params: { search, status, sortBy },
    });
    return response.data;
  },

  /**
   * Fetches instant preset demo results (verified, conflict, failed, no_consensus, release_mismatch)
   */
  getDemoScenario: async (type = "verified") => {
    const response = await api.get(`/api/demo/${type}`);
    return response.data;
  },

  /**
   * Retrieves safe engine diagnostics
   */
  getSystemStatus: async () => {
    const response = await api.get("/api/system-status");
    return response.data;
  },
};

export default verificationApi;
