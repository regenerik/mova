"use client";

import { demoData } from "@/lib/demoData";
import type {
  AIServiceDraft,
  ApiResponse,
  BootstrapData,
  CancellationResponsibility,
  Client,
  Payment,
  Service,
  ServiceNote,
  Session,
  Transport
} from "@/types";

const endpoint = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim();
const demoMode = process.env.NEXT_PUBLIC_MOVA_DEMO_MODE === "true" || !endpoint;
const STORAGE_KEY = "mova-demo-data-v1";

export class MovaApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MovaApiError";
    this.code = code;
  }
}

async function request<T>(action: string, payload?: unknown, token?: string): Promise<T> {
  if (demoMode) return demoRequest(action, payload, token) as T;
  if (!endpoint) throw new MovaApiError("CONFIG_MISSING", "Falta NEXT_PUBLIC_APPS_SCRIPT_URL.");

  let response: Response | null = null;
  let result: ApiResponse<T> | null = null;
  const maxAttempts = canRetryAction(action, payload) ? 3 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload, token })
    });
  } catch (err) {
    if (err instanceof MovaApiError) throw err;
    throw new MovaApiError("NETWORK_ERROR", "No se pudo conectar con Apps Script. Revisá la URL del Web App y tu conexión.");
  }

  const text = await response.text();
  try {
    result = parseApiResponse<T>(text);
    break;
  } catch (err) {
    const canRetry = err instanceof MovaApiError && err.code === "APPS_SCRIPT_HTML_RESPONSE" && attempt < maxAttempts - 1;
    if (canRetry) {
      await wait(1200 + attempt * 1300);
      continue;
    }
    if (err instanceof MovaApiError && err.code === "APPS_SCRIPT_HTML_RESPONSE") {
      throw new MovaApiError(
        "APPS_SCRIPT_HTML_RESPONSE",
        "Apps Script devolvio HTML en vez de JSON. Se conservaron los datos actuales; proba actualizar de nuevo en unos segundos."
      );
    }
    throw err;
  }
  }

  if (!response || !result) throw new MovaApiError("BAD_API_RESPONSE", "Apps Script no devolvio una respuesta util.");
  if (!response.ok || !result.ok) {
    const code = result.error?.code || "API_ERROR";
    const message = result.error?.message || "No se pudo completar la operacion.";
    if (code === "UNAUTHORIZED") notifyUnauthorized(token);
    throw new MovaApiError(code, message);
  }

  return result.data as T;
}

function canRetryAction(action: string, payload: unknown): boolean {
  const hasId = typeof payload === "object" && payload !== null && "id" in payload && Boolean((payload as { id?: unknown }).id);
  return action === "bootstrap" || action === "ai.parseService" || ((action === "services.create" || action === "services.update") && hasId);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function parseApiResponse<T>(text: string): ApiResponse<T> {
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    const looksLikeHtml = /^\s*</.test(text);
    if (looksLikeHtml) {
      throw new MovaApiError(
        "APPS_SCRIPT_HTML_RESPONSE",
        "Apps Script devolvió HTML en vez de JSON. Revisá que NEXT_PUBLIC_APPS_SCRIPT_URL sea la URL /exec del Web App desplegado y que el deployment esté activo."
      );
    }
    throw new MovaApiError("BAD_API_RESPONSE", "Apps Script devolvió una respuesta inválida. Probá redeployar el Web App.");
  }
}

function notifyUnauthorized(token?: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mova:unauthorized", { detail: { token: token || "" } }));
}

