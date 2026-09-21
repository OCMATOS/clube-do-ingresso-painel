import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PANELS, type PanelKey } from "@/lib/panels";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel Executivo CRM | Clube do Ingresso" },
      { name: "description", content: "Painel Executivo CRM do Clube do Ingresso — base RD Station com importação, exportação e análise em tempo real." },
      { property: "og:title", content: "Painel Executivo CRM | Clube do Ingresso" },
      { property: "og:description", content: "Painel Executivo CRM do Clube do Ingresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#270929" },
    ],
  }),
  component: PainelHome,
});

type Perms = { tabs: PanelKey[]; upload: boolean; download: boolean };

function PainelHome() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "pending" | "ready">("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<Perms | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/auth", replace: true }); return; }
      const uid = u.user.id;
      const [{ data: profile }, { data: roles }, { data: pRows }, { data: sdrRow }] = await Promise.all([
        supabase.from("profiles").select("status").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("user_panel_permissions").select("panel_key,can_view,can_upload,can_download").eq("user_id", uid),
        supabase.from("sdr_assignments").select("sdr_key").eq("user_id", uid).maybeSingle(),
      ]);
      const admin = !!roles?.some((r) => r.role === "admin");
      setIsAdmin(admin);
      const SDR_EMAILS = ["laysla.siqueira@clubedoingresso.com", "danilo.lima@clubedoingresso.com"];
      const isSdr = !!sdrRow?.sdr_key || SDR_EMAILS.includes((u.user.email ?? "").toLowerCase());
      if (!admin && isSdr) { navigate({ to: "/qualificacao", replace: true }); return; }
      if (!admin && profile?.status !== "approved") { setStatus("pending"); return; }

      if (admin) {
        setPerms({ tabs: PANELS.map((p) => p.key), upload: true, download: true });
      } else {
        const rows = pRows ?? [];
        setPerms({
          tabs: rows.filter((r) => r.can_view).map((r) => r.panel_key as PanelKey),
          upload: rows.some((r) => r.can_upload),
          download: rows.some((r) => r.can_download),
        });
      }
      setStatus("ready");
    })();
  }, [navigate]);

  useEffect(() => {
    if (!perms) return;
    const BUCKET = "panel-uploads";
    const ANALYTIC_DATASETS = ["global", "fm", "nfr_crm", "nfr_mensal"] as const;
    const TAB_KEYS = PANELS.map((p) => p.key);
    const isValidDataset = (ds: string) =>
      (ANALYTIC_DATASETS as readonly string[]).includes(ds) ||
      (ds.startsWith("tab_") && TAB_KEYS.includes(ds.slice(4) as PanelKey));

    const send = () => iframeRef.current?.contentWindow?.postMessage({ type: "ci-perms", ...perms }, "*");

    async function restoreAll() {
      const allDatasets = [...ANALYTIC_DATASETS, ...TAB_KEYS.map((k) => `tab_${k}`)];
      const datasets: Record<string, Array<{ name: string; contentType: string; hash: string; base64: string }>> = {};
      await Promise.all(allDatasets.map(async (ds) => {
        const { data: list, error } = await supabase.storage.from(BUCKET).list(ds, { limit: 1000 });
        if (error || !list?.length) { datasets[ds] = []; return; }
        const files = await Promise.all(list.filter((o) => o.name && !o.name.endsWith("/")).map(async (o) => {
          const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(`${ds}/${o.name}`);
          if (dlErr || !blob) return null;
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          const meta = (o.metadata ?? {}) as Record<string, unknown>;
          return {
            name: (meta.originalName as string) || o.name,
            contentType: (meta.mimetype as string) || (blob.type ?? ""),
            hash: o.name.replace(/\.[^.]+$/, ""),
            base64: btoa(bin),
          };
        }));
        datasets[ds] = files.filter(Boolean) as never;
      }));
      iframeRef.current?.contentWindow?.postMessage({ type: "ci-restore", datasets }, "*");
    }

    async function persist(payload: { dataset: string; name: string; contentType: string; hash: string; base64: string }) {
      if (!isValidDataset(payload.dataset)) return;
      const ext = payload.name.includes(".") ? payload.name.slice(payload.name.lastIndexOf(".")) : "";
      const path = `${payload.dataset}/${payload.hash}${ext}`;
      const bin = atob(payload.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: payload.contentType || "application/octet-stream" });
      await supabase.storage.from(BUCKET).upload(path, blob, {
        upsert: true,
        contentType: payload.contentType || "application/octet-stream",
      });
    }

    async function removeFile(payload: { dataset: string; hash: string; name: string }) {
      if (!isValidDataset(payload.dataset)) return;
      const ext = payload.name && payload.name.includes(".") ? payload.name.slice(payload.name.lastIndexOf(".")) : "";
      const path = `${payload.dataset}/${payload.hash}${ext}`;
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const onMsg = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "ci-navigate" && typeof d.to === "string" && d.to.startsWith("/")) navigate({ to: d.to });
      else if (d.type === "ci-ready") send();
      else if (d.type === "ci-request-restore") { send(); restoreAll(); }
      else if (d.type === "ci-persist") { void persist(d); }
      else if (d.type === "ci-remove") { void removeFile(d).then(() => restoreAll()); }
    };
    window.addEventListener("message", onMsg);
    const t = setTimeout(() => { send(); void restoreAll(); }, 400);
    return () => { window.removeEventListener("message", onMsg); clearTimeout(t); };
  }, [perms, navigate]);

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (status === "loading") {
    return <div style={fullBg}><div style={centerMsg}>Carregando…</div></div>;
  }
  if (status === "pending") {
    return (
      <div style={fullBg}>
        <div style={{ ...centerMsg, maxWidth: 460 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: "#270929" }}>Cadastro em análise</h1>
          <p style={{ marginTop: 10, color: "#4a4657", fontSize: 14 }}>
            Sua conta foi criada com sucesso. Aguarde o administrador aprovar seu acesso e definir os painéis liberados.
          </p>
          <button onClick={onSignOut} style={pillBtn}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#270929" }}>
      <iframe
        ref={iframeRef}
        src="/painel.html"
        title="Painel Executivo CRM — Clube do Ingresso"
        onLoad={() => perms && iframeRef.current?.contentWindow?.postMessage({ type: "ci-perms", ...perms }, "*")}
        style={{ width: "100%", height: "100%", border: 0, display: "block", background: "#f6f7fb" }}
        allow="clipboard-read; clipboard-write; downloads"
      />
      <div style={{ position: "fixed", top: 14, right: 14, zIndex: 10, display: "flex", gap: 8 }}>
        {isAdmin && (
          <Link to="/admin" style={{ ...headerBtn, background: "linear-gradient(135deg,#f28c22,#d94242)" }}>
            ⚙ Admin
          </Link>
        )}
        <button type="button" onClick={onSignOut} style={headerBtn}>Sair</button>
      </div>
    </div>
  );
}

const fullBg: React.CSSProperties = {
  minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24,
  background: "linear-gradient(135deg,#270929 0%,#411345 58%,#b92f38 100%)",
  fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif",
};
const centerMsg: React.CSSProperties = {
  background: "#fff", borderRadius: 20, padding: "28px 26px", textAlign: "center",
  boxShadow: "0 24px 60px rgba(20,13,40,.35)", width: "100%",
};
const pillBtn: React.CSSProperties = {
  marginTop: 18, padding: "10px 18px", borderRadius: 999, border: 0, cursor: "pointer",
  color: "#fff", fontWeight: 700, background: "linear-gradient(135deg,#270929,#b92f38)",
};
const headerBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.28)",
  background: "rgba(39,9,41,.72)", color: "#fff", fontWeight: 700, fontSize: 12,
  cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: "0 8px 20px rgba(0,0,0,.25)",
  fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif", textDecoration: "none",
  display: "inline-flex", alignItems: "center",
};
