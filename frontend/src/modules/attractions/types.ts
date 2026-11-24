export interface AttractionMediaItem {
  type: "image" | "video";
  url: string;
  caption?: string;
}

export interface LocalAttraction {
  id: number;
  propertyId: number;
  title: string;
  subtitle: string | null;
  category: string;
  location: string | null;
  distanceText: string | null;
  description: string | null;
  timings: string | null;
  rating: number;
  cabPrice: number | null;
  entryFee: number | null;
  packagePrice: number | null;
  packageDetails: string | null;
  media: AttractionMediaItem[];
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type LocalAttractionPayload = Omit<LocalAttraction, "id" | "propertyId" | "createdAt" | "updatedAt">;

export interface AttractionsHttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}
