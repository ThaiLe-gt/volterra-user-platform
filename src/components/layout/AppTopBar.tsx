"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const PAGE_LABELS = {
  portfolio: {
    title: "Portfolio",
    context: "digital twin",
    selector: "Volterra Portfolio",
  },
  digitalTwin: {
    title: "Digital Twin",
    context: "live site",
    selector: "Tram 1 Vin University",
  },
  operations: {
    title: "Operations",
    context: "single-line",
    selector: "VinUni",
  },
};

const selectorBaseClass =
  "h-9 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-white/8 focus:border-primary focus:outline-none";

export function AppTopBar() {
  const pathname = usePathname();
  const isOperations = pathname.startsWith("/operations");
  const page = pathname.startsWith("/digital-twin")
    ? PAGE_LABELS.digitalTwin
    : isOperations
      ? PAGE_LABELS.operations
      : PAGE_LABELS.portfolio;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-[#050b14]/95 px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href={ROUTES.portfolio}
          className="flex shrink-0 items-center gap-3"
          aria-label="Volterra home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={28}
            priority
            className="h-7 w-auto object-contain"
          />
          <span className="hidden text-sm font-semibold uppercase tracking-wide text-muted-foreground sm:block">
            Volterra
          </span>
        </Link>

        <div className="h-6 w-px bg-white/12" />

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold text-foreground">
            {page.title}
          </h1>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-online" />
            {page.context}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <div className="relative w-[320px] lg:w-[360px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets, sites, twins..."
            className="h-9 rounded-xl border-white/10 bg-white/5 pl-9 pr-14 text-xs text-foreground placeholder:text-muted-foreground dark:bg-white/5"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <button
          type="button"
          className={cn(
            selectorBaseClass,
            "flex min-w-40 items-center justify-between gap-3 px-3"
          )}
        >
          <span className="truncate">{page.selector}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          className="relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-teal-400" />
        </button>
      </div>
    </header>
  );
}
