"use client";

import Link from "next/link";
import Image from "next/image";
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
    <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card/60 py-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={ROUTES.portfolio}
            className="mb-8 flex size-10 items-center justify-center rounded-xl bg-background/60 shadow-sm transition-transform hover:scale-105"
            aria-label="Volterra home">
            <Image
              src="/logo.png"
              alt=""
              width={947}
              height={671}
              priority
              className="h-9 w-11 object-contain"
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Volterra Home</TooltipContent>
      </Tooltip>

      <div className="flex flex-1 flex-col items-center gap-1">
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
                    "flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-accent text-primary",
                  )}>
                  <Icon className="size-5" />
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
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Settings className="size-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </nav>
  );
}
