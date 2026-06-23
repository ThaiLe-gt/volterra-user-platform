"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type TwinPanel = "structure" | "widgets";

export type TwinSelectionTarget =
  | { kind: "site"; id: string }
  | { kind: "asset"; id: string }
  | null;

export interface TwinStore {
  activePanel: TwinPanel;
  setActivePanel: (panel: TwinPanel) => void;
  selectedTarget: TwinSelectionTarget;
  setSelectedTarget: (target: TwinSelectionTarget) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
}

const TwinContext = createContext<TwinStore | null>(null);

export function TwinProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<TwinPanel>("structure");
  const [selectedAssetId, setSelectedAssetIdState] = useState<string | null>(
    "vinuni-station-01"
  );
  const [selectedTarget, setSelectedTargetState] =
    useState<TwinSelectionTarget>({
      kind: "asset",
      id: "vinuni-station-01",
    });

  const setSelectedAssetId = useCallback((id: string | null) => {
    setSelectedAssetIdState(id);
  }, []);

  const setSelectedTarget = useCallback((target: TwinSelectionTarget) => {
    setSelectedTargetState(target);
  }, []);

  const value = useMemo(
    () => ({
      activePanel,
      setActivePanel,
      selectedTarget,
      setSelectedTarget,
      selectedAssetId,
      setSelectedAssetId,
    }),
    [
      activePanel,
      selectedTarget,
      setSelectedTarget,
      selectedAssetId,
      setSelectedAssetId,
    ]
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwinStore(): TwinStore {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error("useTwinStore must be used within TwinProvider");
  return ctx;
}
