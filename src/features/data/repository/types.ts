import type {
  AssetDetail,
  BimNode,
  PortfolioKpi,
  Site,
  SiteDetail,
  TimeSeriesPoint,
  TwinKpi,
} from "../types/domain";

export interface SiteFilter {
  assetTypes?: string[];
  statuses?: string[];
}

export interface PortfolioRepository {
  getSites(filter?: SiteFilter): Promise<Site[]>;
  getPortfolioKpis(): Promise<PortfolioKpi>;
  getSiteDetail(siteId: string): Promise<SiteDetail>;
  getSiteTimeseries(
    siteId: string,
    metric: string,
    range: string
  ): Promise<TimeSeriesPoint[]>;
}

export interface TwinRepository {
  getBimTree(siteId: string): Promise<BimNode>;
  getTwinKpis(siteId: string): Promise<TwinKpi>;
  getAssetDetail(siteId: string, assetId: string): Promise<AssetDetail>;
  getAssetTimeseries(
    siteId: string,
    assetId: string,
    metric: string,
    range: string
  ): Promise<TimeSeriesPoint[]>;
}

export type Repository = PortfolioRepository & TwinRepository;
