import assert from "node:assert/strict";
import test from "node:test";
import { aiDraftToServiceFields, appStats, buildClientMessage, buildTransportMessage, classifyService, clientStats, commission, normalizePhone, pendingBalance, serviceProgress, transportStats, whatsappLink } from "../lib/domain";
import type { BootstrapData, Client, Payment, Service, Transport } from "../types";

const base: Service = {
  id: "svc",
  title: "Servicio",
  clientId: "client",
  transportId: "transport",
  finalPriceArs: 1000,
  finalPriceUsd: 100,
  distanceKm: 100,
  weightKg: 10,
  commissionPercent: 10,
  commissionCurrencies: ["ARS"],
  clientConfirmation: "pending",
  transportConfirmation: "pending",
  resultStatus: "open",
  chargeTiming: "after_delivery",
  chargeStatus: "pending",
  hidden: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

test("clasifica servicios activos por fecha de inicio alcanzada", () => {
  const service = { ...base, startAt: "2026-01-01T10:00:00.000Z", estimatedEndAt: "2026-01-01T12:00:00.000Z" };
  assert.equal(classifyService(service, new Date("2026-01-01T11:00:00.000Z")), "active");
});

test("clasifica servicios futuros confirmados solo con ambas partes y presupuesto", () => {
  const service = {
    ...base,
    clientConfirmation: "confirmed" as const,
    transportConfirmation: "confirmed" as const,
    startAt: "2026-01-02T10:00:00.000Z",
    estimatedEndAt: "2026-01-02T12:00:00.000Z"
  };
  assert.equal(classifyService(service, new Date("2026-01-01T10:00:00.000Z")), "confirmed");
});

test("calcula progreso temporal con clamp", () => {
  const service = { ...base, startAt: "2026-01-01T10:00:00.000Z", estimatedEndAt: "2026-01-01T12:00:00.000Z" };
  assert.equal(serviceProgress(service, new Date("2026-01-01T11:00:00.000Z")), 50);
  assert.equal(serviceProgress(service, new Date("2026-01-01T13:00:00.000Z")), 100);
});

test("calcula comision por moneda sin convertir", () => {
  assert.equal(commission(base, "ARS"), 100);
  assert.equal(commission(base, "USD"), null);
});

test("conserva multiples pagos parciales y calcula saldo por moneda", () => {
  const payments: Payment[] = [
    { id: "p1", serviceId: "svc", amount: 250, currency: "ARS", paidAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "p2", serviceId: "svc", amount: 300, currency: "ARS", paidAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "p3", serviceId: "svc", amount: 20, currency: "USD", paidAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
  ];
  assert.deepEqual(pendingBalance(base, payments), { ARS: 450, USD: 80 });
});

test("estadisticas de cobros excluyen cancelados y comparan contra comision", () => {
  const data: BootstrapData = {
    clients: [],
    transports: [],
    notes: [],
    services: [
      { ...base, id: "active", finalPriceArs: 1000, commissionPercent: 10, resultStatus: "open" },
      { ...base, id: "paid", finalPriceArs: 2000, commissionPercent: 10, resultStatus: "completed" },
      { ...base, id: "cancelled", finalPriceArs: 9000, commissionPercent: 10, resultStatus: "cancelled" }
    ],
    payments: [
      { id: "p-active", serviceId: "active", amount: 150, currency: "ARS", paidAt: base.createdAt, createdAt: base.createdAt, updatedAt: base.updatedAt },
      { id: "p-paid", serviceId: "paid", amount: 250, currency: "ARS", paidAt: base.createdAt, createdAt: base.createdAt, updatedAt: base.updatedAt },
      { id: "p-cancelled", serviceId: "cancelled", amount: 1, currency: "ARS", paidAt: base.createdAt, createdAt: base.createdAt, updatedAt: base.updatedAt }
    ]
  };

  const stats = appStats(data);

  assert.equal(stats.commissionGeneratedArs, 300);
  assert.equal(stats.collectedArs, 400);
  assert.equal(stats.paymentsPending, 0);
  assert.equal(stats.pendingArs, 0);
  assert.equal(stats.operationTotalArs, 3000);
});

test("atribuye cancelaciones a la parte responsable", () => {
  const client: Client = { id: "client", name: "Cliente", whatsapp: "11", rating: 4, createdAt: base.createdAt, updatedAt: base.updatedAt };
  const transport: Transport = { id: "transport", name: "Transporte", whatsapp: "11", rating: 4, createdAt: base.createdAt, updatedAt: base.updatedAt };
  const data: BootstrapData = {
    clients: [client],
    transports: [transport],
    payments: [],
    notes: [],
    services: [
      { ...base, id: "cancel-client", resultStatus: "cancelled", cancellationResponsibility: "client" },
      { ...base, id: "cancel-transport", resultStatus: "cancelled", cancellationResponsibility: "transport" },
      { ...base, id: "cancel-both", resultStatus: "cancelled", cancellationResponsibility: "both" },
      { ...base, id: "cancel-legacy", resultStatus: "cancelled" }
    ]
  };

  assert.equal(clientStats(client, data).cancelled, 2);
  assert.equal(transportStats(transport, data).cancelled, 2);
});

test("normaliza telefonos aunque Sheets devuelva numeros", () => {
  assert.equal(normalizePhone(1155887744), "1155887744");
  assert.equal(normalizePhone("+54 9 11 5588-7744"), "+5491155887744");
  assert.equal(normalizePhone(null), "");
});

test("arma links de WhatsApp con telefono internacional", () => {
  assert.equal(whatsappLink(1145657898), "https://wa.me/5491145657898");
  assert.equal(whatsappLink("+54 11 4565-7898"), "https://wa.me/5491145657898");
  assert.equal(whatsappLink("+54 9 11 5588-7744"), "https://wa.me/5491155887744");
  assert.equal(whatsappLink(1145657898, "Hola MOVA"), "https://wa.me/5491145657898?text=Hola%20MOVA");
});

test("arma mensajes de WhatsApp con precio e instrucciones por destinatario", () => {
  const service: Service = {
    ...base,
    origin: "Origen",
    destination: "Destino",
    startAt: "2026-01-01T10:00:00.000Z",
    estimatedEndAt: "2026-01-01T12:00:00.000Z",
    cargoDescription: "Repuestos",
    packageCount: 8,
    clientInstructions: "Cliente descarga con autoelevador.",
    transportInstructions: "Transporte avisa media hora antes."
  };
  const client: Client = { id: "client", name: "Pedro", whatsapp: "11", rating: 4, createdAt: base.createdAt, updatedAt: base.updatedAt };
  const transport: Transport = { id: "transport", name: "Juan", whatsapp: "11", plate: "AA123BB", rating: 5, createdAt: base.createdAt, updatedAt: base.updatedAt };

  const clientMessage = buildClientMessage(service, client, transport);
  const transportMessage = buildTransportMessage(service, client);

  assert.match(clientMessage, /Precio acordado: .*1\.000.*100/);
  assert.match(transportMessage, /Precio acordado: .*1\.000.*100/);
  assert.match(clientMessage, /MOVA: Servicio\r\nRecorrido:/);
  assert.match(transportMessage, /MOVA: Servicio\r\nRecorrido:/);
  assert.match(clientMessage, /Instrucciones para cliente: Cliente descarga con autoelevador\./);
  assert.match(transportMessage, /Instrucciones para transporte: Transporte avisa media hora antes\./);
  assert.match(whatsappLink(1145657898, transportMessage), /%0D%0ARecorrido%3A/);
});

test("convierte drafts IA incompletos sin romper el formulario", () => {
  assert.deepEqual(
    aiDraftToServiceFields({
      title: "Servicio IA",
      cargo: { description: "18 pallets", weightKg: 7500, packageCount: null },
      generalNotes: ["Sin intemperie"]
    }),
    {
      title: "Servicio IA",
      contractDate: undefined,
      startAt: undefined,
      estimatedEndAt: undefined,
      origin: undefined,
      destination: undefined,
      distanceKm: null,
      cargoDescription: "18 pallets",
      weightKg: 7500,
      packageCount: null,
      finalPriceArs: null,
      finalPriceUsd: null,
      commissionPercent: 10,
      commissionCurrencies: ["ARS"],
      clientInstructions: undefined,
      transportInstructions: undefined,
      internalNotes: "Sin intemperie"
    }
  );
});
