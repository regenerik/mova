import { ArrowRight, Gauge, Handshake, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

const contactLabel = process.env.NEXT_PUBLIC_MOVA_CONTACT_LABEL || "Solicitar presupuesto";
const contactWhatsapp = process.env.NEXT_PUBLIC_MOVA_CONTACT_WHATSAPP;
const contactEmail = process.env.NEXT_PUBLIC_MOVA_CONTACT_EMAIL;

export default function LandingPage() {
  const contactHref = contactWhatsapp
    ? `https://wa.me/${contactWhatsapp.replace(/[^\d+]/g, "")}`
    : contactEmail
      ? `mailto:${contactEmail}`
      : "/admin/login";

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="wordmark" aria-label="MOVA">
          MOVA
        </Link>
        <a className="btn primary" href={contactHref}>
          {contactLabel}
          <ArrowRight size={18} />
        </a>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Intermediacion logistica</p>
          <h1>MOVA</h1>
          <p>
            Coordinamos cargas, recorridos y transportes disponibles con velocidad operativa, seguimiento humano y
            control comercial claro.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href={contactHref}>
              {contactLabel}
              <ArrowRight size={18} />
            </a>
            <Link className="btn ghost" href="/admin/login">
              Acceso admin
            </Link>
          </div>
        </div>
        <div className="hero-board" aria-label="Panel operativo MOVA">
          <div className="route-line">
            <Truck size={28} />
            <span>Mendoza</span>
            <strong />
            <span>Rosario</span>
          </div>
          <div className="signal-grid">
            <div>
              <small>Carga</small>
              <strong>22 pallets</strong>
            </div>
            <div>
              <small>Estado</small>
              <strong>Activo</strong>
            </div>
            <div>
              <small>Comision</small>
              <strong>10%</strong>
            </div>
          </div>
          <div className="progress-preview">
            <span style={{ width: "58%" }} />
          </div>
        </div>
      </section>

      <section className="landing-band">
        <article>
          <Gauge size={22} />
          <h2>Respuesta rapida</h2>
          <p>Conectamos necesidades urgentes con opciones de transporte sin convertir la gestion en un laberinto.</p>
        </article>
        <article>
          <Handshake size={22} />
          <h2>Operacion clara</h2>
          <p>Cliente, transporte, recorrido, precio, cobros y comision quedan ordenados en un mismo flujo.</p>
        </article>
        <article>
          <ShieldCheck size={22} />
          <h2>Seguimiento humano</h2>
          <p>Cuando la situacion requiere criterio, MOVA prioriza coordinacion directa y resolucion concreta.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <span>MOVA</span>
        <Link href="/admin/login">Panel administrativo</Link>
      </footer>
    </main>
  );
}
