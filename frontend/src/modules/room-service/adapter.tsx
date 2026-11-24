import React, { createContext, useContext, useMemo } from "react";
import { roomServiceApi, type RoomServiceApi } from "./api";
import { roomServiceRealtime, type RoomServiceRealtime } from "./realtime";

export interface RoomServiceAdapter {
  api: RoomServiceApi;
  realtime: RoomServiceRealtime;
}

const defaultAdapter: RoomServiceAdapter = {
  api: roomServiceApi,
  realtime: roomServiceRealtime,
};

const RoomServiceAdapterContext = createContext<RoomServiceAdapter>(defaultAdapter);

export function RoomServiceAdapterProvider({
  adapter,
  children,
}: {
  adapter?: Partial<RoomServiceAdapter>;
  children: React.ReactNode;
}) {
  const value = useMemo<RoomServiceAdapter>(
    () => ({
      api: adapter?.api ?? defaultAdapter.api,
      realtime: adapter?.realtime ?? defaultAdapter.realtime,
    }),
    [adapter]
  );

  return (
    <RoomServiceAdapterContext.Provider value={value}>
      {children}
    </RoomServiceAdapterContext.Provider>
  );
}

export function useRoomServiceAdapter(): RoomServiceAdapter {
  return useContext(RoomServiceAdapterContext);
}
