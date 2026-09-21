import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PANELS, type PanelKey } from "@/lib/panels";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Administração — Clube do Ingresso" },
    { name: "description", content: "Gerenciar usuários, convites e permissões do Painel Executivo CRM." },
    { property: "og:title", content: "Administração — Clube do Ingresso" },
    { property: "og:description", content: "Gerenciar usuários e permissões." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

type Profile = { id: string; email: string | null; full_name: string | null; status: string; created_at: string };
type PermRow = { user_id: string; panel_key: string; can_view: boolean; can_upload: boolean; can_download: boolean };
type Invite = { id: string; token: string; email: string | null; used_at: string | null; expires_at: string; created_at: string; sdr_key?: string | null; sdr_only?: boolean | null };

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [perms, setPerms] = useState<Record<string, Record<string, PermRow>>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSdr, setInviteSdr] = useState("");
  const [inviteSdrOnly, setInviteSdrOnly] = useState(true);

  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: ps }, { data: rs }, { data: pr }, { data: iv }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("user_panel_permissions").select("*"),
      supabase.from("invites").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles((ps ?? []) as Profile[]);
    const rmap: Record<string, string[]> = {};
    (rs ?? []).forEach((r: { user_id: string; role: string }) => {
      (rmap[r.user_id] ||= []).push(r.role);
    });
    setRoles(rmap);
    const pmap: Record<string, Record<string, PermRow>> = {};
    (pr ?? []).forEach((p) => { (pmap[p.user_id] ||= {})[p.panel_key] = p as PermRow; });
    setPerms(pmap);
    setInvites((iv ?? []) as Invite[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/auth", replace: true }); return; }
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!r?.some((x) => x.role === "admin")) { navigate({ to: "/", replace: true }); return; }
      await load(); setChecking(false);
    })();
  }, [navigate, load]);

  async function setStatus(id: string, status: string) {
    await supabase.from("profiles").update({ status }).eq("id", id);
    load();
  }
  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (isAdmin) await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    else await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    load();
  }
  async function togglePerm(userId: string, key: PanelKey, field: "can_view" | "can_upload" | "can_download") {
    const current = perms[userId]?.[key];
    if (current) {
      const patch = { can_view: current.can_view, can_upload: current.can_upload, can_download: current.can_download };
      patch[field] = !current[field];
      await supabase.from("user_panel_permissions")
        .update(patch)
        .eq("user_id", userId).eq("panel_key", key);
    } else {
      await supabase.from("user_panel_permissions").insert({
        user_id: userId, panel_key: key,
        can_view: field === "can_view", can_upload: field === "can_upload", can_download: field === "can_download",
      });
    }
    load();
  }
  async function grantAll(userId: string) {
    for (const p of PANELS) {
      const cur = perms[userId]?.[p.key];
      if (cur) {
        await supabase.from("user_panel_permissions").update({ can_view: true, can_upload: true, can_download: true })
          .eq("user_id", userId).eq("panel_key", p.key);
      } else {
        await supabase.from("user_panel_permissions").insert({ user_id: userId, panel_key: p.key, can_view: true, can_upload: true, can_download: true });
      }
    }
    load();
  }
  async function revokeAll(userId: string) {
    await supabase.from("user_panel_permissions").delete().eq("user_id", userId);
    load();
  }
  async function createInvite() {
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("invites").insert({
      token,
      email: inviteEmail.trim() || null,
      created_by: u.user!.id,
      sdr_key: inviteSdr || null,
      sdr_only: !!inviteSdr && inviteSdrOnly,
    });
    setInviteEmail(""); load();
  }

  async function deleteInvite(id: string) {
    await supabase.from("invites").delete().eq("id", id);
    load();
  }

  if (checking) return <div style={{ padding: 40, textAlign: "center", color: "#270929" }}>Carregando…</div>;

  return (
    <div style={{ minHeight: "100dvh", background: "#f6f7fb", fontFamily: "Inter, Segoe UI, Roboto, Arial, sans-serif", color: "#1c1b22" }}>
      <header style={{ background: "linear-gradient(135deg,#270929 0%,#411345 60%,#b92f38 100%)", color: "#fff", padding: "18px 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div aria-hidden style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 28 }}>
              {[14, 20, 28, 18].map((h, i) => (
                <span key={i} style={{ width: 7, height: h, borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#f7b733,#f28c22,#d94242)" }} />
              ))}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Administração</h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: .85 }}>Usuários, convites e permissões por painel</p>
            </div>
          </div>
          <Link to="/" style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.3)", background: "rgba(0,0,0,.2)", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← Voltar ao painel</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", display: "grid", gap: 20 }}>
        {/* Invites */}
        <section style={card}>
          <h2 style={h2}>Convites</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            <input type="email" placeholder="E-mail (opcional)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              style={{ flex: "1 1 200px", padding: "10px 12px", border: "1px solid #e6e4ec", borderRadius: 10, fontSize: 13 }} />
            <select value={inviteSdr} onChange={(e) => setInviteSdr(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #e6e4ec", borderRadius: 10, fontSize: 13 }}>
              <option value="">Sem vínculo de SDR</option>
              <option value="laysla">SDR · Laysla</option>
              <option value="danilo">SDR · Danilo</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6f6b7a" }}>
              <input type="checkbox" checked={inviteSdrOnly} onChange={(e) => setInviteSdrOnly(e.target.checked)} disabled={!inviteSdr} />
              Acesso somente à aba Outbound SDR
            </label>
            <button onClick={createInvite} style={primaryBtn}>Gerar link de convite</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tbl}>
              <thead><tr><th style={th}>Link</th><th style={th}>E-mail</th><th style={th}>SDR</th><th style={th}>Status</th><th style={th}>Expira</th><th style={th}></th></tr></thead>
              <tbody>
                {invites.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#8b8797" }}>Nenhum convite gerado.</td></tr>}

                {invites.map((iv) => {
                  const url = `${window.location.origin}/invite/${iv.token}`;
                  const used = !!iv.used_at;
                  const expired = new Date(iv.expires_at) < new Date();
                  return (
                    <tr key={iv.id}>
                      <td style={{ ...td, maxWidth: 320 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 12, border: "1px solid #e6e4ec", borderRadius: 6 }} />
                          <button onClick={() => navigator.clipboard.writeText(url)} style={smBtn}>Copiar</button>
                        </div>
                      </td>
                      <td style={td}>{iv.email ?? "—"}</td>
                      <td style={td}>{iv.sdr_key ? (iv.sdr_key === "laysla" ? "Laysla" : iv.sdr_key === "danilo" ? "Danilo" : iv.sdr_key) : "—"}{iv.sdr_only ? " · só Outbound" : ""}</td>

                      <td style={td}>{used ? "Usado" : expired ? "Expirado" : "Ativo"}</td>
                      <td style={td}>{new Date(iv.expires_at).toLocaleDateString("pt-BR")}</td>
                      <td style={td}><button onClick={() => deleteInvite(iv.id)} style={{ ...smBtn, background: "#fdecec", color: "#b92f38", borderColor: "#f5c2c2" }}>Excluir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Users */}
        <section style={card}>
          <h2 style={h2}>Usuários</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {profiles.map((p) => {
              const isAdmin = roles[p.id]?.includes("admin");
              const isOpen = expanded === p.id;
              const uperms = perms[p.id] ?? {};
              return (
                <div key={p.id} style={{ border: "1px solid #e6e4ec", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{p.full_name || p.email}</div>
                      <div style={{ fontSize: 12, color: "#6f6b7a" }}>{p.email}</div>
                    </div>
                    <span style={{ ...badge, background: p.status === "approved" ? "#e6f5ea" : "#fff4e0", color: p.status === "approved" ? "#2d7d3f" : "#a05a00" }}>
                      {p.status === "approved" ? "Aprovado" : "Pendente"}
                    </span>
                    {isAdmin && <span style={{ ...badge, background: "#eee9f4", color: "#411345" }}>Admin</span>}
                    <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                      {p.status !== "approved"
                        ? <button onClick={() => setStatus(p.id, "approved")} style={smBtn}>Aprovar</button>
                        : <button onClick={() => setStatus(p.id, "pending")} style={smBtn}>Suspender</button>}
                      <button onClick={() => toggleAdmin(p.id, !!isAdmin)} style={smBtn}>{isAdmin ? "Remover admin" : "Tornar admin"}</button>
                      <button onClick={() => setExpanded(isOpen ? null : p.id)} style={{ ...smBtn, background: "#270929", color: "#fff", borderColor: "#270929" }}>{isOpen ? "Fechar" : "Permissões"}</button>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #e6e4ec", padding: 12, background: "#faf9fc" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <button onClick={() => grantAll(p.id)} style={smBtn}>Liberar tudo</button>
                        <button onClick={() => revokeAll(p.id)} style={{ ...smBtn, background: "#fdecec", color: "#b92f38", borderColor: "#f5c2c2" }}>Revogar tudo</button>
                        {isAdmin && <span style={{ fontSize: 11, color: "#8b8797", alignSelf: "center" }}>Administradores têm acesso total automaticamente.</span>}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={tbl}>
                          <thead><tr><th style={th}>Painel</th><th style={th}>Ver</th><th style={th}>Upload</th><th style={th}>Download</th></tr></thead>
                          <tbody>
                            {PANELS.map((pn) => {
                              const r = uperms[pn.key];
                              return (
                                <tr key={pn.key}>
                                  <td style={td}>{pn.label}</td>
                                  <td style={td}><input type="checkbox" checked={!!r?.can_view} onChange={() => togglePerm(p.id, pn.key, "can_view")} /></td>
                                  <td style={td}><input type="checkbox" checked={!!r?.can_upload} onChange={() => togglePerm(p.id, pn.key, "can_upload")} /></td>
                                  <td style={td}><input type="checkbox" checked={!!r?.can_download} onChange={() => togglePerm(p.id, pn.key, "can_download")} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 6px 20px rgba(20,13,40,.08)" };
const h2: React.CSSProperties = { margin: "0 0 12px", fontSize: 16, color: "#270929", fontWeight: 800 };
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e6e4ec", color: "#6f6b7a", fontWeight: 600, fontSize: 12 };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #f0eef4" };
const badge: React.CSSProperties = { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 };
const smBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #e6e4ec", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { padding: "10px 16px", borderRadius: 10, border: 0, cursor: "pointer", fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#270929 0%,#411345 60%,#b92f38 100%)", fontSize: 13 };