export const appsScriptApi = {
  demoMode,
  login: (username: string, password: string) => request<Session>("auth.login", { username, password }),
  validateSession: (token: string) => request<Session>("auth.validate", undefined, token),
  bootstrap: (token: string) => request<BootstrapData>("bootstrap", undefined, token),
  createClient: (token: string, client: Partial<Client>) => request<Client>("clients.create", client, token),
  updateClient: (token: string, client: Client) => request<Client>("clients.update", client, token),
  hideClient: (token: string, id: string, hidden: boolean) => request<Client>("clients.hide", { id, hidden }, token),
  deleteClient: (token: string, id: string) => request<{ id: string }>("clients.delete", { id }, token),
  createTransport: (token: string, transport: Partial<Transport>) =>
    request<Transport>("transports.create", transport, token),
  updateTransport: (token: string, transport: Transport) => request<Transport>("transports.update", transport, token),
  hideTransport: (token: string, id: string, hidden: boolean) =>
    request<Transport>("transports.hide", { id, hidden }, token),
  deleteTransport: (token: string, id: string) => request<{ id: string }>("transports.delete", { id }, token),
  createService: (token: string, service: Partial<Service>) => request<Service>("services.create", service, token),
  updateService: (token: string, service: Service) => request<Service>("services.update", service, token),
  finalizeService: (token: string, id: string, resultStatus: "completed" | "cancelled", cancellationResponsibility?: CancellationResponsibility) =>
    request<Service>("services.finalize", { id, resultStatus, cancellationResponsibility }, token),
  addPayment: (token: string, payment: Partial<Payment>) => request<Payment>("payments.add", payment, token),
  updatePayment: (token: string, payment: Payment) => request<Payment>("payments.update", payment, token),
  deletePayment: (token: string, id: string) => request<{ id: string }>("payments.delete", { id }, token),
  upsertNote: (token: string, note: Partial<ServiceNote>) => request<ServiceNote>("notes.upsert", note, token),
  deleteNote: (token: string, id: string) => request<{ id: string }>("notes.delete", { id }, token),
  parseAIService: (token: string, text: string) => request<AIServiceDraft>("ai.parseService", { text }, token),
  uploadImage: (token: string, dataUrl: string) =>
    request<{ secureUrl: string; publicId: string }>("cloudinary.uploadBase64", { dataUrl }, token)
};

function demoRequest(action: string, payload?: unknown, token?: string): unknown {
  const data = readDemoData();
  const now = new Date().toISOString();
  if (action === "auth.login") return { token: "demo-token", username: "demo", expiresAt: "" };
  if (action === "auth.validate") {
    if (!token) throw new MovaApiError("UNAUTHORIZED", "Sesion no valida.");
    return { token, username: "demo", expiresAt: "" };
  }
  if (!token) throw new MovaApiError("UNAUTHORIZED", "Sesion no valida.");
  if (action === "bootstrap") return data;

  const save = <T>(value: T) => {
    writeDemoData(data);
    return value;
  };

  switch (action) {
    case "clients.create": {
      const client = withDefaults(payload as Partial<Client>, "client") as Client;
      data.clients.push(client);
      return save(client);
    }
    case "clients.update":
      return save(replace(data.clients, payload as Client));
    case "clients.hide": {
      const { id, hidden } = payload as { id: string; hidden: boolean };
      const client = mustFind(data.clients, id);
      client.hidden = hidden;
      client.updatedAt = now;
      return save(client);
    }
    case "clients.delete": {
      const { id } = payload as { id: string };
      if (data.services.some((service) => service.clientId === id)) {
        const client = mustFind(data.clients, id);
        client.hidden = true;
        return save({ id });
      }
      remove(data.clients, id);
      return save({ id });
    }
    case "transports.create": {
      const transport = withDefaults(payload as Partial<Transport>, "transport") as Transport;
      data.transports.push(transport);
      return save(transport);
    }
    case "transports.update":
      return save(replace(data.transports, payload as Transport));
    case "transports.hide": {
      const { id, hidden } = payload as { id: string; hidden: boolean };
      const transport = mustFind(data.transports, id);
      transport.hidden = hidden;
      transport.updatedAt = now;
      return save(transport);
    }
    case "transports.delete": {
      const { id } = payload as { id: string };
      if (data.services.some((service) => service.transportId === id)) {
        const transport = mustFind(data.transports, id);
        transport.hidden = true;
        return save({ id });
      }
      remove(data.transports, id);
      return save({ id });
    }
    case "services.create": {
      const service = withServiceDefaults(payload as Partial<Service>);
      data.services.push(service);
      return save(service);
    }
    case "services.update":
      return save(replace(data.services, payload as Service));
    case "services.finalize": {
      const { id, resultStatus, cancellationResponsibility } = payload as { id: string; resultStatus: "completed" | "cancelled"; cancellationResponsibility?: CancellationResponsibility };
      const service = mustFind(data.services, id);
      service.resultStatus = resultStatus;
      service.cancellationResponsibility = resultStatus === "cancelled" ? cancellationResponsibility || null : null;
      service.updatedAt = now;
      return save(service);
    }
    case "payments.add": {
      const payment = { ...(payload as Partial<Payment>), id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Payment;
      data.payments.push(payment);
      return save(payment);
    }
    case "payments.update":
      return save(replace(data.payments, payload as Payment));
    case "payments.delete": {
      remove(data.payments, (payload as { id: string }).id);
      return save(payload);
    }
    case "notes.upsert": {
      const partial = payload as Partial<ServiceNote>;
      const note = partial.id ? replace(data.notes, { ...partial, updatedAt: now } as ServiceNote) : ({
        id: crypto.randomUUID(),
        title: partial.title || "Nota",
        content: partial.content || "",
        serviceId: partial.serviceId || "",
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        width: partial.width ?? 240,
        height: partial.height ?? 150,
        order: partial.order ?? data.notes.length + 1,
        color: partial.color || "amber",
        createdAt: now,
        updatedAt: now
      } satisfies ServiceNote);
      if (!partial.id) data.notes.push(note);
      return save(note);
    }
    case "notes.delete":
      remove(data.notes, (payload as { id: string }).id);
      return save(payload);
    case "ai.parseService":
      return {
        title: "Borrador extraido",
        client: { name: null, whatsapp: null, cuitCuil: null },
        transport: { name: null, whatsapp: null, vehicleModel: null, plate: null },
        contractDate: null,
        startAt: null,
        estimatedEndAt: null,
        route: { origin: null, destination: null, distanceKm: null },
        cargo: { description: (payload as { text: string }).text.slice(0, 120), weightKg: null, packageCount: null },
        pricing: { ars: null, usd: null, commissionPercent: 10, commissionAppliesTo: ["ARS"] },
        clientInstructions: null,
        transportInstructions: null,
        generalNotes: []
      };
    case "cloudinary.uploadBase64":
      return { secureUrl: (payload as { dataUrl: string }).dataUrl, publicId: "demo-image" };
    default:
      throw new MovaApiError("UNKNOWN_ACTION", `Accion no implementada en demo: ${action}`);
  }
}

function readDemoData(): BootstrapData {
  if (typeof window === "undefined") return demoData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    writeDemoData(demoData);
    return structuredClone(demoData);
  }
  return JSON.parse(raw) as BootstrapData;
}

