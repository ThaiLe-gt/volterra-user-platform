import type { Repository } from "./types";

/**
 * Phase 2 — Java gateway (:8080). The gateway is expected to return
 * domain-shaped DTOs, so this becomes a thin passthrough over apiClient.
 * Stubbed until the backend is ready; falls back to mock so the app still runs.
 */
import { mockRepository } from "./mockRepository";

export const gatewayRepository: Repository = {
  ...mockRepository,
  // TODO(phase2): replace each method with apiClient calls to API_ENDPOINTS.gateway.*
};
