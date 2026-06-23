"use client";

import type { ReactNode } from "react";
import { ChevronDown, Link2, Moon, Sun } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwinKpiCards } from "./TwinKpiCards";

export function TwinDashboardWidgets({ siteId }: { siteId: string }) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="pb-2">
        <section className="border-b border-border p-4">
          <TwinKpiCards siteId={siteId} compact />
        </section>

        <DashboardSection title="Weather">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  18°C
                </span>
                <span className="text-xs text-foreground">8°/18°</span>
              </div>
              <p className="mt-1 text-xs text-foreground">Sunny</p>
              <p className="mt-1 text-xs text-foreground">
                Wind speed 21 km/h
              </p>
            </div>
            <div className="grid shrink-0 gap-2 border-l border-border pl-4 text-xs">
              <WeatherDay
                icon={<Sun className="size-3.5" />}
                day="Tue"
                temp="7°/16°"
              />
              <WeatherDay
                icon={<Moon className="size-3.5" />}
                day="Wed"
                temp="6°/10°"
              />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection
          title={
            <span className="flex items-center gap-1.5">
              Today&apos;s Open High-level Alarms
              <Link2 className="size-3.5 text-muted-foreground" />
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-6">
            <AlarmCount value="0" label="Alarms" />
            <AlarmCount value="0" label="Equipment" />
          </div>
        </DashboardSection>

        <DashboardSection title="Annual Carbon Emissions">
          <NoDataBlock />
        </DashboardSection>

        <DashboardSection title="Carbon Emissions Trend">
          <NoDataBlock />
        </DashboardSection>

        <DashboardSection
          title="Carbon Emissions Trend - Activity Type"
          footer={
            <div className="mb-2 flex items-center justify-between text-sm text-foreground">
              <button
                type="button"
                className="flex items-center gap-1 text-left"
                aria-label="Select carbon emissions year"
              >
                This Year
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 text-right"
                aria-label="Select carbon emissions activity type"
              >
                All Types
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </div>
          }
        >
          <NoDataBlock />
        </DashboardSection>
      </div>
    </ScrollArea>
  );
}

function DashboardSection({
  title,
  footer,
  children,
}: {
  title: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-b-0">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {footer}
      {children}
    </section>
  );
}

function WeatherDay({
  icon,
  day,
  temp,
}: {
  icon: ReactNode;
  day: string;
  temp: string;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_1rem_3.5rem] items-center gap-1 text-foreground">
      <span>{day}</span>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-right">{temp}</span>
    </div>
  );
}

function AlarmCount({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{label}</div>
    </div>
  );
}

function NoDataBlock() {
  return (
    <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
      No Data
    </div>
  );
}
