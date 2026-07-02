"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface AppChromeStore {
  selectedOperationStationId: string | null;
  setSelectedOperationStationId: (id: string | null) => void;
}

const AppChromeContext = createContext<AppChromeStore | null>(null);

export function AppChromeProvider({ children }: { children: React.ReactNode }) {
  const [selectedOperationStationId, setSelectedOperationStationId] = useState<
    string | null
  >(null);

  const value = useMemo(
    () => ({ selectedOperationStationId, setSelectedOperationStationId }),
    [selectedOperationStationId]
  );

  return (
    <AppChromeContext.Provider value={value}>
      {children}
    </AppChromeContext.Provider>
  );
}

export function useAppChromeStore(): AppChromeStore {
  const ctx = useContext(AppChromeContext);
  if (!ctx) {
    throw new Error("useAppChromeStore must be used within AppChromeProvider");
  }
  return ctx;
}
