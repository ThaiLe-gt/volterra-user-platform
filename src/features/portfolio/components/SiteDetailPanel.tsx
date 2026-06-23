"use client";

import { useRouter } from "next/navigation";
import { X, MoreVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/common/StatCard";
import { StatusDot, STATUS_LABEL } from "@/components/common/StatusDot";
import { MiniLineChart } from "@/components/common/MiniLineChart";
import { ROUTES } from "@/constants/routes";
import { useSiteDetail, useSiteTimeseries } from "../hooks/usePortfolioData";

interface SiteDetailPanelProps {
  siteId: string;
  onClose: () => void;
}

export function SiteDetailPanel({ siteId, onClose }: SiteDetailPanelProps) {
  const router = useRouter();
  const { data: site, isLoading } = useSiteDetail(siteId);
  const { data: series } = useSiteTimeseries(siteId, "power");

  if (isLoading || !site) {
    return (
      <PanelShell onClose={onClose}>
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell onClose={onClose}>
      <div className="border-b border-border px-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{site.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Site · {site.category}</span>
            </div>
          </div>
          <StatusDot status={site.status} withLabel />
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <div className="px-5 pt-3">
          <TabsList className="w-full justify-start gap-4 bg-transparent p-0">
            {["overview", "performance", "alerts", "details"].map((t) => (
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
                <StatCard
                  label="Total Power"
                  value={site.kpi.totalPower}
                  unit="MW"
                  delta={{ pct: 1.25, direction: "up" }}
                />
                <StatCard
                  label="Energy Generation"
                  value={site.kpi.energyGeneration}
                  unit="MWh"
                  delta={{ pct: 3.2, direction: "up" }}
                />
                <StatCard
                  label="Active Twin Assets"
                  value={site.kpi.activeTwinAssets}
                  delta={{ pct: 1, direction: "up" }}
                  deltaSuffix="vs yesterday"
                />
                <StatCard
                  label="Efficiency (Avg.)"
                  value={`${site.kpi.efficiency}%`}
                  delta={{ pct: 2.1, direction: "up" }}
                />
              </div>

              <Section title="Status">
                <div className="space-y-2">
                  {site.systemStatus.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <StatusDot status={s.status} />
                        {STATUS_LABEL[s.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

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

            <TabsContent value="performance" className="mt-0">
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <MiniLineChart
                  data={series ?? []}
                  height={160}
                  color="var(--chart-airflow)"
                />
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="mt-0 space-y-2">
              {site.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active alerts.</p>
              ) : (
                site.alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-card/60 p-3"
                  >
                    <StatusDot status={a.severity} className="mt-1" />
                    <div>
                      <p className="text-sm text-foreground">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-0 space-y-2">
              {site.details.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="text-foreground">
                    {d.value}
                    {d.unit ? ` ${d.unit}` : ""}
                  </span>
                </div>
              ))}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      <div className="border-t border-border p-4">
        <Button
          className="w-full"
          onClick={() => router.push(ROUTES.digitalTwin(site.parentSiteId ?? site.id))}
        >
          View Full Details
        </Button>
      </div>
    </PanelShell>
  );
}

function PanelShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <aside className="pointer-events-auto flex h-full w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md">
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
      {children}
    </aside>
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
