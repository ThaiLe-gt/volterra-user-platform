import type { Repository, SiteFilter } from "./types";
import {
  BIM_TREE,
  PORTFOLIO_KPI,
  SITES,
  TWIN_KPI,
  generateSeries,
  getAssetDetail,
  getSiteDetail,
} from "../fixtures";

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockRepository: Repository = {
  async getSites(filter?: SiteFilter) {
    let sites = SITES;
    if (filter?.assetTypes?.length) {
      sites = sites.filter((s) => filter.assetTypes!.includes(s.assetType));
    }
    if (filter?.statuses?.length) {
      sites = sites.filter((s) => filter.statuses!.includes(s.status));
    }
    return delay(sites);
  },

  async getPortfolioKpis() {
    return delay(PORTFOLIO_KPI);
  },

  async getSiteDetail(siteId: string) {
    return delay(getSiteDetail(siteId));
  },

  async getSiteTimeseries(siteId, metric) {
    return delay(generateSeries(metric, 40, 18), 80);
  },

  async getBimTree() {
    return delay(BIM_TREE);
  },

  async getTwinKpis() {
    return delay(TWIN_KPI);
  },

  async getAssetDetail(_siteId, assetId) {
    return delay(getAssetDetail(assetId));
  },

  async getAssetTimeseries(_siteId, _assetId, metric) {
    return delay(generateSeries(metric, 60, 24), 80);
  },
};
