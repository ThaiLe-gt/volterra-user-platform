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
  | { kind: "bubble"; id: string; assetId: string }
  | null;

export type TwinDetailTarget =
  | {
      assetId: string;
      bubbleId?: string;
      operationNodeId?: string;
      deviceId?: number;
    }
  | null;

export interface TwinStore {
  activePanel: TwinPanel;
  setActivePanel: (panel: TwinPanel) => void;
  selectedTarget: TwinSelectionTarget;
  setSelectedTarget: (target: TwinSelectionTarget) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  detailTarget: TwinDetailTarget;
  setDetailTarget: (target: TwinDetailTarget) => void;
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
  const [detailTarget, setDetailTargetState] =
    useState<TwinDetailTarget>(null);

  const setSelectedAssetId = useCallback((id: string | null) => {
    setSelectedAssetIdState(id);
  }, []);

  const setSelectedTarget = useCallback((target: TwinSelectionTarget) => {
    setSelectedTargetState(target);
  }, []);

  const setDetailTarget = useCallback((target: TwinDetailTarget) => {
    setDetailTargetState(target);
  }, []);

  const value = useMemo(
    () => ({
      activePanel,
      setActivePanel,
      selectedTarget,
      setSelectedTarget,
      selectedAssetId,
      setSelectedAssetId,
      detailTarget,
      setDetailTarget,
    }),
    [
      activePanel,
      selectedTarget,
      setSelectedTarget,
      selectedAssetId,
      setSelectedAssetId,
      detailTarget,
      setDetailTarget,
    ]
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwinStore(): TwinStore {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error("useTwinStore must be used within TwinProvider");
  return ctx;
}
