"use client";

import { useAuth } from "@/context/AuthContext";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login(username, password);
    } catch {
      // El contexto ya expone el mensaje en pantalla.
    }
  }

  return (
    <main className="login-page">
      <Link href="/" className="wordmark">
        MOVA
      </Link>
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="login-icon">
          <LockKeyhole size={24} />
        </div>
        <h1>Panel administrativo</h1>
        <label className="field">
          <span>Usuario</span>
          <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="field">
          <span>Contrasena</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" aria-hidden="true" /> : null}
          {loading ? "Conectando..." : "Entrar"}
          <ArrowRight size={18} />
        </button>
      </form>
    </main>
  );
}
