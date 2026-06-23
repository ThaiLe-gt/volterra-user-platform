"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { AssetType } from "@/features/data/types/domain";

interface PortfolioStore {
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;
  activeTypes: AssetType[];
  toggleType: (type: AssetType) => void;
  clearTypes: () => void;
}

const PortfolioContext = createContext<PortfolioStore | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<AssetType[]>([]);

  const toggleType = (type: AssetType) =>
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const clearTypes = () => setActiveTypes([]);

  const value = useMemo(
    () => ({
      selectedSiteId,
      setSelectedSiteId,
      activeTypes,
      toggleType,
      clearTypes,
    }),
    [selectedSiteId, activeTypes]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioStore(): PortfolioStore {
  const ctx = useContext(PortfolioContext);
  if (!ctx)
    throw new Error("usePortfolioStore must be used within PortfolioProvider");
  return ctx;
}
