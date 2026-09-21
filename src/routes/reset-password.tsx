import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, lbl, inp, primaryBtn, errBox } from "./forgot-password";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Definir nova senha — Clube do Ingresso" },
    { name: "description", content: "Defina uma nova senha para acessar o Painel Executivo CRM." },
    { property: "og:title", content: "Definir nova senha — Clube do Ingresso" },
    { property: "og:description", content: "Defina uma nova senha." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts tokens in hash; SDK handles it on load
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (pw.length < 8) return setErr("A senha deve ter pelo menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setErr(error.message);
    navigate({ to: "/", replace: true });
  }

  return (
    <Shell title="Definir nova senha" subtitle="Escolha uma senha forte para continuar.">
      {!ready ? (
        <p style={{ fontSize: 13, color: "#6f6b7a" }}>Validando link… Se nada acontecer, solicite um novo link em <Link to="/forgot-password" style={{ color: "#411345", fontWeight: 700 }}>Recuperar senha</Link>.</p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={lbl}>Nova senha
            <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
          </label>
          <label style={lbl}>Repetir senha
            <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} style={inp} />
          </label>
          {err && <div style={errBox}>{err}</div>}
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Salvando…" : "Salvar nova senha"}</button>
        </form>
      )}
    </Shell>
  );
}
