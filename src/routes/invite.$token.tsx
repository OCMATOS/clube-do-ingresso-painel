import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateInvite, consumeInvite } from "@/lib/invites.functions";

import { Shell, lbl, inp, primaryBtn, errBox } from "./forgot-password";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Criar conta — Clube do Ingresso" },
    { name: "description", content: "Crie sua conta no Painel Executivo CRM do Clube do Ingresso a partir do seu convite." },
    { property: "og:title", content: "Criar conta — Clube do Ingresso" },
    { property: "og:description", content: "Criar conta via convite." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "invalid" | "ready" | "done">("checking");
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [email2, setEmail2] = useState("");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await validateInvite({ data: { token } }).catch(() => null);
      if (!res || !res.valid) { setState("invalid"); return; }
      setInviteEmail(res.email); if (res.email) setEmail(res.email);
      setState("ready");
    })();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (email.trim().toLowerCase() !== email2.trim().toLowerCase()) return setErr("Os e-mails não coincidem.");
    if (pw.length < 8) return setErr("A senha deve ter pelo menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password: pw,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) { setLoading(false); return setErr(error.message); }
    await consumeInvite({ data: { token } }).catch(() => null);
    setLoading(false); setState("done");
  }


  return (
    <Shell title="Criar sua conta" subtitle="Convite do administrador do Painel Executivo CRM.">
      {state === "checking" && <p style={{ fontSize: 13, color: "#6f6b7a" }}>Validando convite…</p>}
      {state === "invalid" && (
        <>
          <div style={errBox}>Convite inválido ou expirado.</div>
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 12 }}>
            <Link to="/auth" style={{ color: "#411345", fontWeight: 700 }}>Ir para o login</Link>
          </p>
        </>
      )}
      {state === "ready" && (
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={lbl}>E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!inviteEmail} style={inp} />
          </label>
          <label style={lbl}>Repetir e-mail
            <input type="email" required value={email2} onChange={(e) => setEmail2(e.target.value)} style={inp} />
          </label>
          <label style={lbl}>Senha (mín. 8 caracteres)
            <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
          </label>
          <label style={lbl}>Repetir senha
            <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} style={inp} />
          </label>
          {err && <div style={errBox}>{err}</div>}
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Criando…" : "Criar conta"}</button>
        </form>
      )}
      {state === "done" && (
        <>
          <p style={{ fontSize: 14, color: "#2d7d3f" }}>Conta criada! Aguarde o administrador aprovar seu acesso.</p>
          <button onClick={() => navigate({ to: "/auth" })} style={{ ...primaryBtn, marginTop: 12 }}>Ir para o login</button>
        </>
      )}
    </Shell>
  );
}
