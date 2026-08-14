import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  Clock3,
  Headset,
  MapPinned,
  MessageCircle,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound,
  Zap
} from "lucide-react";
import Link from "next/link";

const contactLabel = process.env.NEXT_PUBLIC_MOVA_CONTACT_LABEL || "Solicitar presupuesto";
const contactWhatsapp = process.env.NEXT_PUBLIC_MOVA_CONTACT_WHATSAPP || "";

const whatsappMessage = "Hola, quiero solicitar un presupuesto con MOVA.";
const contactHref = buildWhatsappHref(contactWhatsapp, whatsappMessage);

const services = [
  {
    icon: Building2,
    title: "Cargas empresariales",
    text: "Gestion integral de flotas, pallets y cargas de alto volumen para empresas e industrias."
  },
  {
    icon: Route,
    title: "Coordinacion logistica",
    text: "Rutas, horarios, transportes y condiciones comerciales ordenadas desde el primer contacto."
  },
  {
    icon: CalendarCheck,
    title: "Envios programados",
    text: "Viajes planificados, rutas fijas y entregas coordinadas para operaciones que no pueden fallar."
  },
  {
    icon: Zap,
    title: "Servicios urgentes",
    text: "Respuesta rapida para cargas criticas con prioridad de resolucion y seguimiento humano."
  }
];

const benefits = [
  { icon: Headset, title: "Atencion humana", text: "Trato directo, criterio operativo y acompanamiento real." },
  { icon: Clock3, title: "Presupuestos rapidos", text: "Cotizaciones claras para decidir sin perder tiempo." },
  { icon: MapPinned, title: "Cobertura nacional", text: "Red de transportistas para mover carga en Argentina." },
  { icon: ShieldCheck, title: "Operacion confiable", text: "Informacion comercial, instrucciones y seguimiento sin ruido." },
  { icon: UsersRound, title: "Red verificada", text: "Clientes y transportes coordinados con historial operativo." }
];

export default function LandingPage() {
  return (
    <main className="landing landing-pro">
      <header className="landing-topbar">
        <Link href="/" className="landing-brand" aria-label="MOVA">
          <Truck size={22} />
          <span>MOVA</span>
        </Link>
        <nav className="landing-nav-links" aria-label="Navegacion principal">
          <a href="#servicios">Servicios</a>
          <a href="#beneficios">Beneficios</a>
          <a href={contactHref} target="_blank" rel="noreferrer">Contacto</a>
          <Link className="landing-admin-link" href="/admin/login" aria-label="Acceso a consola">
            <UserRound size={19} />
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <picture className="landing-hero-media">
          <source srcSet="/landing/truck-mobile.png" media="(max-width: 720px)" />
          <img src="/landing/truck-desktop.png" alt="Camion moderno en ruta argentina al amanecer" />
        </picture>
        <div className="landing-hero-shade" />

        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <ArrowUpRight size={15} />
              <span>Alto rendimiento logistico</span>
            </div>
            <h1>
              Logistica confiable para <span>mover tu negocio</span>
            </h1>
            <p>
              Coordinacion inteligente, atencion humana y cobertura nacional para empresas que necesitan mover cargas
              con velocidad, precision y control comercial claro.
            </p>
            <div className="landing-actions">
              <a className="landing-btn primary" href={contactHref} target="_blank" rel="noreferrer">
                {contactLabel}
                <ArrowRight size={18} />
              </a>
              <a className="landing-btn ghost" href={contactHref} target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                Hablar por WhatsApp
              </a>
            </div>
          </div>

          <aside className="landing-service-panel" aria-label="Servicios destacados">
            <h2>Servicios especializados</h2>
            <ul>
              <li><Check size={17} /> Cargas empresariales e industriales</li>
              <li><Check size={17} /> Coordinacion logistica integral</li>
              <li><Check size={17} /> Envios programados y rutas fijas</li>
              <li><Check size={17} /> Servicios urgentes 24/7</li>
            </ul>
          </aside>

          <div className="landing-stats" aria-label="Indicadores MOVA">
            <div>
              <strong>+1.200</strong>
              <span>Viajes coordinados</span>
            </div>
            <div>
              <strong>98%</strong>
              <span>Cumplimiento</span>
            </div>
            <div>
              <strong>&lt; 15m</strong>
              <span>Respuesta</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="servicios">
        <div className="landing-section-head">
          <span>Soluciones MOVA</span>
          <h2>Servicios Especializados</h2>
          <p>
            Operamos bajo estandares de seguridad, eficiencia y comunicacion directa para que cada traslado tenga
            responsables, recorrido y condiciones definidos.
          </p>
        </div>
        <div className="landing-card-grid">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article className="landing-feature-card" key={service.title}>
                <Icon size={24} />
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section compact" id="beneficios">
        <div className="landing-section-head">
          <span>Nuestros beneficios</span>
          <h2>Seriedad operativa sin perder contacto humano</h2>
        </div>
        <div className="landing-benefit-strip">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="landing-benefit" key={benefit.title}>
                <Icon size={22} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="landing-pro-footer" id="contacto">
        <div>
          <strong>MOVA</strong>
          <span>|</span>
          <p>Logistica Argentina. Todos los derechos reservados.</p>
        </div>
        <nav aria-label="Enlaces legales">
          <a href="#servicios">Servicios</a>
          <a href="#beneficios">Beneficios</a>
          <Link href="/admin/login">Consola</Link>
        </nav>
      </footer>

      <a className="landing-whatsapp-fab" href={contactHref} target="_blank" rel="noreferrer" aria-label="Contactar por WhatsApp">
        <MessageCircle size={25} />
      </a>
    </main>
  );
}

function buildWhatsappHref(whatsapp: string, message: string): string {
  const normalized = whatsapp.replace(/[^\d]/g, "");
  if (normalized) return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
