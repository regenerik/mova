export type Currency = "ARS" | "USD";
export type PartyConfirmationStatus = "pending" | "confirmed" | "cancelled";
export type ResultStatus = "open" | "completed" | "cancelled";
export type CancellationResponsibility = "client" | "transport" | "both";
export type CollectionSection =
  | "active"
  | "confirmed"
  | "toConfirm"
  | "completed"
  | "cancelled";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  hidden?: boolean;
}

export interface Client extends BaseEntity {
  name: string;
  whatsapp: string;
  email?: string;
  landline?: string;
  cuitCuil?: string;
  preferredCargoTypes?: string;
  paymentTerms?: string;
  notes?: string;
  rating: number;
  imageUrl?: string;
}

export interface Transport extends BaseEntity {
  name: string;
  companyName?: string;
  cuitCuil?: string;
  whatsapp: string;
  alternatePhone?: string;
  email?: string;
  vehicleType?: string;
  vehicleModel?: string;
  plate?: string;
  trailerPlate?: string;
  maxWeightKg?: number | null;
  capacityNotes?: string;
  acceptedCargoTypes?: string;
  usualRoutes?: string;
  paymentTerms?: string;
  rating: number;
  notes?: string;
  imageUrl?: string;
}

export interface Service extends BaseEntity {
  title: string;
  clientId: string;
  transportId: string;
  contractDate?: string;
  startAt?: string;
  estimatedEndAt?: string;
  origin?: string;
  destination?: string;
  originNotes?: string;
  destinationNotes?: string;
  distanceKm?: number | null;
  cargoDescription?: string;
  weightKg?: number | null;
  packageCount?: number | null;
  finalPriceArs?: number | null;
  finalPriceUsd?: number | null;
  commissionPercent: number;
  commissionCurrencies: Currency[];
  clientConfirmation: PartyConfirmationStatus;
  transportConfirmation: PartyConfirmationStatus;
  resultStatus: ResultStatus;
  cancellationResponsibility?: CancellationResponsibility | null;
  chargeTiming: "before_pickup" | "at_pickup" | "at_delivery" | "after_delivery" | "custom";
  chargeStatus: "pending" | "received" | "partial";
  customChargeNote?: string;
  clientInstructions?: string;
  transportInstructions?: string;
  internalNotes?: string;
}

export interface Payment extends BaseEntity {
  serviceId: string;
  amount: number;
  currency: Currency;
  paidAt: string;
  note?: string;
}

export interface ServiceNote extends BaseEntity {
  serviceId: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  color?: string;
}

export interface AIServiceDraft {
  title: string | null;
  client: {
    name: string | null;
    whatsapp: string | null;
    cuitCuil: string | null;
  };
  transport: {
    name: string | null;
    whatsapp: string | null;
    vehicleModel: string | null;
    plate: string | null;
  };
  contractDate: string | null;
  startAt: string | null;
  estimatedEndAt: string | null;
  route: {
    origin: string | null;
    destination: string | null;
    distanceKm: number | null;
  };
  cargo: {
    description: string | null;
    weightKg: number | null;
    packageCount: number | null;
  };
  pricing: {
    ars: number | null;
    usd: number | null;
    commissionPercent: number | null;
    commissionAppliesTo: Currency[] | null;
  };
  clientInstructions: string | null;
  transportInstructions: string | null;
  generalNotes: string[];
}

export interface BootstrapData {
  clients: Client[];
  transports: Transport[];
  services: Service[];
  payments: Payment[];
  notes: ServiceNote[];
}

export interface Session {
  token: string;
  username: string;
  expiresAt?: string;
}
