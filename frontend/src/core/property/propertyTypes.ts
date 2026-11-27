import type { IrdHeroCard } from "../../modules/ird/types";

export interface PropertySettings {
  id: number;
  name: string;
  code: string;
  currency: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  irdEnabled: boolean;
  openingTime: string;
  closingTime: string;
  logoUrl: string | null;
  contactNumber: string | null;
  whatsappNumber?: string | null;
  attractionBookingTemplate?: string | null;
  welcomeMode?: "every_time" | "once_per_stay" | "disabled";
  welcomeMessage?: string | null;
  welcomeBgUrl?: string | null;
  diningHeroUrl?: string | null;
  diningHeroCards?: IrdHeroCard[];
  roomServiceHeroUrl?: string | null;
  attractionsHeroUrl?: string | null;
  suiteLoaderBgUrl?: string | null;
  landingVideoUrl?: string | null;
}

export interface Room {
  id: number;
  room_number: string;
  floor: string | null;
  wing: string | null;
  is_active: boolean;
  active_stay_id?: number | null;
  guest_name?: string | null;
  stay_token?: string | null;
  qr_token: string;
  check_in_at?: string | null;
}

export interface Stay {
  id: number;
  property_id: number;
  guest_name: string;
  guest_phone: string | null;
  stay_token: string;
  check_in_at: string;
  check_out_at: string | null;
  status: "active" | "checked_out" | "revoked";
  notes: string | null;
  room_id: number;
  room_number: string;
  floor: string | null;
  wing: string | null;
  order_count?: number;
}

export interface VerifiedStaySession {
  id: number;
  guestName: string;
  stayToken: string;
  status: string;
  checkInAt: string;
  notes: string | null;
  room: {
    id: number;
    roomNumber: string;
    floor: string | null;
    wing: string | null;
  };
}
