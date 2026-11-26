export type InboxCategory = "Notice" | "Offer" | "Event" | "Alert" | "Concierge";

export interface GuestInboxMessage {
  id: number;
  propertyId: number;
  title: string;
  body: string;
  category: InboxCategory | string;
  targetType: "all" | "rooms";
  targetRoomIds: number[];
  targetRoomNumbers: string[];
  createdByName: string | null;
  isActive: boolean;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  readCount?: number;
}

export interface CreateInboxMessagePayload {
  title: string;
  body: string;
  category: InboxCategory;
  targetType: "all" | "rooms";
  targetRoomIds: number[];
  isActive?: boolean;
}
