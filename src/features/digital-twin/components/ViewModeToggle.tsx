"use client";

import { Box, ChevronDown } from "lucide-react";

export function ViewModeToggle() {
  return (
    <button className="flex items-center gap-2 rounded-xl border border-border bg-card/85 px-3 py-2 text-sm text-foreground backdrop-blur-sm">
      <Box className="size-4 text-primary" />
      3D View
      <ChevronDown className="size-4 text-muted-foreground" />
    </button>
  );
}
