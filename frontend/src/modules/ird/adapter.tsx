import React, { createContext, useContext, useMemo } from "react";
import { formatINR } from "../../core/ui/currency";
import { playOrderChime } from "../../core/ui/audio";
import { irdApi, type IrdApi } from "./api";
import { irdRealtime, type IrdRealtime } from "./realtime";

export interface IrdAdapter {
  api: IrdApi;
  realtime: IrdRealtime;
  formatPrice: (amount: number | string | null | undefined, options?: { forceDecimals?: boolean }) => string;
  playChime: () => void;
}

const defaultIrdAdapter: IrdAdapter = {
  api: irdApi,
  realtime: irdRealtime,
  formatPrice: formatINR,
  playChime: playOrderChime,
};

const IrdAdapterContext = createContext<IrdAdapter>(defaultIrdAdapter);

export function IrdAdapterProvider({
  adapter,
  children,
}: {
  adapter?: Partial<IrdAdapter>;
  children: React.ReactNode;
}) {
  const value = useMemo<IrdAdapter>(
    () => ({
      api: adapter?.api ?? defaultIrdAdapter.api,
      realtime: adapter?.realtime ?? defaultIrdAdapter.realtime,
      formatPrice: adapter?.formatPrice ?? defaultIrdAdapter.formatPrice,
      playChime: adapter?.playChime ?? defaultIrdAdapter.playChime,
    }),
    [adapter]
  );

  return <IrdAdapterContext.Provider value={value}>{children}</IrdAdapterContext.Provider>;
}

export function useIrdAdapter(): IrdAdapter {
  return useContext(IrdAdapterContext);
}
