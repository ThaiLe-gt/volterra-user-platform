import { IconRail } from "./IconRail";
import { AppTopBar } from "./AppTopBar";
import { AppChromeProvider } from "./appChromeStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppChromeProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <AppTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden bg-[#07111e]/95">
          <IconRail />
          <main className="relative flex-1 overflow-hidden rounded-tl-2xl bg-[#07111e]/95">
            {children}
          </main>
        </div>
      </div>
    </AppChromeProvider>
  );
}
