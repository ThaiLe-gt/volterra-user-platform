"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_TWIN_SITE_ID, ROUTES } from "@/constants/routes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: ROUTES.portfolio,
    label: "Portfolio",
    icon: LayoutDashboard,
    match: (p) => p.startsWith("/portfolio"),
  },
  {
    href: ROUTES.digitalTwin(DEFAULT_TWIN_SITE_ID),
    label: "Digital Twin",
    icon: Building,
    match: (p) => p.startsWith("/digital-twin"),
  },
  {
    href: ROUTES.operations,
    label: "Operations",
    icon: Activity,
    match: (p) => p.startsWith("/operations"),
  },
];

export function IconRail() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-1 bg-[#050b14]/95 py-3">
      <div className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item, idx) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Tooltip key={`${item.label}-${idx}`}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/7 hover:text-foreground",
                    active &&
                      "border border-primary/20 bg-primary/15 text-primary shadow-[0_0_18px_rgba(47,128,237,0.18)]",
                  )}>
                  <Icon className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={ROUTES.portfolio}
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/7 hover:text-foreground">
            <Settings className="size-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </nav>
  );
}
