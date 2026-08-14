"use client";

import { appsScriptApi } from "@/lib/appsScriptApi";
import { classifyService } from "@/lib/domain";
import type { BootstrapData, CancellationResponsibility, Client, Payment, Service, ServiceNote, Transport } from "@/types";
import type { CollectionSection } from "@/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

interface DataContextValue {
  data: BootstrapData;
  loading: boolean;
  error: string | null;
  sectionAlerts: Partial<Record<CollectionSection, number>>;
  clearSectionAlert: (section: CollectionSection) => void;
  refresh: () => Promise<void>;
  saveClient: (client: Partial<Client> | Client) => Promise<Client>;
  hideClient: (id: string, hidden: boolean) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  saveTransport: (transport: Partial<Transport> | Transport) => Promise<Transport>;
  hideTransport: (id: string, hidden: boolean) => Promise<void>;
  deleteTransport: (id: string) => Promise<void>;
  saveService: (service: Partial<Service> | Service) => Promise<Service>;
  finalizeService: (id: string, resultStatus: "completed" | "cancelled", cancellationResponsibility?: CancellationResponsibility) => Promise<void>;
  savePayment: (payment: Partial<Payment> | Payment) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
  saveNote: (note: Partial<ServiceNote>) => Promise<ServiceNote>;
  deleteNote: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

const emptyData: BootstrapData = { clients: [], transports: [], services: [], payments: [], notes: [] };
const DATA_CACHE_KEY = "mova-bootstrap-cache-v1";
const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [data, setData] = useState<BootstrapData>(() => readCachedData() || emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionAlerts, setSectionAlerts] = useState<Partial<Record<CollectionSection, number>>>({});

