import type {
  AIServiceDraft,
  BootstrapData,
  CancellationResponsibility,
  Client,
  CollectionSection,
  Currency,
  Payment,
  Service,
  Transport
} from "@/types";

const moneyFormatter = {
  ARS: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
};

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(value: number | null | undefined, currency: Currency): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return moneyFormatter[currency].format(value);
}

export function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function serviceProgress(service: Pick<Service, "startAt" | "estimatedEndAt">, now = new Date()): number {
  if (!service.startAt || !service.estimatedEndAt) return 0;
  const start = new Date(service.startAt).getTime();
  const end = new Date(service.estimatedEndAt).getTime();
  const current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round(clamp(((current - start) / (end - start)) * 100));
}

export function isServiceOverdue(service: Service, now = new Date()): boolean {
  if (service.resultStatus !== "open" || !service.estimatedEndAt) return false;
  const end = new Date(service.estimatedEndAt).getTime();
  return Number.isFinite(end) && end < now.getTime();
}

export function isBudgetDefined(service: Service): boolean {
  const hasPrice = positive(service.finalPriceArs) || positive(service.finalPriceUsd);
  return Boolean(hasPrice && positive(service.distanceKm));
}

export function classifyService(service: Service, now = new Date()): CollectionSection {
  if (service.resultStatus === "completed") return "completed";
  if (service.resultStatus === "cancelled") return "cancelled";

  const start = service.startAt ? new Date(service.startAt).getTime() : NaN;
  if (Number.isFinite(start) && start <= now.getTime()) return "active";

  const ready =
    service.clientConfirmation === "confirmed" &&
    service.transportConfirmation === "confirmed" &&
    isBudgetDefined(service) &&
    Number.isFinite(start) &&
    start > now.getTime();

  return ready ? "confirmed" : "toConfirm";
}

export function pricePerKm(service: Service, currency: Currency): number | null {
  const amount = currency === "ARS" ? service.finalPriceArs : service.finalPriceUsd;
  return divide(amount, service.distanceKm);
}

export function pricePerKg(service: Service, currency: Currency): number | null {
  const amount = currency === "ARS" ? service.finalPriceArs : service.finalPriceUsd;
  return divide(amount, service.weightKg);
}

export function commission(service: Service, currency: Currency): number | null {
  if (!service.commissionCurrencies.includes(currency)) return null;
  const amount = currency === "ARS" ? service.finalPriceArs : service.finalPriceUsd;
  if (!positive(amount)) return null;
  return (amount * service.commissionPercent) / 100;
}

export function paymentTotals(serviceId: string, payments: Payment[]) {
  const totals = { ARS: 0, USD: 0 };
  const targetServiceId = String(serviceId);
  for (const payment of payments) {
    if (String(payment.serviceId) === targetServiceId) totals[payment.currency] += moneyNumber(payment.amount);
  }
  return totals;
}

export function pendingBalance(service: Service, payments: Payment[]) {
  const totals = paymentTotals(service.id, payments);
  return {
    ARS: Math.max(0, (service.finalPriceArs ?? 0) - totals.ARS),
    USD: Math.max(0, (service.finalPriceUsd ?? 0) - totals.USD)
  };
}

function pendingCommissionBalance(service: Service, payments: Payment[]) {
  const totals = paymentTotals(service.id, payments);
  return {
    ARS: Math.max(0, (commission(service, "ARS") ?? 0) - totals.ARS),
    USD: Math.max(0, (commission(service, "USD") ?? 0) - totals.USD)
  };
}

export function countsBySection(services: Service[], now = new Date()) {
  return services.reduce(
    (acc, service) => {
      acc[classifyService(service, now)] += 1;
      return acc;
    },
    { active: 0, confirmed: 0, toConfirm: 0, completed: 0, cancelled: 0 } satisfies Record<CollectionSection, number>
  );
}

export function clientStats(client: Client, data: BootstrapData) {
  const services = data.services.filter((service) => service.clientId === client.id);
  return {
    completed: services.filter((service) => service.resultStatus === "completed").length,
    cancelled: services.filter((service) => isCancellationBy(service.cancellationResponsibility, "client")).length,
    commissionArs: sum(services.map((service) => commission(service, "ARS"))),
    commissionUsd: sum(services.map((service) => commission(service, "USD")))
  };
}

export function transportStats(transport: Transport, data: BootstrapData) {
  const services = data.services.filter((service) => service.transportId === transport.id);
  return {
    completed: services.filter((service) => service.resultStatus === "completed").length,
    cancelled: services.filter((service) => isCancellationBy(service.cancellationResponsibility, "transport")).length
  };
}

