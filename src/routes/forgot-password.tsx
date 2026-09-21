import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Recuperar senha — Clube do Ingresso" },
    { name: "description", content: "Recupere o acesso ao Painel Executivo CRM do Clube do Ingresso." },
    { property: "og:title", content: "Recuperar senha — Clube do Ingresso" },
    { property: "og:description", content: "Recupere o acesso ao Painel." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setErr("Não foi possível enviar o e-mail. Tente novamente."); return; }
    setSent(true);
  }

  return (
    <Shell title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha.">
      {sent ? (
        <p style={{ fontSize: 14, color: "#2d7d3f" }}>
          Se este e-mail existir no painel, você receberá um link para redefinir a senha em instantes.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={lbl}>E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
          </label>
          {err && <div style={errBox}>{err}</div>}
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Enviando…" : "Enviar link"}</button>
        </form>
      )}
      <p style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        <Link to="/auth" style={{ color: "#411345", fontWeight: 700 }}>Voltar ao login</Link>
      </p>
    </Shell>
  );
}

export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={pageBg}>
      <main style={card}>
        <header style={{ textAlign: "center", marginBottom: 20 }}>
          <div aria-hidden style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "flex-end", height: 42, marginBottom: 12 }}>
            {[20, 30, 42, 26].map((h, i) => (
              <span key={i} style={{ width: 11, height: h, borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg,#f7b733,#f28c22,#d94242)" }} />
            ))}
          </div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#270929", fontWeight: 800 }}>{title}</h1>
          {subtitle && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6f6b7a" }}>{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}

export const pageBg: React.CSSProperties = {
  minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24,
  background: "linear-gradient(135deg,#270929 0%,#411345 58%,#b92f38 100%)",
  fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif", color: "#1c1b22",
};
export const card: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20,
  padding: "32px 28px", boxShadow: "0 24px 60px rgba(20,13,40,.35)",
};
export const lbl: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 600 };
export const inp: React.CSSProperties = {
  padding: "11px 12px", borderRadius: 10, border: "1px solid #e6e4ec",
  background: "#fafafa", fontSize: 14, outlineColor: "#411345", fontFamily: "inherit",
};
export const primaryBtn: React.CSSProperties = {
  marginTop: 4, padding: "12px 16px", borderRadius: 999, border: 0, cursor: "pointer",
  fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#270929 0%,#411345 60%,#b92f38 100%)",
  boxShadow: "0 10px 24px rgba(39,9,41,.35)", fontSize: 14,
};
export const errBox: React.CSSProperties = {
  background: "#fdecec", color: "#b92f38", border: "1px solid #f5c2c2",
  borderRadius: 10, padding: "10px 12px", fontSize: 13,
};
