import React, { createContext, useContext, useMemo } from "react";
import { formatINR } from "../../core/ui/currency";
import { attractionsApi, type AttractionsApi } from "./api";

export interface AttractionsAdapter {
  api: AttractionsApi;
  formatPrice: (amount: number | string | null | undefined, options?: { forceDecimals?: boolean }) => string;
}

const defaultAdapter: AttractionsAdapter = {
  api: attractionsApi,
  formatPrice: formatINR,
};

const AttractionsAdapterContext = createContext<AttractionsAdapter>(defaultAdapter);

export function AttractionsAdapterProvider({
  adapter,
  children,
}: {
  adapter?: Partial<AttractionsAdapter>;
  children: React.ReactNode;
}) {
  const value = useMemo<AttractionsAdapter>(
    () => ({
      api: adapter?.api ?? defaultAdapter.api,
      formatPrice: adapter?.formatPrice ?? defaultAdapter.formatPrice,
    }),
    [adapter]
  );

  return (
    <AttractionsAdapterContext.Provider value={value}>
      {children}
    </AttractionsAdapterContext.Provider>
  );
}

export function useAttractionsAdapter(): AttractionsAdapter {
  return useContext(AttractionsAdapterContext);
}
