import React, { createContext, useContext, useMemo } from "react";
import { faqApi, type FaqApi } from "./api";

export interface FaqAdapter {
  api: FaqApi;
}

const defaultAdapter: FaqAdapter = {
  api: faqApi,
};

const FaqAdapterContext = createContext<FaqAdapter>(defaultAdapter);

export function FaqAdapterProvider({
  adapter,
  children,
}: {
  adapter?: Partial<FaqAdapter>;
  children: React.ReactNode;
}) {
  const value = useMemo<FaqAdapter>(
    () => ({
      api: adapter?.api ?? defaultAdapter.api,
    }),
    [adapter]
  );

  return <FaqAdapterContext.Provider value={value}>{children}</FaqAdapterContext.Provider>;
}

export function useFaqAdapter(): FaqAdapter {
  return useContext(FaqAdapterContext);
}
