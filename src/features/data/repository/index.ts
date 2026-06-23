import type { Repository } from "./types";
import { mockRepository } from "./mockRepository";
import { webEnergyRepository } from "./webEnergyRepository";
import { gatewayRepository } from "./gatewayRepository";

export type DataSource = "mock" | "webenergy" | "gateway";

/**
 * Single seam between the UI and its data source. Components never import a
 * concrete repository — they call getRepository(). Switching phase1↔phase2 is
 * one env var (NEXT_PUBLIC_DATA_SOURCE) with zero component changes.
 */
export function getRepository(): Repository {
  const source = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as DataSource;
  switch (source) {
    case "webenergy":
      return webEnergyRepository;
    case "gateway":
      return gatewayRepository;
    case "mock":
    default:
      return mockRepository;
  }
}

export type { Repository, SiteFilter, PortfolioRepository, TwinRepository } from "./types";
