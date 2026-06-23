import { getRepository, type SiteFilter } from "@/features/data/repository";

const repo = getRepository();

export const portfolioApi = {
  getSites: (filter?: SiteFilter) => repo.getSites(filter),
  getKpis: () => repo.getPortfolioKpis(),
  getSiteDetail: (siteId: string) => repo.getSiteDetail(siteId),
  getSiteTimeseries: (siteId: string, metric: string, range: string) =>
    repo.getSiteTimeseries(siteId, metric, range),
};
