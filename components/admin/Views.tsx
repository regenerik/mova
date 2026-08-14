"use client";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { appsScriptApi } from "@/lib/appsScriptApi";
import {
  appStats,
  aiDraftToServiceFields,
  buildClientMessage,
  buildTransportMessage,
  cancellationResponsibilityLabel,
  classifyService,
  clientStats,
  commission,
  formatDate,
  formatMoney,
  isServiceOverdue,
  pendingBalance,
  pricePerKg,
  pricePerKm,
  serviceProgress,
  transportStats,
  whatsappLink
} from "@/lib/domain";
import type { AIServiceDraft, CancellationResponsibility, Client, CollectionSection, Currency, Payment, Service, ServiceNote, Transport } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  EyeOff,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Truck,
  Trash2,
  Undo2
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

const sectionLabels: Record<CollectionSection, string> = {
  active: "Servicios Activos",
  confirmed: "Servicios Confirmados",
  toConfirm: "Servicios a Confirmar",
  completed: "Servicios Finalizados",
  cancelled: "Servicios Cancelados"
};

export function AdminRouteView() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const id = searchParams.get("id") || undefined;
  if (view === "service") return <ServiceDetailView serviceId={id} />;
  if (view === "service-edit") return <ServiceFormView serviceId={id} />;
  if (view === "client") return <EntityDetailView kind="client" entityId={id} />;
  if (view === "transport") return <EntityDetailView kind="transport" entityId={id} />;
  return <ServicesView section="active" />;
}

const noteColors = ["amber", "moss", "rose", "stone"] as const;
const cancellationOptions: Array<{ value: CancellationResponsibility; label: string }> = [
  { value: "client", label: "Cliente" },
  { value: "transport", label: "Transporte" },
  { value: "both", label: "Cliente y transporte" }
];
const phoneCountries = [
  { iso: "AR", name: "Argentina", dial: "549", displayDial: "+54 9", flag: "🇦🇷" },
  { iso: "UY", name: "Uruguay", dial: "598", displayDial: "+598", flag: "🇺🇾" },
  { iso: "CL", name: "Chile", dial: "56", displayDial: "+56", flag: "🇨🇱" },
  { iso: "PY", name: "Paraguay", dial: "595", displayDial: "+595", flag: "🇵🇾" },
  { iso: "BO", name: "Bolivia", dial: "591", displayDial: "+591", flag: "🇧🇴" },
  { iso: "BR", name: "Brasil", dial: "55", displayDial: "+55", flag: "🇧🇷" },
  { iso: "US", name: "Estados Unidos", dial: "1", displayDial: "+1", flag: "🇺🇸" },
  { iso: "ES", name: "España", dial: "34", displayDial: "+34", flag: "🇪🇸" },
  { iso: "MX", name: "Mexico", dial: "52", displayDial: "+52", flag: "🇲🇽" }
] as const;

type PhoneCountry = (typeof phoneCountries)[number];

export function ServicesView({ section }: { section: CollectionSection }) {
  const { data, loading, refresh } = useData();
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const intervalMs = section === "active" ? 5_000 : 30_000;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [section]);

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.services
      .filter((service) => classifyService(service, now) === section)
      .filter((service) => {
        if (!q) return true;
        const client = data.clients.find((item) => item.id === service.clientId);
        const transport = data.transports.find((item) => item.id === service.transportId);
        return [service.title, client?.name, transport?.name, service.origin, service.destination]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => String(a.startAt || a.createdAt).localeCompare(String(b.startAt || b.createdAt)));
  }, [data, now, query, section]);

  return (
    <section>
      <div className="section-title">
        <div>
          <h1>{sectionLabels[section]}</h1>
          <p>{loading ? "Actualizando..." : `${services.length} registros`}</p>
        </div>
        <div className="toolbar">
          <button className="btn icon-btn" type="button" onClick={refresh} disabled={loading} aria-label="Actualizar servicios">
            {loading ? <span className="spinner subtle" aria-hidden="true" /> : <RefreshCw size={18} />}
          </button>
          <Link className="btn primary" href="/admin/servicios/nuevo">
            <Plus size={18} />
            Nuevo servicio
          </Link>
        </div>
      </div>
      <div className="list-tools">
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" />
        </label>
      </div>
      <div className="service-list">
        {services.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            client={data.clients.find((item) => item.id === service.clientId)}
            transport={data.transports.find((item) => item.id === service.transportId)}
            now={now}
          />
        ))}
        {!services.length ? <div className="empty">No hay servicios en esta seccion.</div> : null}
      </div>
    </section>
  );
}

function ServiceRow({ service, client, transport, now }: { service: Service; client?: Client; transport?: Transport; now: Date }) {
  const progress = serviceProgress(service, now);
  return (
    <article className="card service-row">
      <div>
        <div className="row-title">
          <h2>{service.title}</h2>
          {isServiceOverdue(service, now) ? <span className="status-pill warn">Demorado</span> : null}
        </div>
        <p>
          {client?.name || "Cliente sin asignar"} · {transport?.name || "Transporte sin asignar"}
        </p>
        <p>
          {service.origin || "-"} &rarr; {service.destination || "-"}
        </p>
      </div>
      <div className="row-times">
        <span>{formatDate(service.startAt)}</span>
        <span>{formatDate(service.estimatedEndAt)}</span>
      </div>
      <div className="progress-wrap">
        <div className="truck-progress">
          <span style={{ width: `${progress}%` }} />
          <b style={{ left: `${progress}%` }}>
            <Truck size={18} />
          </b>
        </div>
        <small>{progress}%</small>
      </div>
      <Link className="btn icon-btn" href={serviceDetailHref(service.id)} aria-label="Abrir detalle">
        <ChevronRight size={18} />
      </Link>
    </article>
  );
}

export function ClientsView() {
  const { data, saveClient, hideClient, deleteClient } = useData();
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("all");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.clients
      .filter((client) => !q || [client.name, client.whatsapp, client.cuitCuil, client.preferredCargoTypes].some((v) => String(v || "").toLowerCase().includes(q)))
      .filter((client) => rating === "all" || client.rating >= Number(rating))
      .sort((a, b) => (sort === "rating" ? b.rating - a.rating : a.name.localeCompare(b.name)));
  }, [data.clients, query, rating, sort]);

  const visible = clients.filter((client) => !client.hidden);
  const hidden = clients.filter((client) => client.hidden);

  return (
    <section>
      <div className="section-title">
        <div>
          <h1>Clientes</h1>
          <p>{visible.length} activos · {hidden.length} ocultos</p>
        </div>
        <button className="btn primary" type="button" onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>
      <EntityTools query={query} setQuery={setQuery} rating={rating} setRating={setRating} sort={sort} setSort={setSort} />
      <EntityGrid>
        {visible.map((client) => (
          <ClientCard key={client.id} client={client} onEdit={setEditing} onHide={hideClient} onDelete={deleteClient} />
        ))}
      </EntityGrid>
      {hidden.length ? (
        <>
          <h2 className="archive-title">Clientes ocultos</h2>
          <EntityGrid>
            {hidden.map((client) => (
              <ClientCard key={client.id} client={client} onEdit={setEditing} onHide={hideClient} onDelete={deleteClient} />
            ))}
          </EntityGrid>
        </>
      ) : null}
      {creating || editing ? (
        <ClientModal
          client={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={saveClient}
        />
      ) : null}
    </section>
  );
}