function writeDemoData(data: BootstrapData) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function withDefaults(entity: Partial<Client | Transport>, prefix: string): Client | Transport {
  const now = new Date().toISOString();
  return {
    rating: 3,
    hidden: false,
    ...entity,
    id: entity.id || `${prefix}-${crypto.randomUUID()}`,
    createdAt: entity.createdAt || now,
    updatedAt: now
  } as Client | Transport;
}

function withServiceDefaults(service: Partial<Service>): Service {
  const now = new Date().toISOString();
  return {
    title: service.title || "Nuevo servicio",
    clientId: service.clientId || "",
    transportId: service.transportId || "",
    commissionPercent: service.commissionPercent ?? 10,
    commissionCurrencies: service.commissionCurrencies || ["ARS"],
    clientConfirmation: service.clientConfirmation || "pending",
    transportConfirmation: service.transportConfirmation || "pending",
    resultStatus: service.resultStatus || "open",
    cancellationResponsibility: service.cancellationResponsibility || null,
    chargeTiming: service.chargeTiming || "after_delivery",
    chargeStatus: service.chargeStatus || "pending",
    ...service,
    id: service.id || `service-${crypto.randomUUID()}`,
    createdAt: service.createdAt || now,
    updatedAt: now
  };
}

function replace<T extends { id: string; updatedAt: string }>(items: T[], entity: T): T {
  const index = items.findIndex((item) => item.id === entity.id);
  if (index === -1) throw new MovaApiError("NOT_FOUND", "Registro no encontrado.");
  const updated = { ...items[index], ...entity, updatedAt: new Date().toISOString() };
  items[index] = updated;
  return updated;
}

function mustFind<T extends { id: string }>(items: T[], id: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new MovaApiError("NOT_FOUND", "Registro no encontrado.");
  return found;
}

function remove<T extends { id: string }>(items: T[], id: string) {
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) items.splice(index, 1);
}
