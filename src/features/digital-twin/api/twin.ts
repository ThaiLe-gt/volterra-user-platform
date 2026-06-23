import { getRepository } from "@/features/data/repository";

const repo = getRepository();

export const twinApi = {
  getBimTree: (siteId: string) => repo.getBimTree(siteId),
  getKpis: (siteId: string) => repo.getTwinKpis(siteId),
  getAssetDetail: (siteId: string, assetId: string) =>
    repo.getAssetDetail(siteId, assetId),
  getAssetTimeseries: (
    siteId: string,
    assetId: string,
    metric: string,
    range: string
  ) => repo.getAssetTimeseries(siteId, assetId, metric, range),
};
