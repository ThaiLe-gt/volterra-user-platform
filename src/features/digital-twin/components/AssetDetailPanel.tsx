"use client";

import { MoreVertical, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/common/StatCard";
import { MiniLineChart } from "@/components/common/MiniLineChart";
import type { MetricValue } from "@/features/data/types/domain";
import { useAssetDetail, useAssetTimeseries } from "../hooks/useTwinData";

interface AssetDetailPanelProps {
  siteId: string;
  assetId: string;
  onClose: () => void;
}

export function AssetDetailPanel({
  siteId,
  assetId,
  onClose,
}: AssetDetailPanelProps) {
  const { data: asset, isLoading } = useAssetDetail(siteId, assetId);
  const { data: series } = useAssetTimeseries(siteId, assetId, "power");

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md md:w-[380px] md:max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-end gap-1 px-3 pt-3">
        <button className="text-muted-foreground hover:text-foreground" aria-label="More">
          <MoreVertical className="size-4" />
        </button>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {isLoading || !asset ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="border-b border-border px-5 pb-4">
            <h2 className="text-lg font-semibold text-foreground">{asset.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{asset.typeLabel}</span>
              <Badge className="border-transparent bg-online/15 text-online">
                {asset.operationalLabel}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-3">
              <TabsList className="w-full justify-start gap-4 bg-transparent p-0">
                {["overview", "technical", "maintenance"].map((t) => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 capitalize data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-5">
                <TabsContent value="overview" className="mt-0 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {asset.overview.map((m) => (
                      <StatCard
                        key={m.label}
                        label={m.label}
                        value={m.value}
                        unit={m.unit}
                        delta={m.delta}
                      />
                    ))}
                  </div>
                  <Section title="Real-time Data">
                    <div className="rounded-lg border border-border bg-card/60 p-3">
                      <MiniLineChart
                        data={series ?? []}
                        height={120}
                        color="var(--chart-power)"
                      />
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="technical" className="mt-0">
                  <MetricList items={asset.technical} />
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  <MetricList items={asset.maintenance} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <div className="border-t border-border p-4">
            <Button className="w-full">View Full Details</Button>
          </div>
        </>
      )}
    </aside>
  );
}

function MetricList({ items }: { items: MetricValue[] }) {
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{m.label}</span>
          <span className="text-foreground">
            {m.value}
            {m.unit ? ` ${m.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}
