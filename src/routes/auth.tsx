import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — Painel Executivo CRM | Clube do Ingresso" },
      {
        name: "description",
        content:
          "Acesso restrito ao Painel Executivo CRM do Clube do Ingresso. Faça login para continuar.",
      },
      { property: "og:title", content: "Acesso — Painel Executivo CRM" },
      {
        property: "og:description",
        content: "Acesso restrito ao Painel Executivo CRM do Clube do Ingresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#270929" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg,#270929 0%,#411345 58%,#b92f38 100%)",
        fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif",
        color: "#1c1b22",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 24px 60px rgba(20,13,40,.35)",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            aria-hidden
            style={{
              display: "flex",
              gap: 4,
              justifyContent: "center",
              alignItems: "flex-end",
              height: 42,
              marginBottom: 14,
            }}
          >
            {[20, 30, 42, 26].map((h, i) => (
              <span
                key={i}
                style={{
                  width: 11,
                  height: h,
                  borderRadius: "4px 4px 0 0",
                  background:
                    "linear-gradient(180deg,#f7b733,#f28c22,#d94242)",
                }}
              />
            ))}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "#270929",
              fontWeight: 800,
            }}
          >
            Clube do Ingresso
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#6f6b7a",
            }}
          >
            Painel Executivo CRM — acesso restrito
          </p>
        </header>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

          {error && (
            <div
              role="alert"
              style={{
                background: "#fdecec",
                color: "#b92f38",
                border: "1px solid #f5c2c2",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "12px 16px",
              borderRadius: 999,
              border: 0,
              cursor: loading ? "wait" : "pointer",
              fontWeight: 700,
              color: "#fff",
              background:
                "linear-gradient(135deg,#270929 0%,#411345 60%,#b92f38 100%)",
              boxShadow: "0 10px 24px rgba(39,9,41,.35)",
              fontSize: 14,
            }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p style={{ margin: "8px 0 0", fontSize: 12.5, textAlign: "center" }}>
            <a href="/forgot-password" style={{ color: "#411345", fontWeight: 700, textDecoration: "none" }}>
              Esqueceu a senha?
            </a>
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11.5,
              color: "#6f6b7a",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            O cadastro é restrito e feito por convite do administrador.
          </p>
        </form>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #e6e4ec",
  background: "#fafafa",
  fontSize: 14,
  outlineColor: "#411345",
  fontFamily: "inherit",
};
