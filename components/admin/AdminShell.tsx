"use client";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { appsScriptApi } from "@/lib/appsScriptApi";
import { countsBySection } from "@/lib/domain";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  LogOut,
  Menu,
  PackageCheck,
  PauseCircle,
  Truck,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const nav = [
  { href: "/admin", label: ["Servicios", "Activos"], section: "active", icon: Truck },
  { href: "/admin/servicios/confirmados", label: ["Servicios", "Confirmados"], section: "confirmed", icon: CheckCircle2 },
  { href: "/admin/servicios/a-confirmar", label: ["Servicios", "a Confirmar"], section: "toConfirm", icon: PauseCircle },
  { href: "/admin/servicios/finalizados", label: ["Servicios", "Finalizados"], section: "completed", icon: PackageCheck },
  { href: "/admin/servicios/cancelados", label: ["Servicios", "Cancelados"], section: "cancelled", icon: X },
  { href: "/admin/clientes", label: ["Clientes"], icon: Users },
  { href: "/admin/transportes", label: ["Transportes"], icon: Truck },
  { href: "/admin/estadisticas", label: ["Estadisticas"], icon: BarChart3 },
  { href: "/admin/ia", label: ["Carga de", "Servicio IA"], icon: Bot }
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const { data, error, sectionAlerts, clearSectionAlert } = useData();
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => countsBySection(data.services), [data.services]);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!loading && !session && !isLogin) router.replace("/admin/login");
    if (!loading && session && isLogin) router.replace("/admin");
  }, [loading, session, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (loading || !session) {
    return (
      <main className="admin-loading">
        <div className="wordmark">MOVA</div>
        <span className="spinner admin-spinner" aria-hidden="true" />
        <p>Validando sesion...</p>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <button className="btn icon-btn mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu size={20} />
      </button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <Link href="/admin" className="wordmark">
            MOVA
          </Link>
          <button className="btn icon-btn close-menu" type="button" onClick={() => setOpen(false)} aria-label="Cerrar menu">
            <X size={18} />
          </button>
        </div>
        {appsScriptApi.demoMode ? <span className="demo-flag">Modo demo local</span> : null}
        <nav className="side-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const count = "section" in item ? counts[item.section] : null;
            const hasAlert = "section" in item && Boolean(sectionAlerts[item.section]);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                onClick={() => {
                  if ("section" in item) clearSectionAlert(item.section);
                  setOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label.map((line) => <em key={line}>{line}</em>)}</span>
                <span className="nav-markers">
                  {hasAlert ? <i aria-label="Cambios nuevos" /> : null}
                  {count !== null ? <b>{count}</b> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <button className="btn ghost logout" type="button" onClick={logout}>
          <LogOut size={18} />
          Salir
        </button>
      </aside>
      {open ? <button className="sidebar-scrim" aria-label="Cerrar menu" onClick={() => setOpen(false)} /> : null}
      <main className="admin-main">
        {error ? <div className="sync-error">{error}</div> : null}
        {children}
      </main>
    </div>
  );
}