function ClientCard({
  client,
  onEdit,
  onHide,
  onDelete
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onHide: (id: string, hidden: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { data } = useData();
  const stats = clientStats(client, data);
  return (
    <article className="card entity-card contact-card">
      <div className="entity-avatar contact-avatar">{client.imageUrl ? <img src={client.imageUrl} alt="" /> : client.name.slice(0, 2).toUpperCase()}</div>
      <div className="contact-card-main">
        <h2>{client.name}</h2>
        <span className="contact-rating"><Star size={14} fill="currentColor" /> {client.rating}/5</span>
      </div>
      <div className="contact-card-body">
        <p>{client.preferredCargoTypes || "Sin tipo de carga"}</p>
        <a className="status-pill ok" href={whatsappLink(client.whatsapp)} target="_blank">
          WhatsApp
        </a>
        <div className="mini-stats">
          <span>{stats.completed} realizados</span>
          <span>{formatAttributedCancellations(stats.cancelled)}</span>
        </div>
      </div>
      <div className="card-actions">
        <Link className="btn" href={entityDetailHref("client", client.id)}>Detalle</Link>
        <button className="btn" type="button" onClick={() => onEdit(client)}>Editar</button>
        <button className="btn" type="button" onClick={() => onHide(client.id, !client.hidden)}>
          {client.hidden ? <Undo2 size={16} /> : <EyeOff size={16} />}
        </button>
        <button className="btn danger" type="button" onClick={() => onDelete(client.id)}><Trash2 size={16} /></button>
      </div>
    </article>
  );
}

export function TransportsView() {
  const { data, saveTransport, hideTransport, deleteTransport } = useData();
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("all");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState<Transport | null>(null);
  const [creating, setCreating] = useState(false);

  const transports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.transports
      .filter((transport) =>
        !q || [transport.name, transport.companyName, transport.whatsapp, transport.vehicleType, transport.plate].some((v) => String(v || "").toLowerCase().includes(q))
      )
      .filter((transport) => rating === "all" || transport.rating >= Number(rating))
      .sort((a, b) => (sort === "rating" ? b.rating - a.rating : a.name.localeCompare(b.name)));
  }, [data.transports, query, rating, sort]);

  const visible = transports.filter((transport) => !transport.hidden);
  const hidden = transports.filter((transport) => transport.hidden);

  return (
    <section>
      <div className="section-title">
        <div>
          <h1>Transportes</h1>
          <p>{visible.length} activos · {hidden.length} ocultos</p>
        </div>
        <button className="btn primary" type="button" onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nuevo transporte
        </button>
      </div>
      <EntityTools query={query} setQuery={setQuery} rating={rating} setRating={setRating} sort={sort} setSort={setSort} />
      <EntityGrid>
        {visible.map((transport) => (
          <TransportCard key={transport.id} transport={transport} onEdit={setEditing} onHide={hideTransport} onDelete={deleteTransport} />
        ))}
      </EntityGrid>
      {hidden.length ? (
        <>
          <h2 className="archive-title">Transportes ocultos</h2>
          <EntityGrid>
            {hidden.map((transport) => (
              <TransportCard key={transport.id} transport={transport} onEdit={setEditing} onHide={hideTransport} onDelete={deleteTransport} />
            ))}
          </EntityGrid>
        </>
      ) : null}
      {creating || editing ? (
        <TransportModal
          transport={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={saveTransport}
        />
      ) : null}
    </section>
  );
}

function TransportCard({
  transport,
  onEdit,
  onHide,
  onDelete
}: {
  transport: Transport;
  onEdit: (transport: Transport) => void;
  onHide: (id: string, hidden: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { data } = useData();
  const stats = transportStats(transport, data);
  return (
    <article className="card entity-card contact-card">
      <div className="entity-avatar contact-avatar">{transport.imageUrl ? <img src={transport.imageUrl} alt="" /> : transport.name.slice(0, 2).toUpperCase()}</div>
      <div className="contact-card-main">
        <h2>{transport.name}</h2>
        <span className="contact-rating"><Star size={14} fill="currentColor" /> {transport.rating}/5</span>
      </div>
      <div className="contact-card-body">
      <p>{[transport.vehicleType, transport.vehicleModel, transport.plate].filter(Boolean).join(" · ") || "Sin vehiculo"}</p>
      <a className="status-pill ok" href={whatsappLink(transport.whatsapp)} target="_blank">
        WhatsApp
      </a>
      <div className="mini-stats">
        <span>{stats.completed} realizados</span>
        <span>{formatAttributedCancellations(stats.cancelled)}</span>
      </div>
      </div>
      <div className="card-actions">
        <Link className="btn" href={entityDetailHref("transport", transport.id)}>Detalle</Link>
        <button className="btn" type="button" onClick={() => onEdit(transport)}>Editar</button>
        <button className="btn" type="button" onClick={() => onHide(transport.id, !transport.hidden)}>
          {transport.hidden ? <Undo2 size={16} /> : <EyeOff size={16} />}
        </button>
        <button className="btn danger" type="button" onClick={() => onDelete(transport.id)}><Trash2 size={16} /></button>
      </div>
    </article>
  );
}

export function ServiceFormView({ serviceId }: { serviceId?: string } = {}) {
  const { data, saveService, saveClient, saveTransport } = useData();
  const router = useRouter();
  const editing = serviceId ? data.services.find((service) => service.id === serviceId) : undefined;
  const [clientModal, setClientModal] = useState(false);
  const [transportModal, setTransportModal] = useState(false);
  const [form, setForm] = useState<Partial<Service>>({ commissionPercent: 10, commissionCurrencies: ["ARS"], clientConfirmation: "pending", transportConfirmation: "pending", resultStatus: "open", chargeTiming: "after_delivery", chargeStatus: "pending" });
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdService, setCreatedService] = useState<Service | null>(null);

  useEffect(() => {
    if (editing) setForm(editing);
    if (!editing) {
      const raw = window.localStorage.getItem("mova-ai-draft-v1");
      if (raw) {
        const draft = JSON.parse(raw) as AIServiceDraft;
        setForm((current) => ({ ...current, ...aiDraftToServiceFields(draft) }));
        window.localStorage.removeItem("mova-ai-draft-v1");
      }
    }
    setSavedPulse(false);
  }, [editing?.id]);

  useEffect(() => {
    if (!savedPulse) return;
    const timer = window.setTimeout(() => setSavedPulse(false), 3000);
    return () => window.clearTimeout(timer);
  }, [savedPulse]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveService(form);
      if (editing) {
        setForm(saved);
        setSavedPulse(true);
      }
      else setCreatedService(saved);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  if (createdService) {
    const createdSection = classifyService(createdService);
    const hrefBySection: Record<CollectionSection, string> = {
      active: "/admin",
      confirmed: "/admin/servicios/confirmados",
      toConfirm: "/admin/servicios/a-confirmar",
      completed: "/admin/servicios/finalizados",
      cancelled: "/admin/servicios/cancelados"
    };
    return (
      <section className="success-screen">
        <div className="card success-card">
          <span className="success-icon"><Check size={24} /></span>
          <h1>Servicio generado con exito</h1>
          <p>{createdService.title}</p>
          <div className="confirm-actions">
            <Link className="btn primary" href={hrefBySection[createdSection]}>
              Ver {sectionLabels[createdSection].toLowerCase()}
            </Link>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setForm({ commissionPercent: 10, commissionCurrencies: ["ARS"], clientConfirmation: "pending", transportConfirmation: "pending", resultStatus: "open", chargeTiming: "after_delivery", chargeStatus: "pending" });
                setCreatedService(null);
              }}
            >
              Cargar otro servicio
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="section-title">
        <div className="service-form-heading">
          <button className="btn icon-btn header-back-btn" type="button" onClick={() => router.back()} aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <button className={`btn icon-btn header-save-btn ${savedPulse ? "saved" : ""}`} type="submit" form="service-form" disabled={saving} aria-label="Guardar servicio">
            {saving ? <span className="spinner subtle" aria-hidden="true" /> : savedPulse ? <Check size={20} /> : <Save size={19} />}
          </button>
          <div>
            <h1>{editing ? "Editar servicio" : "Nuevo servicio"}</h1>
            <p>{editing ? editing.id : "Borrador manual"}</p>
          </div>
        </div>
        <div className="service-status-bar">
          <Field label="Cliente confirma"><StatusSelect value={form.clientConfirmation || "pending"} onChange={(value) => setForm({ ...form, clientConfirmation: value })} /></Field>
          <Field label="Transporte confirma"><StatusSelect value={form.transportConfirmation || "pending"} onChange={(value) => setForm({ ...form, transportConfirmation: value })} /></Field>
        </div>
      </div>
      <form className="card form-card" id="service-form" onSubmit={onSubmit}>
        <div className="grid two">
          <Field label="Titulo"><input className="input" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Fecha de contratacion"><input className="input" type="date" value={dateInput(form.contractDate)} onChange={(e) => setForm({ ...form, contractDate: isoDate(e.target.value) })} /></Field>
          <Field label="Cliente">
            <div className="inline-field">
              <select className="select" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                <option value="">Seleccionar</option>
                {data.clients.filter((client) => !client.hidden).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              <button className="btn" type="button" onClick={() => setClientModal(true)}><Plus size={16} /></button>
            </div>
          </Field>
          <Field label="Transporte">
            <div className="inline-field">
              <select className="select" value={form.transportId || ""} onChange={(e) => setForm({ ...form, transportId: e.target.value })} required>
                <option value="">Seleccionar</option>
                {data.transports.filter((transport) => !transport.hidden).map((transport) => <option key={transport.id} value={transport.id}>{transport.name}</option>)}
              </select>
              <button className="btn" type="button" onClick={() => setTransportModal(true)}><Plus size={16} /></button>
            </div>
          </Field>
          <DateTimeField label="Inicio" value={form.startAt} onChange={(value) => setForm({ ...form, startAt: value })} />
          <DateTimeField label="Finalizacion estimada" value={form.estimatedEndAt} onChange={(value) => setForm({ ...form, estimatedEndAt: value })} />
          <Field label="Origen"><input className="input" value={form.origin || ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field>
          <Field label="Destino"><input className="input" value={form.destination || ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
          <Field label="Aclaraciones origen"><input className="input" value={form.originNotes || ""} onChange={(e) => setForm({ ...form, originNotes: e.target.value })} /></Field>
          <Field label="Aclaraciones destino"><input className="input" value={form.destinationNotes || ""} onChange={(e) => setForm({ ...form, destinationNotes: e.target.value })} /></Field>
          <Field label="Kilometros"><input className="input" type="number" min="0" value={form.distanceKm ?? ""} onChange={(e) => setForm({ ...form, distanceKm: toNum(e.target.value) })} /></Field>
          <Field label="Peso kg"><input className="input" type="number" min="0" value={form.weightKg ?? ""} onChange={(e) => setForm({ ...form, weightKg: toNum(e.target.value) })} /></Field>
          <Field label="Paquetes"><input className="input" type="number" min="0" value={form.packageCount ?? ""} onChange={(e) => setForm({ ...form, packageCount: toNum(e.target.value) })} /></Field>
          <Field label="Carga"><input className="input" value={form.cargoDescription || ""} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} /></Field>
          <Field label="Importe ARS"><input className="input" type="number" min="0" value={form.finalPriceArs ?? ""} onChange={(e) => setForm({ ...form, finalPriceArs: toNum(e.target.value) })} /></Field>
          <Field label="Importe USD"><input className="input" type="number" min="0" value={form.finalPriceUsd ?? ""} onChange={(e) => setForm({ ...form, finalPriceUsd: toNum(e.target.value) })} /></Field>
          <Field label="Comision %"><input className="input" type="number" min="0" value={form.commissionPercent ?? 10} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} /></Field>
          <Field label="Monedas comision">
            <div className="checks">
              {(["ARS", "USD"] as Currency[]).map((currency) => (
                <label key={currency}><input type="checkbox" checked={(form.commissionCurrencies || []).includes(currency)} onChange={(e) => setForm({ ...form, commissionCurrencies: toggleCurrency(form.commissionCurrencies || [], currency, e.target.checked) })} /> {currency}</label>
              ))}
            </div>
          </Field>
          <Field label="Cobro"><ChargeTimingSelect value={form.chargeTiming || "after_delivery"} onChange={(value) => setForm({ ...form, chargeTiming: value })} /></Field>
          <Field label="Estado cobro"><select className="select" value={form.chargeStatus || "pending"} onChange={(e) => setForm({ ...form, chargeStatus: e.target.value as Service["chargeStatus"] })}><option value="pending">A confirmar</option><option value="received">Recibido</option><option value="partial">Pago parcial</option></select></Field>
        </div>
        <Field label="Condicion personalizada de cobro"><input className="input" value={form.customChargeNote || ""} onChange={(e) => setForm({ ...form, customChargeNote: e.target.value })} /></Field>
        <Field label="Instrucciones para cliente"><textarea className="textarea" value={form.clientInstructions || ""} onChange={(e) => setForm({ ...form, clientInstructions: e.target.value })} /></Field>
        <Field label="Instrucciones para transporte"><textarea className="textarea" value={form.transportInstructions || ""} onChange={(e) => setForm({ ...form, transportInstructions: e.target.value })} /></Field>
        <Field label="Notas internas"><textarea className="textarea" value={form.internalNotes || ""} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} /></Field>
        {saveError ? <p className="form-error">{saveError}</p> : null}
        <div className="form-actions">
          <button className="btn save" type="submit" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={18} />}
            {saving ? "Guardando..." : "Guardar servicio"}
          </button>
        </div>
      </form>
      {clientModal ? <ClientModal onClose={() => setClientModal(false)} onSave={async (client) => { const saved = await saveClient(client); setForm({ ...form, clientId: saved.id }); setClientModal(false); return saved; }} /> : null}
      {transportModal ? <TransportModal onClose={() => setTransportModal(false)} onSave={async (transport) => { const saved = await saveTransport(transport); setForm({ ...form, transportId: saved.id }); setTransportModal(false); return saved; }} /> : null}
    </section>
  );
}

export function ServiceDetailView({ serviceId }: { serviceId?: string } = {}) {
  const router = useRouter();
  const { data, finalizeService, savePayment, deletePayment, saveNote, deleteNote } = useData();
  const service = data.services.find((item) => item.id === serviceId);
  const client = service ? data.clients.find((item) => item.id === service.clientId) : undefined;
  const transport = service ? data.transports.find((item) => item.id === service.transportId) : undefined;
  const payments = service ? data.payments.filter((payment) => payment.serviceId === service.id) : [];
  const notes = service ? data.notes.filter((note) => note.serviceId === service.id).sort((a, b) => a.order - b.order) : [];
  const [payment, setPayment] = useState<Partial<Payment>>({ currency: "ARS", paidAt: new Date().toISOString().slice(0, 10) });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [finish, setFinish] = useState<"completed" | "cancelled" | null>(null);

  if (!service) return <div className="empty">Servicio no encontrado.</div>;

  const balance = pendingBalance(service, payments);

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentSaving(true);
    setPaymentError(null);
    try {
      await savePayment({ ...payment, serviceId: service!.id, paidAt: isoDate(String(payment.paidAt)) });
      setPayment({ currency: "ARS", paidAt: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "No se pudo sumar el pago.");
    } finally {
      setPaymentSaving(false);
    }
  }

  const clientMessageHref = client?.whatsapp ? whatsappLink(client.whatsapp, buildClientMessage(service, client, transport)) : null;
  const transportMessageHref = transport?.whatsapp ? whatsappLink(transport.whatsapp, buildTransportMessage(service, client)) : null;

  return (
    <section>
      <div className="section-title">
        <div className="detail-title">
          <div className="detail-title-actions">
            <button className="btn icon-btn" type="button" onClick={() => router.back()} aria-label="Volver">
              <ArrowLeft size={18} />
            </button>
          </div>
          <div>
            <h1>{service.title}</h1>
          <p>{client?.name || "-"} · {transport?.name || "-"}</p>
        </div>
        </div>
        <div className="toolbar">
          <Link className="btn" href={serviceEditHref(service.id)}>Editar</Link>
          {service.resultStatus === "open" ? <button className="btn primary" type="button" onClick={() => setFinish("completed")}><Check size={18} /> Finalizar Servicio</button> : null}
          {service.resultStatus === "open" ? <button className="btn danger" type="button" onClick={() => setFinish("cancelled")}>
            <Trash2 size={18} />
            Cancelar Servicio
          </button> : null}
        </div>
      </div>
      <div className="grid three">
        <Metric label="ARS" value={formatMoney(service.finalPriceArs, "ARS")} />
        <Metric label="USD" value={formatMoney(service.finalPriceUsd, "USD")} />
        <Metric label="Progreso" value={`${serviceProgress(service)}%`} />
      </div>
      <div className="grid two detail-grid">
        <InfoCard title="Operacion e instrucciones" rows={[
          ["Contratacion", formatDate(service.contractDate)],
          ["Inicio", formatDate(service.startAt)],
          ["Final estimado", formatDate(service.estimatedEndAt)],
          ...(service.resultStatus === "cancelled" ? [["Responsable cancelacion", cancellationResponsibilityLabel(service.cancellationResponsibility)] as [string, React.ReactNode]] : []),
          ["Recorrido", `${service.origin || "-"} -> ${service.destination || "-"}`],
          ["Kilometros", service.distanceKm ?? "-"],
          ["Carga", service.cargoDescription || "-"],
          ["Peso", service.weightKg ? `${service.weightKg} kg` : "-"],
          ["Paquetes", service.packageCount ?? "-"],
          ["Precio acordado", priceAgreementSummary(service)],
          ["Para cliente", <span className="instruction-copy">{service.clientInstructions || "-"}</span>],
          ["Para transporte", <span className="instruction-copy">{service.transportInstructions || "-"}</span>]
        ]} actions={
          <div className="operation-actions">
            {clientMessageHref ? (
              <a className="btn" href={clientMessageHref} target="_blank">
                <MessageCircle size={17} />
                Enviar datos al cliente
              </a>
            ) : (
              <button className="btn" type="button" disabled>
                <MessageCircle size={17} />
                Sin WhatsApp cliente
              </button>
            )}
            {transportMessageHref ? (
              <a className="btn" href={transportMessageHref} target="_blank">
                <MessageCircle size={17} />
                Enviar datos al transporte
              </a>
            ) : (
              <button className="btn" type="button" disabled>
                <MessageCircle size={17} />
                Sin WhatsApp transporte
              </button>
            )}
          </div>
        } />
        <InfoCard title="Comercial" rows={[
          ["Precio/km ARS", formatMoney(pricePerKm(service, "ARS"), "ARS")],
          ["Precio/km USD", formatMoney(pricePerKm(service, "USD"), "USD")],
          ["Precio/kg ARS", formatMoney(pricePerKg(service, "ARS"), "ARS")],
          ["Precio/kg USD", formatMoney(pricePerKg(service, "USD"), "USD")],
          ["Comision", `${service.commissionPercent}% (${service.commissionCurrencies.join(", ")})`],
          ["Ganancia ARS", formatMoney(commission(service, "ARS"), "ARS")],
          ["Ganancia USD", formatMoney(commission(service, "USD"), "USD")],
          ["Saldo ARS", formatMoney(balance.ARS, "ARS")],
          ["Saldo USD", formatMoney(balance.USD, "USD")]
        ]} />
      </div>
      <div className="grid">
        <div className="card panel-block">
          <h2>Cobros</h2>
          <form className="payment-form" onSubmit={addPayment}>
            <label className="money-input">
              <span>{paymentCurrencySymbol(payment.currency || "ARS")}</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Importe"
                value={formatAmountInput(payment.amount)}
                onChange={(e) => setPayment({ ...payment, amount: parseAmountInput(e.target.value) })}
                required
                disabled={paymentSaving}
              />
            </label>
            <select className="select" value={payment.currency} onChange={(e) => setPayment({ ...payment, currency: e.target.value as Currency })} disabled={paymentSaving}><option value="ARS">ARS</option><option value="USD">USD</option></select>
            <input className="input" type="date" value={String(payment.paidAt).slice(0, 10)} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} required disabled={paymentSaving} />
            <input className="input" placeholder="Nota" value={payment.note || ""} onChange={(e) => setPayment({ ...payment, note: e.target.value })} disabled={paymentSaving} />
            <button className="btn primary icon-btn" type="submit" disabled={paymentSaving} aria-label="Sumar pago">
              {paymentSaving ? <span className="spinner" aria-hidden="true" /> : <Plus size={16} />}
            </button>
          </form>
          {paymentError ? <p className="form-error">{paymentError}</p> : null}
          <div className="payment-list">
            {payments.map((item) => (
              <div key={item.id}>
                <span>{formatMoney(item.amount, item.currency)} · {formatDate(item.paidAt)}</span>
                <button className="btn danger icon-btn" type="button" onClick={() => deletePayment(item.id)}><Trash2 size={16} /></button>
                {item.note ? <small className="payment-note">{item.note}</small> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <NotesBoard notes={notes} serviceId={service.id} onSave={saveNote} onDelete={deleteNote} />
      {finish ? (
        <ServiceResultModal
          resultStatus={finish}
          onCancel={() => setFinish(null)}
          onConfirm={async (cancellationResponsibility) => {
            await finalizeService(service.id, finish, cancellationResponsibility);
            setFinish(null);
            router.push(finish === "completed" ? "/admin/servicios/finalizados" : "/admin/servicios/cancelados");
          }}
        />
      ) : null}
    </section>
  );
}

export function EntityDetailView({ kind, entityId }: { kind: "client" | "transport"; entityId?: string }) {
  const router = useRouter();
  const { data, saveClient, saveTransport } = useData();
  const [editing, setEditing] = useState(false);
  const client = kind === "client" ? data.clients.find((item) => item.id === entityId) : undefined;
  const transport = kind === "transport" ? data.transports.find((item) => item.id === entityId) : undefined;
  const entity = client || transport;
  if (!entity) return <div className="empty">Registro no encontrado.</div>;
  const services = data.services.filter((service) => (kind === "client" ? service.clientId === entity.id : service.transportId === entity.id));
  return (
    <section>
      <div className="section-title">
        <div className="detail-title">
          <div className="detail-title-actions">
            <button className="btn icon-btn" type="button" onClick={() => router.back()} aria-label="Volver">
              <ArrowLeft size={18} />
            </button>
            <button className="btn icon-btn" type="button" onClick={() => setEditing(true)} aria-label="Editar">
              <Pencil size={18} />
            </button>
          </div>
          <div>
            <h1>{entity.name}</h1>
            <p>{kind === "client" ? "Cliente" : "Transporte"}</p>
          </div>
        </div>
      </div>
      <InfoCard title="Datos" rows={Object.entries(entity).filter(([key]) => !["hidden"].includes(key)).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value ?? "-")])} />
      <h2 className="archive-title">Historial de servicios</h2>
      <div className="service-list">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} client={data.clients.find((item) => item.id === service.clientId)} transport={data.transports.find((item) => item.id === service.transportId)} now={new Date()} />
        ))}
      </div>
      {editing && client ? <ClientModal client={client} onClose={() => setEditing(false)} onSave={saveClient} /> : null}
      {editing && transport ? <TransportModal transport={transport} onClose={() => setEditing(false)} onSave={saveTransport} /> : null}
    </section>
  );
}

