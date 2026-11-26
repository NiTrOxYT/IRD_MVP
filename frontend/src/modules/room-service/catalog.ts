import {
  AmenityFlaconIcon,
  FoldedTowelStackIcon,
  PorterLuggageIcon,
  SuiteBedIcon,
  SuiteCareBellIcon,
  SuiteRefreshIcon,
  TurndownCrescentIcon,
} from "../../core/ui/CustomResortIcons";
import type { RoomServiceCatalogItem } from "./types";

export const ROOM_SERVICE_CATALOG: RoomServiceCatalogItem[] = [
  {
    type: "cleaning",
    title: "Room Cleaning & Refresh",
    desc: "Complete suite refresh, dust & wipe, bed making, and waste clearance.",
    icon: SuiteRefreshIcon,
    badge: "Daily Refresh",
  },
  {
    type: "towels",
    title: "Fresh Bath Towels",
    desc: "Plush bath towels, hand towels, face cloths, and absorbent bath mats.",
    icon: FoldedTowelStackIcon,
    badge: "Bathroom",
  },
  {
    type: "toiletries",
    title: "Toiletries & Amenities",
    desc: "Luxury bath gel, herbal shampoo, conditioner, dental kit, and vanity set.",
    icon: AmenityFlaconIcon,
    badge: "Bathroom",
  },
  {
    type: "linen",
    title: "Fresh Bed Linen",
    desc: "Crisp cotton bed sheets and pillowcase change for all suite beds.",
    icon: SuiteBedIcon,
    badge: "Bedding",
  },
  {
    type: "pillows_blankets",
    title: "Extra Pillows & Blankets",
    desc: "Plush hypoallergenic pillows and warm resort duvet/blanket.",
    icon: SuiteBedIcon,
    badge: "Bedding",
  },
  {
    type: "turndown",
    title: "Evening Turndown",
    desc: "Curtains drawn, bedding turned down, ambient lighting & fresh drinking water.",
    icon: TurndownCrescentIcon,
    badge: "Evening",
  },
  {
    type: "luggage",
    title: "Luggage & Porter Assistance",
    desc: "Assistance with luggage collection, room transfer, or departure transport.",
    icon: PorterLuggageIcon,
    badge: "Porter",
  },
  {
    type: "other",
    title: "Other In-Suite Assistance",
    desc: "Special housekeeping requests, iron & board, or extra packaged water.",
    icon: SuiteCareBellIcon,
    badge: "Concierge",
  },
];
