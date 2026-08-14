import type { BootstrapData } from "@/types";

const now = new Date();
const hours = (amount: number) => new Date(now.getTime() + amount * 60 * 60 * 1000).toISOString();

export const demoData: BootstrapData = {
  clients: [
    {
      id: "client-demo-1",
      name: "Bodega Las Sierras",
      whatsapp: "+5492615550101",
      email: "operaciones@example.com",
      cuitCuil: "30-00000000-1",
      preferredCargoTypes: "Pallets, bebidas",
      paymentTerms: "Pago parcial al retirar",
      notes: "Prioriza ventanas horarias de mañana.",
      rating: 5,
      hidden: false,
      createdAt: hours(-240),
      updatedAt: hours(-12)
    },
    {
      id: "client-demo-2",
      name: "Norte Insumos",
      whatsapp: "+5493515550102",
      preferredCargoTypes: "Material industrial",
      paymentTerms: "Transferencia al entregar",
      rating: 4,
      hidden: false,
      createdAt: hours(-180),
      updatedAt: hours(-48)
    }
  ],
  transports: [
    {
      id: "transport-demo-1",
      name: "Carlos Benitez",
      companyName: "CB Logistica",
      whatsapp: "+5493415550201",
      vehicleType: "Semirremolque",
      vehicleModel: "Scania R450",
      plate: "AB123CD",
      trailerPlate: "AC456EF",
      maxWeightKg: 28000,
      acceptedCargoTypes: "Pallets, general",
      usualRoutes: "Cuyo, Centro, AMBA",
      paymentTerms: "50% al retirar",
      rating: 5,
      hidden: false,
      createdAt: hours(-260),
      updatedAt: hours(-16)
    },
    {
      id: "transport-demo-2",
      name: "Mariana Gomez",
      whatsapp: "+5492215550202",
      vehicleType: "Chasis",
      vehicleModel: "Mercedes Atego",
      plate: "AD789GH",
      maxWeightKg: 8000,
      acceptedCargoTypes: "Carga seca",
      rating: 4,
      hidden: false,
      createdAt: hours(-160),
      updatedAt: hours(-8)
    }
  ],
  services: [
    {
      id: "service-demo-1",
      title: "Pallets Mendoza -> Rosario",
      clientId: "client-demo-1",
      transportId: "transport-demo-1",
      contractDate: hours(-48),
      startAt: hours(-3),
      estimatedEndAt: hours(6),
      origin: "Lujan de Cuyo, Mendoza",
      destination: "Rosario, Santa Fe",
      distanceKm: 880,
      cargoDescription: "22 pallets de bebidas",
      weightKg: 18000,
      packageCount: 22,
      finalPriceArs: 1650000,
      finalPriceUsd: null,
      commissionPercent: 10,
      commissionCurrencies: ["ARS"],
      clientConfirmation: "confirmed",
      transportConfirmation: "confirmed",
      resultStatus: "open",
      chargeTiming: "before_pickup",
      chargeStatus: "partial",
      clientInstructions: "Tener autoelevador disponible y remito impreso.",
      transportInstructions: "Ingresar por porton norte. Avisar 30 minutos antes.",
      internalNotes: "Cliente sensible al horario.",
      hidden: false,
      createdAt: hours(-48),
      updatedAt: hours(-2)
    },
    {
      id: "service-demo-2",
      title: "Insumos Cordoba -> CABA",
      clientId: "client-demo-2",
      transportId: "transport-demo-2",
      contractDate: hours(-12),
      startAt: hours(30),
      estimatedEndAt: hours(42),
      origin: "Cordoba Capital",
      destination: "Barracas, CABA",
      distanceKm: 700,
      cargoDescription: "Carga seca industrial",
      weightKg: 5200,
      finalPriceArs: 980000,
      finalPriceUsd: 780,
      commissionPercent: 12,
      commissionCurrencies: ["ARS", "USD"],
      clientConfirmation: "confirmed",
      transportConfirmation: "pending",
      resultStatus: "open",
      chargeTiming: "at_delivery",
      chargeStatus: "pending",
      hidden: false,
      createdAt: hours(-12),
      updatedAt: hours(-12)
    }
  ],
  payments: [
    {
      id: "payment-demo-1",
      serviceId: "service-demo-1",
      amount: 600000,
      currency: "ARS",
      paidAt: hours(-2),
      note: "Transferencia inicial",
      createdAt: hours(-2),
      updatedAt: hours(-2)
    }
  ],
  notes: [
    {
      id: "note-demo-1",
      serviceId: "service-demo-1",
      title: "Descarga",
      content: "Confirmar autoelevador antes de llegada.",
      x: 0,
      y: 0,
      width: 240,
      height: 150,
      order: 1,
      color: "amber",
      createdAt: hours(-4),
      updatedAt: hours(-2)
    }
  ]
};