  const updateData = useCallback((updater: BootstrapData | ((current: BootstrapData) => BootstrapData)) => {
    setData((current) => {
      const next = typeof updater === "function" ? (updater as (current: BootstrapData) => BootstrapData)(current) : updater;
      writeCachedData(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      updateData(await appsScriptApi.bootstrap(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [session, updateData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const token = session?.token || "";

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      loading,
      error,
      sectionAlerts,
      clearSectionAlert(section) {
        setSectionAlerts((current) => ({ ...current, [section]: 0 }));
      },
      refresh,
      async saveClient(client) {
        const saved =
          "id" in client && client.id ? await appsScriptApi.updateClient(token, client as Client) : await appsScriptApi.createClient(token, client);
        setData((current) => ({ ...current, clients: upsertById(current.clients, saved) }));
        return saved;
      },
      async hideClient(id, hidden) {
        const saved = await appsScriptApi.hideClient(token, id, hidden);
        setData((current) => ({ ...current, clients: upsertById(current.clients, saved) }));
      },
      async deleteClient(id) {
        await appsScriptApi.deleteClient(token, id);
        setData((current) => ({
          ...current,
          clients: current.services.some((service) => service.clientId === id)
            ? current.clients.map((client) => (client.id === id ? { ...client, hidden: true, updatedAt: new Date().toISOString() } : client))
            : current.clients.filter((client) => client.id !== id)
        }));
      },
      async saveTransport(transport) {
        const saved =
          "id" in transport && transport.id
            ? await appsScriptApi.updateTransport(token, transport as Transport)
            : await appsScriptApi.createTransport(token, transport);
        setData((current) => ({ ...current, transports: upsertById(current.transports, saved) }));
        return saved;
      },
      async hideTransport(id, hidden) {
        const saved = await appsScriptApi.hideTransport(token, id, hidden);
        setData((current) => ({ ...current, transports: upsertById(current.transports, saved) }));
      },
      async deleteTransport(id) {
        await appsScriptApi.deleteTransport(token, id);
        setData((current) => ({
          ...current,
          transports: current.services.some((service) => service.transportId === id)
            ? current.transports.map((transport) => (transport.id === id ? { ...transport, hidden: true, updatedAt: new Date().toISOString() } : transport))
            : current.transports.filter((transport) => transport.id !== id)
        }));
      },
      async saveService(service) {
        const isUpdate = "id" in service && Boolean(service.id);
        if (!isUpdate) {
          const now = new Date().toISOString();
          const optimistic = serviceWithDefaults({ ...service, id: `service-${crypto.randomUUID()}` }, now);
          const section = classifyService(optimistic);
          updateData((current) => ({ ...current, services: upsertById(current.services, optimistic) }));
          setSectionAlerts((current) => ({ ...current, [section]: (current[section] || 0) + 1 }));
          void appsScriptApi
            .createService(token, optimistic)
            .then((saved) => {
              setError(null);
              updateData((current) => ({ ...current, services: upsertById(current.services, saved) }));
            })
            .catch((err) => setError(err instanceof Error ? err.message : "No se pudo sincronizar el servicio."));
          return optimistic;
        }
        const now = new Date().toISOString();
        const currentService = data.services.find((item) => item.id === (service as Service).id);
        const optimistic = serviceWithDefaults({ ...currentService, ...service }, now);
        updateData((current) => ({ ...current, services: upsertById(current.services, optimistic) }));
        void appsScriptApi
          .updateService(token, optimistic)
          .then((saved) => {
            setError(null);
            updateData((current) => ({ ...current, services: upsertById(current.services, saved) }));
          })
          .catch((err) => setError(err instanceof Error ? err.message : "No se pudo sincronizar la edicion del servicio."));
        return optimistic;
      },
      async finalizeService(id, resultStatus, cancellationResponsibility) {
        const saved = await appsScriptApi.finalizeService(token, id, resultStatus, cancellationResponsibility);
        setData((current) => ({ ...current, services: upsertById(current.services, saved) }));
      },
      async savePayment(payment) {
        const saved =
          "id" in payment && payment.id
            ? await appsScriptApi.updatePayment(token, payment as Payment)
            : await appsScriptApi.addPayment(token, payment);
        updateData((current) => ({ ...current, payments: upsertById(current.payments, saved) }));
        return saved;
      },
      async deletePayment(id) {
        await appsScriptApi.deletePayment(token, id);
        updateData((current) => ({ ...current, payments: current.payments.filter((payment) => payment.id !== id) }));
      },
      async saveNote(note) {
        const existing = note.id ? data.notes.find((item) => item.id === note.id) : undefined;
        const outgoing: Partial<ServiceNote> = existing ? { ...existing, ...note } : note;
        const optimistic: ServiceNote | null = existing ? { ...existing, ...note, updatedAt: new Date().toISOString() } : null;
        const previousNotes = existing ? data.notes : null;
        if (optimistic) {
          setData((current) => ({
            ...current,
            notes: upsertById(current.notes, optimistic)
          }));
        }
        try {
          const saved = await appsScriptApi.upsertNote(token, outgoing);
          setData((current) => ({ ...current, notes: upsertById(current.notes, saved) }));
          return saved;
        } catch (err) {
          if (previousNotes) setData((current) => ({ ...current, notes: previousNotes }));
          throw err;
        }
      },
      async deleteNote(id) {
        await appsScriptApi.deleteNote(token, id);
        setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
      },
      async uploadImage(file) {
        const dataUrl = await resizeImageToDataUrl(file);
        const uploaded = await appsScriptApi.uploadImage(token, dataUrl);
        return uploaded.secureUrl;
      }
    }),
    [data, loading, error, refresh, sectionAlerts, token, updateData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((current) => (current.id === item.id ? item : current));
}

function serviceWithDefaults(service: Partial<Service>, now: string): Service {
  return {
    ...service,
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
    id: service.id || `service-${crypto.randomUUID()}`,
    hidden: service.hidden === true,
    createdAt: service.createdAt || now,
    updatedAt: now
  };
}

function readCachedData(): BootstrapData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DATA_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BootstrapData;
  } catch {
    window.localStorage.removeItem(DATA_CACHE_KEY);
    return null;
  }
}

function writeCachedData(data: BootstrapData) {
  if (typeof window !== "undefined") window.localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(data));
}

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo preparar la imagen."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData debe usarse dentro de DataProvider.");
  return context;
}
