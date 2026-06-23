import { IconRail } from "./IconRail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <IconRail />
      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
