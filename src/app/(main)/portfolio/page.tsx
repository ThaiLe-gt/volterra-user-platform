import { PortfolioProvider, PortfolioView } from "@/features/portfolio";

export default function PortfolioPage() {
  return (
    <PortfolioProvider>
      <PortfolioView />
    </PortfolioProvider>
  );
}
