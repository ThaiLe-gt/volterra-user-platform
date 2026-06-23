import { Zap, Building2, type LucideIcon } from "lucide-react";
import type { AssetType } from "@/features/data/types/domain";

export interface AssetTypeConfig {
  type: AssetType;
  label: string;
  icon: LucideIcon;
}

export const ASSET_TYPES: AssetTypeConfig[] = [
  { type: "charging-station", label: "Charging Station", icon: Zap },
  { type: "data-center", label: "Data Center", icon: Building2 },
];

export const ASSET_TYPE_MAP: Record<AssetType, AssetTypeConfig> =
  Object.fromEntries(ASSET_TYPES.map((c) => [c.type, c])) as Record<
    AssetType,
    AssetTypeConfig
  >;