export function cancellationResponsibilityLabel(value?: CancellationResponsibility | null): string {
  if (value === "client") return "Cliente";
  if (value === "transport") return "Transporte";
  if (value === "both") return "Cliente y transporte";
  return "Sin atribuir";
}

export function appStats(data: BootstrapData, from?: string, to?: string) {
  const start = from ? new Date(from).getTime() : -Infinity;
  const end = to ? new Date(to).getTime() : Infinity;
  const services = data.services.filter((service) => {
    const ref = new Date(service.contractDate || service.createdAt).getTime();
    return ref >= start && ref <= end;
  });
  const billableServices = services.filter((service) => service.resultStatus !== "cancelled");
  const billableServiceIds = new Set(billableServices.map((service) => String(service.id)));
  const billablePayments = data.payments.filter((payment) => billableServiceIds.has(String(payment.serviceId)));
  const paymentsPending = billableServices.filter((service) => {
    const balance = pendingCommissionBalance(service, data.payments);
    return balance.ARS > 0 || balance.USD > 0;
  }).length;

  return {
    services,
    counts: countsBySection(services),
    commissionGeneratedArs: sum(billableServices.map((service) => commission(service, "ARS"))),
    commissionGeneratedUsd: sum(billableServices.map((service) => commission(service, "USD"))),
    completedCommissionArs: sum(
      billableServices.filter((service) => service.resultStatus === "completed").map((service) => commission(service, "ARS"))
    ),
    completedCommissionUsd: sum(
      billableServices.filter((service) => service.resultStatus === "completed").map((service) => commission(service, "USD"))
    ),
    projectedCommissionArs: sum(
      billableServices.filter((service) => service.resultStatus === "open").map((service) => commission(service, "ARS"))
    ),
    projectedCommissionUsd: sum(
      billableServices.filter((service) => service.resultStatus === "open").map((service) => commission(service, "USD"))
    ),
    collectedArs: sum(billablePayments.filter((payment) => payment.currency === "ARS").map((payment) => moneyNumber(payment.amount))),
    collectedUsd: sum(billablePayments.filter((payment) => payment.currency === "USD").map((payment) => moneyNumber(payment.amount))),
    paymentsPending,
    pendingArs: sum(billableServices.map((service) => pendingCommissionBalance(service, data.payments).ARS)),
    pendingUsd: sum(billableServices.map((service) => pendingCommissionBalance(service, data.payments).USD)),
    operationTotalArs: sum(billableServices.map((service) => service.finalPriceArs)),
    operationTotalUsd: sum(billableServices.map((service) => service.finalPriceUsd)),
    cancellationRate: services.length
      ? (services.filter((service) => service.resultStatus === "cancelled").length / services.length) * 100
      : 0,
    managedKm: sum(billableServices.map((service) => service.distanceKm)),
    transportedKg: sum(billableServices.map((service) => service.weightKg)),
    averageTicketArs: average(billableServices.map((service) => service.finalPriceArs)),
    averageTicketUsd: average(billableServices.map((service) => service.finalPriceUsd)),
    averageCommission: average(billableServices.map((service) => service.commissionPercent))
  };
}

