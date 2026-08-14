const MOVA_SHEETS = {
  Clients: [
    "id", "name", "whatsapp", "email", "landline", "cuitCuil", "preferredCargoTypes", "paymentTerms",
    "notes", "rating", "imageUrl", "hidden", "createdAt", "updatedAt"
  ],
  Transports: [
    "id", "name", "companyName", "cuitCuil", "whatsapp", "alternatePhone", "email", "vehicleType",
    "vehicleModel", "plate", "trailerPlate", "maxWeightKg", "capacityNotes", "acceptedCargoTypes",
    "usualRoutes", "paymentTerms", "rating", "notes", "imageUrl", "hidden", "createdAt", "updatedAt"
  ],
  Services: [
    "id", "title", "clientId", "transportId", "contractDate", "startAt", "estimatedEndAt", "origin",
    "destination", "originNotes", "destinationNotes", "distanceKm", "cargoDescription", "weightKg",
    "packageCount", "finalPriceArs", "finalPriceUsd", "commissionPercent", "commissionCurrencies",
    "clientConfirmation", "transportConfirmation", "resultStatus", "operationalStatus", "cancellationResponsibility", "chargeTiming", "chargeStatus",
    "customChargeNote", "clientInstructions", "transportInstructions", "internalNotes", "hidden",
    "createdAt", "updatedAt"
  ],
  Payments: ["id", "serviceId", "amount", "currency", "paidAt", "note", "hidden", "createdAt", "updatedAt"],
  ServiceNotes: ["id", "serviceId", "title", "content", "color", "x", "y", "width", "height", "order", "hidden", "createdAt", "updatedAt"],
  Meta: ["key", "value", "updatedAt"]
};

const MOVA_NUMBER_FIELDS = {
  Clients: ["rating"],
  Transports: ["rating", "maxWeightKg"],
  Services: ["distanceKm", "weightKg", "packageCount", "finalPriceArs", "finalPriceUsd", "commissionPercent"],
  Payments: ["amount"],
  ServiceNotes: ["x", "y", "width", "height", "order"]
};

const MOVA_JSON_FIELDS = {
  Services: ["commissionCurrencies"]
};

const MOVA_STRING_FIELDS = {
  Clients: ["name", "whatsapp", "email", "landline", "cuitCuil", "preferredCargoTypes", "paymentTerms", "notes", "imageUrl"],
  Transports: [
    "name", "companyName", "cuitCuil", "whatsapp", "alternatePhone", "email", "vehicleType", "vehicleModel",
    "plate", "trailerPlate", "capacityNotes", "acceptedCargoTypes", "usualRoutes", "paymentTerms", "notes", "imageUrl"
  ],
  Services: [
    "title", "clientId", "transportId", "contractDate", "startAt", "estimatedEndAt", "origin", "destination",
    "originNotes", "destinationNotes", "cargoDescription", "clientConfirmation", "transportConfirmation",
    "resultStatus", "operationalStatus", "cancellationResponsibility", "chargeTiming", "chargeStatus", "customChargeNote", "clientInstructions", "transportInstructions",
    "internalNotes"
  ],
  Payments: ["serviceId", "currency", "paidAt", "note"],
  ServiceNotes: ["serviceId", "title", "content", "color"]
};

const MOVA_PUBLIC_ACTIONS = ["auth.login"];

function movaRequiredProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw movaError("CONFIG_MISSING", "Falta configurar Script Property: " + name);
  return value;
}

function movaOptionalProperty(name, fallback) {
  return PropertiesService.getScriptProperties().getProperty(name) || fallback || "";
}
