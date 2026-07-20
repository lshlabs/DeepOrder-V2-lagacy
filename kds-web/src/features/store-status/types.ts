export type StoreOperatingStatus = "OPEN" | "PAUSED" | "CLOSED";
export type StoreStatusSource = "MANUAL" | "BREAKTIME";
export type StoreStatus = StoreOperatingStatus;

export type KdsStoreContext = {
  storeId: string;
  storeName: string;
  operatingStatus: StoreOperatingStatus;
  pausedUntil: string | null;
  statusSource: StoreStatusSource;
};

export type UpdateStoreStatusRequest = {
  operatingStatus: StoreOperatingStatus;
  pauseMinutes?: number;
};