export function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function whatsappLink(phone: unknown, message?: string): string {
  const normalized = whatsappTargetPhone(phone);
  const encoded = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${encoded}`;
}

function whatsappTargetPhone(phone: unknown): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("54") && !digits.startsWith("549") && digits.length === 12) return `549${digits.slice(2)}`;
  if (digits.startsWith("54")) return digits;
  if (digits.length === 10) return `549${digits}`;
  return digits;
}

export function buildClientMessage(service: Service, client?: Client, transport?: Transport): string {
  return compactLines([
    `Hola${client?.name ? ` ${client.name}` : ""}, te comparto los datos del servicio MOVA: ${service.title}`,
    routeLine(service),
    service.contractDate ? `Contratacion: ${formatDate(service.contractDate)}` : "",
    service.startAt ? `Inicio: ${formatDate(service.startAt)}` : "",
    service.estimatedEndAt ? `Llegada estimada: ${formatDate(service.estimatedEndAt)}` : "",
    service.distanceKm ? `Kilometros: ${service.distanceKm}` : "",
    service.cargoDescription ? `Carga: ${service.cargoDescription}` : "",
    service.weightKg ? `Peso: ${service.weightKg} kg` : "",
    service.packageCount ? `Paquetes: ${service.packageCount}` : "",
    priceAgreementLine(service),
    transport?.name ? `Transporte: ${transport.name}${transport.plate ? `, patente ${transport.plate}` : ""}` : "",
    service.clientInstructions ? `Instrucciones para cliente: ${service.clientInstructions}` : ""
  ]);
}

export function buildTransportMessage(service: Service, client?: Client): string {
  return compactLines([
    `Hola, te comparto los datos del servicio MOVA: ${service.title}`,
    routeLine(service),
    service.contractDate ? `Contratacion: ${formatDate(service.contractDate)}` : "",
    service.startAt ? `Inicio: ${formatDate(service.startAt)}` : "",
    service.estimatedEndAt ? `Llegada estimada: ${formatDate(service.estimatedEndAt)}` : "",
    service.distanceKm ? `Kilometros: ${service.distanceKm}` : "",
    service.cargoDescription ? `Carga: ${service.cargoDescription}` : "",
    service.weightKg ? `Peso: ${service.weightKg} kg` : "",
    service.packageCount ? `Paquetes: ${service.packageCount}` : "",
    priceAgreementLine(service),
    client?.name ? `Cliente: ${client.name}` : "",
    service.transportInstructions ? `Instrucciones para transporte: ${service.transportInstructions}` : ""
  ]);
}

export function emptyAIDraft(): AIServiceDraft {
  return {
    title: null,
    client: { name: null, whatsapp: null, cuitCuil: null },
    transport: { name: null, whatsapp: null, vehicleModel: null, plate: null },
    contractDate: null,
    startAt: null,
    estimatedEndAt: null,
    route: { origin: null, destination: null, distanceKm: null },
    cargo: { description: null, weightKg: null, packageCount: null },
    pricing: { ars: null, usd: null, commissionPercent: null, commissionAppliesTo: null },
    clientInstructions: null,
    transportInstructions: null,
    generalNotes: []
  };
}

export function aiDraftToServiceFields(draft?: Partial<AIServiceDraft> | null): Partial<Service> {
  const safe = draft || {};
  const route: Partial<AIServiceDraft["route"]> = safe.route || {};
  const cargo: Partial<AIServiceDraft["cargo"]> = safe.cargo || {};
  const pricing: Partial<AIServiceDraft["pricing"]> = safe.pricing || {};
  const notes = Array.isArray(safe.generalNotes) ? safe.generalNotes : [];
  return {
    title: safe.title || "",
    contractDate: safe.contractDate || undefined,
    startAt: safe.startAt || undefined,
    estimatedEndAt: safe.estimatedEndAt || undefined,
    origin: route.origin || undefined,
    destination: route.destination || undefined,
    distanceKm: route.distanceKm ?? null,
    cargoDescription: cargo.description || undefined,
    weightKg: cargo.weightKg ?? null,
    packageCount: cargo.packageCount ?? null,
    finalPriceArs: pricing.ars ?? null,
    finalPriceUsd: pricing.usd ?? null,
    commissionPercent: pricing.commissionPercent || 10,
    commissionCurrencies: pricing.commissionAppliesTo || ["ARS"],
    clientInstructions: safe.clientInstructions || undefined,
    transportInstructions: safe.transportInstructions || undefined,
    internalNotes: notes.join("\n")
  };
}

function routeLine(service: Service): string {
  if (!service.origin && !service.destination) return "";
  return `Recorrido: ${service.origin || "-"} -> ${service.destination || "-"}`;
}

function priceAgreementLine(service: Service): string {
  const prices = [
    positive(service.finalPriceArs) ? formatMoney(service.finalPriceArs, "ARS") : "",
    positive(service.finalPriceUsd) ? formatMoney(service.finalPriceUsd, "USD") : ""
  ].filter(Boolean);
  return prices.length ? `Precio acordado: ${prices.join(" + ")}` : "";
}

function compactLines(lines: Array<string | undefined>): string {
  return lines.filter(Boolean).join("\r\n");
}

function divide(value?: number | null, by?: number | null): number | null {
  if (!positive(value) || !positive(by)) return null;
  return value / by;
}

function positive(value?: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  }
  return 0;
}

function isCancellationBy(value: CancellationResponsibility | null | undefined, party: "client" | "transport"): boolean {
  return value === party || value === "both";
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, value) => acc + (Number.isFinite(value) ? Number(value) : 0), 0);
}

function average(values: Array<number | null | undefined>): number {
  const clean = values.filter((value): value is number => Number.isFinite(value));
  return clean.length ? sum(clean) / clean.length : 0;
}
