"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  FileText,
  Globe,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_TWIN_SITE_ID, ROUTES } from "@/constants/routes";

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
    icon: Globe,
    match: (p) => p.startsWith("/portfolio"),
  },
  {
    href: ROUTES.digitalTwin(DEFAULT_TWIN_SITE_ID),
    label: "Digital Twin",
    icon: Boxes,
    match: (p) => p.startsWith("/digital-twin"),
  },
  {
    href: "/portfolio",
    label: "Dashboards",
    icon: LayoutDashboard,
    match: () => false,
  },
  { href: "/portfolio", label: "Alerts", icon: Bell, match: () => false },
  { href: "/portfolio", label: "Reports", icon: FileText, match: () => false },
];

export function IconRail() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card/60 py-4">
      <Link
        href={ROUTES.portfolio}
        className="mb-4 flex size-10 items-center justify-center rounded-xl bg-background/60 shadow-sm"
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

      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item, idx) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${idx}`}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-primary",
              )}>
              <Icon className="size-5" />
            </Link>
          );
        })}
      </div>

      <Link
        href={ROUTES.portfolio}
        aria-label="Settings"
        className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Settings className="size-5" />
      </Link>
    </nav>
  );
}
