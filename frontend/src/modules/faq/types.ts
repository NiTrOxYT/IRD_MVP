export interface FaqItem {
  id: number;
  propertyId: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FaqPayload = Omit<FaqItem, "id" | "propertyId" | "createdAt" | "updatedAt">;

export interface FaqHttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}