export function AIView() {
  const { session } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const draft = await appsScriptApi.parseAIService(session.token, text);
      window.localStorage.setItem("mova-ai-draft-v1", JSON.stringify(draft));
      router.push("/admin/servicios/nuevo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar el texto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="section-title">
        <div>
          <h1>Carga de Servicio IA</h1>
          <p>Groq corre exclusivamente desde Apps Script.</p>
        </div>
      </div>
      <form className="card ai-card" onSubmit={onSubmit}>
        <Bot size={28} />
        <textarea className="textarea ai-textarea" value={text} onChange={(e) => setText(e.target.value)} required />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={loading || !text.trim()}>
          {loading ? <span className="spinner" aria-hidden="true" /> : null}
          {loading ? "Procesando con IA..." : "Procesar borrador"}
          <ArrowRight size={18} />
        </button>
        {loading ? (
          <div className="ai-loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Analizando texto, validando JSON y preparando el formulario...
          </div>
        ) : null}
      </form>
    </section>
  );
}

export function StatsView() {
  const { data } = useData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const stats = appStats(data, from || undefined, to ? `${to}T23:59:59` : undefined);
  return (
    <section>
      <div className="section-title">
        <div>
          <h1>Estadisticas</h1>
          <p>{stats.services.length} servicios en el periodo</p>
        </div>
      </div>
      <div className="list-tools">
        <label className="field"><span>Desde</span><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>Hasta</span><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <h2 className="stats-section-title">Economia MOVA</h2>
      <div className="grid three stats-grid">
        <Metric label="Comision generada ARS" value={formatMoney(stats.commissionGeneratedArs, "ARS")} />
        <Metric label="Comision generada USD" value={formatMoney(stats.commissionGeneratedUsd, "USD")} />
        <Metric label="Servicios con cobro pendiente" value={String(stats.paymentsPending)} />
        <Metric label="Comision cobrada ARS" value={formatMoney(stats.collectedArs, "ARS")} />
        <Metric label="Comision cobrada USD" value={formatMoney(stats.collectedUsd, "USD")} />
        <Metric label="Comision pendiente ARS" value={formatMoney(stats.pendingArs, "ARS")} />
        <Metric label="Comision pendiente USD" value={formatMoney(stats.pendingUsd, "USD")} />
      </div>
      <h2 className="stats-section-title">Operacion cliente-transporte</h2>
      <div className="grid three stats-grid">
        <Metric label="Total cliente-transporte ARS" value={formatMoney(stats.operationTotalArs, "ARS")} />
        <Metric label="Total cliente-transporte USD" value={formatMoney(stats.operationTotalUsd, "USD")} />
        <Metric label="Cancelacion global" value={`${stats.cancellationRate.toFixed(1)}%`} />
        <Metric label="Kilometros gestionados" value={stats.managedKm.toFixed(0)} />
        <Metric label="Kilos transportados" value={stats.transportedKg.toFixed(0)} />
        <Metric label="Ticket promedio ARS" value={formatMoney(stats.averageTicketArs, "ARS")} />
        <Metric label="Ticket promedio USD" value={formatMoney(stats.averageTicketUsd, "USD")} />
      </div>
      <div className="card panel-block state-bars">
        {Object.entries(stats.counts).map(([key, count]) => (
          <div key={key}>
            <span>{sectionLabels[key as CollectionSection]}</span>
            <b style={{ width: `${Math.max(3, (count / Math.max(1, stats.services.length)) * 100)}%` }} />
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhoneInput({ value, onChange, required }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const parsed = splitPhoneValue(value);

  function updateCountry(iso: string) {
    const country = phoneCountries.find((item) => item.iso === iso) || phoneCountries[0];
    onChange(composePhoneValue(country, parsed.national));
  }

  function updateNational(national: string) {
    onChange(composePhoneValue(parsed.country, national));
  }

  return (
    <div className="phone-input">
      <select
        aria-label="Codigo de pais"
        className="select phone-country"
        onChange={(event) => updateCountry(event.target.value)}
        value={parsed.country.iso}
      >
        {phoneCountries.map((country) => (
          <option key={country.iso} value={country.iso}>
            {country.flag} {country.displayDial}
          </option>
        ))}
      </select>
      <input
        className="input phone-number"
        inputMode="tel"
        onChange={(event) => updateNational(event.target.value)}
        placeholder="11 4565-7898"
        required={required}
        value={parsed.national}
      />
    </div>
  );
}

function splitPhoneValue(value: string): { country: PhoneCountry; national: string } {
  const digits = String(value || "").replace(/\D/g, "");
  const argentina = phoneCountries[0];
  if (!digits) return { country: argentina, national: "" };
  if (digits.startsWith("54") && !digits.startsWith("549") && digits.length === 12) {
    return { country: argentina, national: digits.slice(2) };
  }
  const country = [...phoneCountries].sort((a, b) => b.dial.length - a.dial.length).find((item) => digits.startsWith(item.dial));
  if (country) return { country, national: digits.slice(country.dial.length) };
  if (digits.length <= 10) return { country: argentina, national: digits };
  return { country: argentina, national: digits };
}

function composePhoneValue(country: PhoneCountry, national: string): string {
  const digits = String(national || "").replace(/\D/g, "");
  return digits ? `+${country.dial}${digits}` : "";
}

function ClientModal({ client, onClose, onSave }: { client?: Client | null; onClose: () => void; onSave: (client: Partial<Client> | Client) => Promise<Client> }) {
  const { uploadImage } = useData();
  const [form, setForm] = useState<Partial<Client>>(client || { rating: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form as Client);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={client ? "Editar cliente" : "Nuevo cliente"} onClose={onClose}>
      <form className="grid two" onSubmit={submit}>
        <Field label="Nombre"><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="WhatsApp"><PhoneInput value={form.whatsapp || ""} onChange={(whatsapp) => setForm({ ...form, whatsapp })} required /></Field>
        <Field label="Email"><input className="input" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Telefono fijo"><input className="input" value={form.landline || ""} onChange={(e) => setForm({ ...form, landline: e.target.value })} /></Field>
        <Field label="CUIT/CUIL"><input className="input" value={form.cuitCuil || ""} onChange={(e) => setForm({ ...form, cuitCuil: e.target.value })} /></Field>
        <Field label="Tipos de carga"><input className="input" value={form.preferredCargoTypes || ""} onChange={(e) => setForm({ ...form, preferredCargoTypes: e.target.value })} /></Field>
        <Field label="Condiciones de pago"><input className="input" value={form.paymentTerms || ""} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Field>
        <Field label="Rating"><input className="input" type="number" min="1" max="5" value={form.rating ?? 3} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></Field>
        <ImageUpload value={form.imageUrl || ""} onChange={(imageUrl) => setForm({ ...form, imageUrl })} onUpload={uploadImage} />
        <Field label="Notas"><textarea className="textarea" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error ? <p className="form-error form-wide">{error}</p> : null}
        <div className="form-actions">
          <button className="btn save" type="submit" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={18} />}
            {saving ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransportModal({ transport, onClose, onSave }: { transport?: Transport | null; onClose: () => void; onSave: (transport: Partial<Transport> | Transport) => Promise<Transport> }) {
  const { uploadImage } = useData();
  const [form, setForm] = useState<Partial<Transport>>(transport || { rating: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form as Transport);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el transporte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={transport ? "Editar transporte" : "Nuevo transporte"} onClose={onClose}>
      <form className="grid two" onSubmit={submit}>
        <Field label="Nombre"><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="WhatsApp"><PhoneInput value={form.whatsapp || ""} onChange={(whatsapp) => setForm({ ...form, whatsapp })} required /></Field>
        <Field label="Telefono alternativo"><PhoneInput value={form.alternatePhone || ""} onChange={(alternatePhone) => setForm({ ...form, alternatePhone })} /></Field>
        <Field label="Email"><input className="input" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Empresa"><input className="input" value={form.companyName || ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
        <Field label="CUIT/CUIL"><input className="input" value={form.cuitCuil || ""} onChange={(e) => setForm({ ...form, cuitCuil: e.target.value })} /></Field>
        <Field label="Tipo vehiculo"><input className="input" value={form.vehicleType || ""} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} /></Field>
        <Field label="Marca/modelo"><input className="input" value={form.vehicleModel || ""} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} /></Field>
        <Field label="Patente"><input className="input" value={form.plate || ""} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
        <Field label="Patente acoplado"><input className="input" value={form.trailerPlate || ""} onChange={(e) => setForm({ ...form, trailerPlate: e.target.value })} /></Field>
        <Field label="Capacidad kg"><input className="input" type="number" min="0" value={form.maxWeightKg ?? ""} onChange={(e) => setForm({ ...form, maxWeightKg: toNum(e.target.value) })} /></Field>
        <Field label="Notas de capacidad"><input className="input" value={form.capacityNotes || ""} onChange={(e) => setForm({ ...form, capacityNotes: e.target.value })} /></Field>
        <Field label="Rutas habituales"><input className="input" value={form.usualRoutes || ""} onChange={(e) => setForm({ ...form, usualRoutes: e.target.value })} /></Field>
        <Field label="Tipos de carga"><input className="input" value={form.acceptedCargoTypes || ""} onChange={(e) => setForm({ ...form, acceptedCargoTypes: e.target.value })} /></Field>
        <Field label="Condiciones de pago"><input className="input" value={form.paymentTerms || ""} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Field>
        <Field label="Rating"><input className="input" type="number" min="1" max="5" value={form.rating ?? 3} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></Field>
        <ImageUpload value={form.imageUrl || ""} onChange={(imageUrl) => setForm({ ...form, imageUrl })} onUpload={uploadImage} />
        <Field label="Notas"><textarea className="textarea" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error ? <p className="form-error form-wide">{error}</p> : null}
        <div className="form-actions">
          <button className="btn save" type="submit" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={18} />}
            {saving ? "Guardando..." : "Guardar transporte"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImageUpload({
  value,
  onChange,
  onUpload
}: {
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await onUpload(file);
      onChange(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="field image-field">
      <span>Imagen</span>
      <label
        className={`image-drop ${uploading ? "loading" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <input type="file" accept="image/*" onChange={(event) => void handleFiles(event.target.files)} disabled={uploading} />
        {value ? <img src={value} alt="" /> : <ImagePlus size={28} />}
        <strong>{uploading ? "Subiendo a Cloudinary..." : "Click para buscar o arrastre aqui"}</strong>
        <small>{value ? "La URL publica ya quedo asociada al registro." : "JPG/PNG, se comprime antes de enviar."}</small>
      </label>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="URL publica de imagen" />
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

function NotesBoard({ notes, serviceId, onSave, onDelete }: { notes: ServiceNote[]; serviceId: string; onSave: (note: Partial<ServiceNote>) => Promise<ServiceNote>; onDelete: (id: string) => Promise<void> }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<Partial<ServiceNote>>({ title: "", content: "", color: "amber" });
  const [saving, setSaving] = useState(false);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceNote | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [drag, setDrag] = useState<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    setPositions((current) => {
      const next = { ...current };
      for (const [index, note] of notes.entries()) {
        if (!next[note.id]) {
          next[note.id] = {
            x: note.x ?? 16 + (index % 5) * 30,
            y: note.y ?? 16 + (index % 4) * 24
          };
        }
      }
      return next;
    });
  }, [notes]);

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        serviceId,
        x: 16 + (notes.length % 5) * 30,
        y: 16 + (notes.length % 4) * 24,
        width: 250,
        height: 160,
        order: maxNoteOrder(notes) + 1,
        color: draft.color || "amber"
      });
      setDraft({ title: "", content: "", color: draft.color || "amber" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  async function runNoteAction(noteId: string, action: () => Promise<void>) {
    setBusyNoteId(noteId);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la nota.");
    } finally {
      setBusyNoteId(null);
    }
  }

  function startDrag(event: PointerEvent<HTMLElement>, note: ServiceNote) {
    if (busyNoteId === note.id) return;
    const boardRect = boardRef.current?.getBoundingClientRect();
    const current = positions[note.id] || { x: note.x || 0, y: note.y || 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: note.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - (boardRect?.left || 0) - current.x,
      offsetY: event.clientY - (boardRect?.top || 0) - current.y
    });
  }

  function moveDrag(event: PointerEvent<HTMLElement>, note: ServiceNote) {
    if (!drag || drag.id !== note.id || drag.pointerId !== event.pointerId) return;
    const board = boardRef.current;
    const boardRect = board?.getBoundingClientRect();
    const noteWidth = note.width || 250;
    const noteHeight = note.height || 160;
    const rawX = event.clientX - (boardRect?.left || 0) - drag.offsetX;
    const rawY = event.clientY - (boardRect?.top || 0) - drag.offsetY;
    const maxX = Math.max(0, (boardRect?.width || 900) - noteWidth);
    const maxY = Math.max(0, (boardRect?.height || 360) - noteHeight);
    setPositions((current) => ({
      ...current,
      [note.id]: {
        x: clampLocal(rawX, 0, maxX),
        y: clampLocal(rawY, 0, maxY)
      }
    }));
  }

  function endDrag(event: PointerEvent<HTMLElement>, note: ServiceNote) {
    if (!drag || drag.id !== note.id || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const boardRect = boardRef.current?.getBoundingClientRect();
    const noteWidth = note.width || 250;
    const noteHeight = note.height || 160;
    const maxX = Math.max(0, (boardRect?.width || 900) - noteWidth);
    const maxY = Math.max(0, (boardRect?.height || 360) - noteHeight);
    const position = {
      x: clampLocal(event.clientX - (boardRect?.left || 0) - drag.offsetX, 0, maxX),
      y: clampLocal(event.clientY - (boardRect?.top || 0) - drag.offsetY, 0, maxY)
    };
    setPositions((current) => ({ ...current, [note.id]: position }));
    setDrag(null);
    void runNoteAction(note.id, async () => {
      await onSave({ id: note.id, x: Math.round(position.x), y: Math.round(position.y), order: maxNoteOrder(notes) + 1 });
    });
  }

  function persistSize(note: ServiceNote, element: HTMLDivElement) {
    if (drag?.id === note.id) return;
    const width = Math.round(element.offsetWidth);
    const height = Math.round(element.offsetHeight);
    const currentWidth = note.width || 250;
    const currentHeight = note.height || 160;
    if (Math.abs(width - currentWidth) < 2 && Math.abs(height - currentHeight) < 2) return;
    void runNoteAction(note.id, async () => {
      await onSave({ id: note.id, width, height });
    });
  }

  async function saveEditedNote(note: ServiceNote) {
    await runNoteAction(note.id, async () => {
      await onSave(note);
    });
    setEditing(null);
  }

  return (
    <div className="card panel-block notes-block">
      <h2>Notas importantes</h2>
      <form className="note-form" onSubmit={createNote} aria-busy={saving}>
        <input className="input" placeholder="Titulo" value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required disabled={saving} />
        <textarea className="textarea" placeholder="Contenido" value={draft.content || ""} onChange={(e) => setDraft({ ...draft, content: e.target.value })} required disabled={saving} />
        <ColorPicker value={draft.color || "amber"} onChange={(color) => setDraft({ ...draft, color })} disabled={saving} />
        <button className="btn save" type="submit" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : <Plus size={16} />}
          {saving ? "Guardando nota..." : "Agregar nota"}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="notes-canvas" ref={boardRef}>
        {notes.map((note, index) => {
          const position = positions[note.id] || { x: note.x || 0, y: note.y || 0 };
          return (
          <div
            className="sticky-note"
            data-color={note.color || "amber"}
            key={note.id}
            onMouseUp={(event) => {
              if (event.target !== event.currentTarget && (event.target as HTMLElement).closest("button, .sticky-actions")) return;
              persistSize(note, event.currentTarget);
            }}
            style={{
              left: position.x,
              top: position.y,
              width: note.width || 250,
              minHeight: note.height || 160,
              zIndex: note.order || index + 1
            }}
          >
            <button
              className="sticky-handle"
              type="button"
              onPointerDown={(event) => startDrag(event, note)}
              onPointerMove={(event) => moveDrag(event, note)}
              onPointerUp={(event) => endDrag(event, note)}
              aria-label="Mover nota"
            >
              {busyNoteId === note.id ? <span className="spinner subtle" aria-hidden="true" /> : null}
              <strong>{note.title}</strong>
            </button>
            <p>{note.content}</p>
            <div className="sticky-actions" onMouseUp={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
              <button className="btn" type="button" disabled={busyNoteId === note.id} onClick={() => setEditing(note)}>
                <Pencil size={14} />
                Editar
              </button>
              <ColorDots note={note} disabled={busyNoteId === note.id} onChange={(color) => runNoteAction(note.id, async () => { await onSave({ id: note.id, color }); })} />
              <button className="btn danger" type="button" disabled={busyNoteId === note.id} onClick={() => runNoteAction(note.id, async () => { await onDelete(note.id); })}>
                {busyNoteId === note.id ? <span className="spinner subtle" aria-hidden="true" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
          );
        })}
      </div>
      {editing ? <EditNoteModal note={editing} onClose={() => setEditing(null)} onSave={saveEditedNote} /> : null}
    </div>
  );
}

function ColorPicker({ value, onChange, disabled }: { value: string; onChange: (color: string) => void; disabled?: boolean }) {
  return (
    <div className="color-picker" aria-label="Color de nota">
      {noteColors.map((color) => (
        <button
          aria-label={`Color ${color}`}
          className={value === color ? "selected" : ""}
          data-color={color}
          disabled={disabled}
          key={color}
          onClick={() => onChange(color)}
          type="button"
        />
      ))}
    </div>
  );
}

function ColorDots({ note, disabled, onChange }: { note: ServiceNote; disabled?: boolean; onChange: (color: string) => void }) {
  return (
    <div className="sticky-colors">
      {noteColors.map((color) => (
        <button
          aria-label={`Color ${color}`}
          className={(note.color || "amber") === color ? "selected" : ""}
          data-color={color}
          disabled={disabled}
          key={color}
          onClick={() => onChange(color)}
          type="button"
        />
      ))}
    </div>
  );
}

function EditNoteModal({ note, onClose, onSave }: { note: ServiceNote; onClose: () => void; onSave: (note: ServiceNote) => Promise<void> }) {
  const [form, setForm] = useState<ServiceNote>(note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar nota" onClose={onClose}>
      <form className="grid" onSubmit={submit}>
        <Field label="Titulo">
          <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        </Field>
        <Field label="Contenido">
          <textarea className="textarea" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required />
        </Field>
        <ColorPicker value={form.color || "amber"} onChange={(color) => setForm({ ...form, color })} disabled={saving} />
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="btn save" type="submit" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={18} />}
            {saving ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function maxNoteOrder(notes: ServiceNote[]): number {
  return notes.reduce((max, note) => Math.max(max, note.order || 0), 0);
}

function clampLocal(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function EntityTools(props: { query: string; setQuery: (value: string) => void; rating: string; setRating: (value: string) => void; sort: string; setSort: (value: string) => void }) {
  return (
    <div className="list-tools">
      <label className="search-box"><Search size={18} /><input value={props.query} onChange={(e) => props.setQuery(e.target.value)} placeholder="Buscar" /></label>
      <select className="select" value={props.rating} onChange={(e) => props.setRating(e.target.value)}><option value="all">Rating</option><option value="5">5 estrellas</option><option value="4">4+</option><option value="3">3+</option></select>
      <select className="select" value={props.sort} onChange={(e) => props.setSort(e.target.value)}><option value="name">Nombre</option><option value="rating">Rating</option></select>
    </div>
  );
}

function EntityGrid({ children }: { children: React.ReactNode }) {
  return <div className="entity-grid">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function DateTimeField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="datetime-pair">
        <input
          className="input"
          type="date"
          value={dateInput(value)}
          onChange={(event) => onChange(mergeLocalDateTime(value, "date", event.target.value))}
        />
        <input
          className="input"
          type="time"
          step="60"
          value={timeInput(value)}
          onChange={(event) => onChange(mergeLocalDateTime(value, "time", event.target.value))}
        />
      </div>
    </Field>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card metric"><small>{label}</small><strong>{value}</strong></div>;
}

function priceAgreementSummary(service: Service): string {
  const prices = [
    typeof service.finalPriceArs === "number" && service.finalPriceArs > 0 ? formatMoney(service.finalPriceArs, "ARS") : "",
    typeof service.finalPriceUsd === "number" && service.finalPriceUsd > 0 ? formatMoney(service.finalPriceUsd, "USD") : ""
  ].filter(Boolean);
  return prices.length ? prices.join(" + ") : "-";
}

function serviceDetailHref(id: string): string {
  return `/admin?view=service&id=${encodeURIComponent(id)}`;
}

function serviceEditHref(id: string): string {
  return `/admin?view=service-edit&id=${encodeURIComponent(id)}`;
}

function entityDetailHref(kind: "client" | "transport", id: string): string {
  return `/admin?view=${kind}&id=${encodeURIComponent(id)}`;
}

function formatAmountInput(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  return Math.trunc(value).toLocaleString("es-AR");
}

function parseAmountInput(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

function paymentCurrencySymbol(currency: Currency): string {
  return currency === "USD" ? "US$" : "$";
}

function InfoCard({ title, rows, actions }: { title: string; rows: Array<[string, React.ReactNode]>; actions?: React.ReactNode }) {
  return (
    <div className="card panel-block">
      <h2>{title}</h2>
      <dl className="info-list">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      {actions ? <div className="info-card-actions">{actions}</div> : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop"><div className="card modal"><div className="section-title"><h2>{title}</h2><button className="btn" type="button" onClick={onClose}>Cerrar</button></div>{children}</div></div>;
}

function ServiceResultModal({
  resultStatus,
  onCancel,
  onConfirm
}: {
  resultStatus: "completed" | "cancelled";
  onCancel: () => void;
  onConfirm: (cancellationResponsibility?: CancellationResponsibility) => Promise<void>;
}) {
  const [responsibility, setResponsibility] = useState<CancellationResponsibility>("client");
  const title = resultStatus === "completed" ? "Finalizar como realizado" : "Cancelar servicio";

  return (
    <ConfirmModal title={title} onCancel={onCancel} onConfirm={() => onConfirm(resultStatus === "cancelled" ? responsibility : undefined)}>
      {resultStatus === "cancelled" ? (
        <div className="cancel-responsibility">
          <span>Responsable de la cancelacion</span>
          <p>Elegí a quién se le atribuye esta cancelación para que las tarjetas reflejen las incidencias reales.</p>
          <div className="segmented-options">
            {cancellationOptions.map((option) => (
              <button
                className={responsibility === option.value ? "selected" : ""}
                key={option.value}
                onClick={() => setResponsibility(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </ConfirmModal>
  );
}

function ConfirmModal({ title, children, onCancel, onConfirm }: { title: string; children?: React.ReactNode; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setConfirming(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar la accion.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal title={title} onClose={confirming ? () => undefined : onCancel}>
      {children}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="confirm-actions">
        <button className="btn ghost" type="button" onClick={onCancel} disabled={confirming}>Volver</button>
        <button className="btn primary" type="button" onClick={confirm} disabled={confirming}>
          {confirming ? <span className="spinner" aria-hidden="true" /> : null}
          {confirming ? "Confirmando..." : "Confirmar"}
        </button>
      </div>
    </Modal>
  );
}

function StatusSelect({ value, onChange }: { value: Service["clientConfirmation"]; onChange: (value: Service["clientConfirmation"]) => void }) {
  return <select className="select" value={value} onChange={(e) => onChange(e.target.value as Service["clientConfirmation"])}><option value="pending">A confirmar</option><option value="confirmed">Confirmado</option><option value="cancelled">Cancelado</option></select>;
}

function ChargeTimingSelect({ value, onChange }: { value: Service["chargeTiming"]; onChange: (value: Service["chargeTiming"]) => void }) {
  return <select className="select" value={value} onChange={(e) => onChange(e.target.value as Service["chargeTiming"])}><option value="before_pickup">Antes de retirar</option><option value="at_pickup">Al retirar</option><option value="at_delivery">Al entregar</option><option value="after_delivery">Despues de entregar</option><option value="custom">Personalizado</option></select>;
}

function toggleCurrency(current: Currency[], currency: Currency, checked: boolean): Currency[] {
  return checked ? Array.from(new Set([...current, currency])) : current.filter((item) => item !== currency);
}

function dateInput(value?: string) {
  if (hasTimezone(value)) return localDateParts(new Date(String(value))).date;
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function timeInput(value?: string) {
  if (hasTimezone(value)) return localDateParts(new Date(String(value))).time;
  const match = String(value || "").match(/T(\d{2}:\d{2})/);
  return match?.[1] || "";
}

function isoDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : "";
}

function mergeLocalDateTime(current: string | undefined, part: "date" | "time", value: string): string {
  const date = part === "date" ? value : dateInput(current) || new Date().toISOString().slice(0, 10);
  const time = part === "time" ? value : timeInput(current) || "00:00";
  if (!date) return "";
  return `${date}T${time || "00:00"}:00`;
}

function hasTimezone(value?: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(String(value || ""));
}

function localDateParts(date: Date): { date: string; time: string } {
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

function toNum(value: string): number | null {
  return value === "" ? null : Number(value);
}

function formatAttributedCancellations(count: number): string {
  return `${count} ${count === 1 ? "atribuida" : "atribuidas"}`;
}
