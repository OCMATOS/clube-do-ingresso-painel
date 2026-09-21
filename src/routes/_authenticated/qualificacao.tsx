import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createSdrLead,
  getLeadChat,
  integrateLeadRd,
  listLeadInteractions,
  listSdrLeads,
  sendLeadChat,
  setLeadIcp,
  setLeadRdManual,
  syncSdrLeads,
} from "@/lib/sdr.functions";

export const Route = createFileRoute("/_authenticated/qualificacao")({
  head: () => ({
    meta: [
      { title: "Qualificação SDR — Instagram | Clube do Ingresso" },
      {
        name: "description",
        content:
          "Área exclusiva dos SDRs do Clube do Ingresso: leads de qualificação do Instagram, assistente de IA e integração com o RD Station CRM.",
      },
      { property: "og:title", content: "Qualificação SDR — Instagram | Clube do Ingresso" },
      {
        property: "og:description",
        content: "Leads de qualificação do Instagram com assistente de IA e envio ao RD Station CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#270929" },
    ],
  }),
  component: QualificacaoPage,
});

const ROXO = "#270929";
const ROXO_2 = "#3d1240";
const CLARA_IMG = "/clara.png";
const OURO = "#f2b705";
const LOGO =
  "/__l5e/assets-v1/5f8de48d-83ee-4ff3-9093-baae7706ea5a/clube-do-ingresso-logo.png";

type Lead = {
  id: string;
  sdr_key: string;
  username: string;
  nome_empresa: string | null;
  observacoes: string | null;
  seguidores: string | null;
  link_bio: string | null;
  cidade: string | null;
  fit_bio: string | null;
  plataforma_atual: string | null;
  segmento: string | null;
  frequencia: string | null;
  ticketeira_atual: string | null;
  evento_detectado: string | null;
  data_evento: string | null;
  post_preview: string | null;
  rd_integrated_at: string | null;
  rd_manual?: boolean | null;
  rd_manual_at?: string | null;
  is_backlog?: boolean | null;
  icp_status?: string | null;
  disqualified_at?: string | null;
  disqualified_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  synced_at?: string | null;
  origem?: string | null;
  raw?: Record<string, any> | null;
};

const foraIcp = (l: Lead) => l.icp_status === "fora_icp";

/** Telefone do lead pronto para abrir o WhatsApp Web (só dígitos, com DDI 55). */
const whatsAppNumero = (l: Lead): string | null => {
  const bruto = String(l.raw?.["whatsapp_digits"] ?? l.raw?.["whatsapp"] ?? "");
  const d = bruto.replace(/\D+/g, "");
  if (d.length < 10) return null;
  return d.startsWith("55") ? d : `55${d}`;
};

/** Primeira mensagem sugerida na conversa direta com o lead. */
const whatsAppLink = (l: Lead) => {
  const num = whatsAppNumero(l);
  if (!num) return null;
  const nome = l.nome_empresa || `@${l.username}`;
  const texto = `Olá, ${nome}! Sou do Clube do Ingresso. Ajudamos casas de shows e eventos a vender ingressos com taxa justa e repasse rápido. Posso te mostrar como funciona?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};

/** Normaliza texto para busca: minúsculas, sem acentos e sem pontuação. */
const norm = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@._\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const HORAS_NOVO = 72;
/** Só é NOVO o lead populado na planilha depois da carga inicial (backlog). */
const ehNovo = (l: Lead) =>
  !l.is_backlog &&
  !l.rd_integrated_at &&
  !foraIcp(l) &&
  !!l.created_at &&
  Date.now() - new Date(l.created_at).getTime() < HORAS_NOVO * 3600 * 1000;

const TZ = "America/Sao_Paulo";

/** Dias completos entre a data e hoje, contados no fuso de São Paulo. */
const diaSP = (iso: string) =>
  new Date(new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ })).getTime();

const dias = (iso?: string | null) =>
  iso ? Math.max(0, Math.round((diaSP(new Date().toISOString()) - diaSP(iso)) / 86400000)) : null;

const fmtDT = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";


type Msg = { id: string; role: string; content: string; created_at: string };

const CAMPOS: Array<[keyof Lead, string]> = [
  ["nome_empresa", "Nome / Empresa"],
  ["cidade", "Cidade"],
  ["segmento", "Segmento"],
  ["seguidores", "Seguidores"],
  ["fit_bio", "Fit de bio"],
  ["plataforma_atual", "Plataforma atual"],
  ["frequencia", "Frequência"],
  ["ticketeira_atual", "Ticketeira atual"],
  ["evento_detectado", "Evento detectado"],
  ["data_evento", "Data do evento"],
  ["observacoes", "Observações"],
  ["post_preview", "Pré-visualização do post"],
];

type Ordem =
  | "recentes"
  | "criacao-desc"
  | "criacao-asc"
  | "interacao-desc"
  | "interacao-asc"
  | "atualizacao-desc"
  | "atualizacao-asc"
  | "username-asc";

const ORDEM_OPÇÕES: Array<[Ordem, string]> = [
  ["recentes", "Padrão: novos primeiro"],
  ["criacao-desc", "Criação: mais recentes primeiro"],
  ["criacao-asc", "Criação: mais antigos primeiro"],
  ["interacao-desc", "Última interação: recente primeiro"],
  ["interacao-asc", "Última interação: antiga primeiro"],
  ["atualizacao-desc", "Atualização: recente primeiro"],
  ["atualizacao-asc", "Atualização: antiga primeiro"],
  ["username-asc", "Ordem alfabética (@usuário)"],
];

const ORDEM_CHAVE = "qualificacao.ordem";

// ---------- Filtro de período (seleção única) ----------
type PeriodoKey =
  | "hoje"
  | "ontem"
  | "semana"
  | "semana-anterior"
  | "mes"
  | "mes-anterior"
  | "ano"
  | "personalizado";

const PERIODO_OPÇÕES: Array<[PeriodoKey, string]> = [
  ["hoje", "Hoje"],
  ["ontem", "Ontem"],
  ["semana", "Semana (seg–sex)"],
  ["semana-anterior", "Semana anterior"],
  ["mes", "Mês atual"],
  ["mes-anterior", "Mês anterior"],
  ["ano", "Ano atual"],
  ["personalizado", "Personalizado"],
];

type BaseData = "criacao" | "interacao" | "atualizacao";

const BASE_OPÇÕES: Array<[BaseData, string]> = [
  ["criacao", "Data: criação"],
  ["interacao", "Data: última interação"],
  ["atualizacao", "Data: atualização"],
];

/** Data no formato YYYY-MM-DD no fuso de São Paulo (independe do idioma do navegador). */
const ymdSP = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const ymdAdd = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Dia da semana (0=dom) de uma data YYYY-MM-DD, sem depender do fuso local. */
const dow = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/** Intervalo [início, fim] em YYYY-MM-DD para o período escolhido (seleção única). */
function periodoRange(
  key: PeriodoKey,
  hoje: string,
  de: string,
  ate: string,
): [string, string] | null {
  const diaSemana = dow(hoje);
  const segunda = ymdAdd(hoje, -((diaSemana + 6) % 7));
  if (key === "hoje") return [hoje, hoje];
  if (key === "ontem") return [ymdAdd(hoje, -1), ymdAdd(hoje, -1)];
  if (key === "semana") return [segunda, ymdAdd(segunda, 4)];
  if (key === "semana-anterior") {
    const s = ymdAdd(segunda, -7);
    return [s, ymdAdd(s, 4)];
  }
  if (key === "mes") return [`${hoje.slice(0, 7)}-01`, hoje];
  if (key === "mes-anterior") {
    const primeiro = `${hoje.slice(0, 7)}-01`;
    const fim = ymdAdd(primeiro, -1);
    return [`${fim.slice(0, 7)}-01`, fim];
  }
  if (key === "ano") return [`${hoje.slice(0, 4)}-01-01`, hoje];
  if (key === "personalizado" && de && ate) {
    return de <= ate ? [de, ate] : [ate, de];
  }
  return null;
}

const PERIODO_CHAVE = "qualificacao.periodos";

function QualificacaoPage() {
  const navigate = useNavigate();
  const list = useServerFn(listSdrLeads);
  const sync = useServerFn(syncSdrLeads);
  const interacoes = useServerFn(listLeadInteractions);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [sdrKey, setSdrKey] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visao, setVisao] = useState<string>("");
  const [lastByLead, setLastByLead] = useState<Record<string, string>>({});
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [sdrFiltro, setSdrFiltro] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "recentes" | "novos" | "integrados" | "manuais" | "fora"
  >("todos");
  const [aberto, setAberto] = useState<Lead | null>(null);
  const [modo, setModo] = useState<"detalhe" | "ia">("detalhe");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoKey | null>(null);
  const [baseData, setBaseData] = useState<BaseData>("criacao");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [deTmp, setDeTmp] = useState("");
  const [ateTmp, setAteTmp] = useState("");
  const [aplicadoOk, setAplicadoOk] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await list({ data: visao ? { sdrKey: visao } : {} });
      setLeads((r.leads ?? []) as Lead[]);
      setSdrKey(r.sdrKey ?? null);
      setIsAdmin(!!(r as { isAdmin?: boolean }).isAdmin);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [list, visao]);

  const atualizar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setSyncing(true);
      setErro(null);
      try {
        const r = await sync({ data: visao ? { sdrKey: visao } : {} });
        setLastSync(r.at);
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao sincronizar com o Google Sheets.");
      } finally {
        setSyncing(false);
      }
    },
    [sync, carregar, visao],
  );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => void atualizar(true), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [atualizar]);

  // Restaura ordenação e períodos escolhidos (depois da hidratação, sem mismatch de SSR).
  useEffect(() => {
    const salvo = window.localStorage.getItem(ORDEM_CHAVE) as Ordem | null;
    if (salvo && ORDEM_OPÇÕES.some(([o]) => o === salvo)) setOrdem(salvo);
    try {
      const p = JSON.parse(window.localStorage.getItem(PERIODO_CHAVE) ?? "null");
      if (p) {
        // Migração de versões antigas (múltipla seleção): mantém o primeiro período salvo.
        const salvoKey = Array.isArray(p.periodos) ? p.periodos[0] : p.periodo;
        if (typeof salvoKey === "string" && PERIODO_OPÇÕES.some(([o]) => o === salvoKey)) {
          setPeriodo(salvoKey as PeriodoKey);
        }
        if (typeof p.de === "string") {
          setDe(p.de);
          setDeTmp(p.de);
        }
        if (typeof p.ate === "string") {
          setAte(p.ate);
          setAteTmp(p.ate);
        }
        if (BASE_OPÇÕES.some(([b]) => b === p.baseData)) setBaseData(p.baseData);
      }
    } catch {
      /* preferência inválida: mantém o padrão */
    }
  }, []);

  // Não grava no primeiro render para não sobrescrever a preferência restaurada logo acima.
  const primeiroRenderPeriodo = useRef(true);
  useEffect(() => {
    if (primeiroRenderPeriodo.current) {
      primeiroRenderPeriodo.current = false;
      return;
    }
    window.localStorage.setItem(PERIODO_CHAVE, JSON.stringify({ periodo, de, ate, baseData }));
  }, [periodo, de, ate, baseData]);

  // Aplica o período personalizado escolhido (botão Aplicar ou Enter nos campos de data).
  const aplicarPersonalizado = useCallback(() => {
    if (!deTmp || !ateTmp) return;
    setPeriodo("personalizado");
    setDe(deTmp);
    setAte(ateTmp);
    setAplicadoOk(true);
    window.setTimeout(() => setAplicadoOk(false), 2500);
  }, [deTmp, ateTmp]);

  // Persiste a ordenação e busca as últimas interações quando ordenação/filtro usam esse critério.
  useEffect(() => {
    window.localStorage.setItem(ORDEM_CHAVE, ordem);
    if (ordem === "interacao-desc" || ordem === "interacao-asc" || baseData === "interacao") {
      interacoes()
        .then((r) => setLastByLead((r.lastByLead ?? {}) as Record<string, string>))
        .catch(() => setLastByLead({}));
    }
  }, [ordem, baseData, interacoes]);

  const sdrsDisponiveis = useMemo(
    () => Array.from(new Set(leads.map((l) => (l.sdr_key ?? "").trim()).filter(Boolean))).sort(),
    [leads],
  );

  const filtrados = useMemo(() => {
    // Busca sem acento/caixa e por termos independentes (todos precisam bater).
    const termos = norm(busca).split(/\s+/).filter(Boolean);
    // Período único escolhido; nenhum período = sem recorte de data.
    const hojeYmd = ymdSP(new Date().toISOString());
    const range = periodo ? periodoRange(periodo, hojeYmd, de, ate) : null;
    const dataDoLead = (l: Lead) =>
      baseData === "interacao"
        ? ymdSP(lastByLead[l.id])
        : baseData === "atualizacao"
          ? ymdSP(l.updated_at ?? l.created_at)
          : ymdSP(l.created_at);
    const base = leads.filter((l) => {
      if (sdrFiltro && (l.sdr_key ?? "") !== sdrFiltro) return false;
      if (range) {
        const d = dataDoLead(l);
        if (!d || !(d >= range[0] && d <= range[1])) return false;
      }
      if (filtro !== "fora" && filtro !== "todos" && foraIcp(l)) return false;
      if (filtro === "fora" && !foraIcp(l)) return false;
      if (filtro === "recentes" && !ehNovo(l)) return false;
      if (filtro === "novos" && (l.rd_integrated_at || foraIcp(l))) return false;
      if (filtro === "integrados" && (!l.rd_integrated_at || l.rd_manual)) return false;
      if (filtro === "manuais" && !l.rd_manual) return false;
      if (!termos.length) return true;
      const alvo = norm(
        [
          l.username,
          l.nome_empresa,
          l.cidade,
          l.segmento,
          l.evento_detectado,
          l.sdr_key,
          l.observacoes,
          l.plataforma_atual,
          l.ticketeira_atual,
          l.fit_bio,
          l.link_bio,
          l.post_preview,
          String(l.raw?.["whatsapp"] ?? ""),
          String(l.raw?.["telefone"] ?? ""),
          String(l.raw?.["email"] ?? ""),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return termos.every((t) => alvo.includes(t));
    });
    const t = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
    // Ordenação escolhida pelo usuário. No padrão, leads novos vêm primeiro (comportamento de hoje);
    // leads sem data de interação ficam no fim quando a ordenação é por interação.
    const cmp = (a: Lead, b: Lead) => {
      switch (ordem) {
        case "criacao-desc":
          return t(b.created_at) - t(a.created_at);
        case "criacao-asc":
          return t(a.created_at) - t(b.created_at);
        case "interacao-desc":
        case "interacao-asc": {
          const ia = lastByLead[a.id];
          const ib = lastByLead[b.id];
          if (!ia && !ib) return 0;
          if (!ia) return 1; // sem interação vai para o fim
          if (!ib) return -1;
          return ordem === "interacao-desc" ? t(ib) - t(ia) : t(ia) - t(ib);
        }
        case "atualizacao-desc":
          return t(b.updated_at) - t(a.updated_at);
        case "atualizacao-asc":
          return t(a.updated_at) - t(b.updated_at);
        case "username-asc":
          return (a.username ?? "").localeCompare(b.username ?? "", "pt-BR");
        default: {
          const na = ehNovo(a) ? 1 : 0;
          const nb = ehNovo(b) ? 1 : 0;
          if (na !== nb) return nb - na;
          return t(b.created_at) - t(a.created_at);
        }
      }
    };
    return base.sort(cmp);
  }, [leads, busca, filtro, sdrFiltro, ordem, lastByLead, periodo, de, ate, baseData]);

  // Escopo dos indicadores do cabeçalho: respeita SDR, período e busca
  // (independe do chip de status, para mostrar os totais de cada situação no recorte ativo).
  const escopo = useMemo(() => {
    const termos = norm(busca).split(/\s+/).filter(Boolean);
    const hojeYmd = ymdSP(new Date().toISOString());
    const range = periodo ? periodoRange(periodo, hojeYmd, de, ate) : null;
    const dataDoLead = (l: Lead) =>
      baseData === "interacao"
        ? ymdSP(lastByLead[l.id])
        : baseData === "atualizacao"
          ? ymdSP(l.updated_at ?? l.created_at)
          : ymdSP(l.created_at);
    return leads.filter((l) => {
      if (sdrFiltro && (l.sdr_key ?? "") !== sdrFiltro) return false;
      if (range) {
        const d = dataDoLead(l);
        if (!d || !(d >= range[0] && d <= range[1])) return false;
      }
      if (!termos.length) return true;
      const alvo = norm(
        [
          l.username,
          l.nome_empresa,
          l.cidade,
          l.segmento,
          l.evento_detectado,
          l.sdr_key,
          l.observacoes,
          l.plataforma_atual,
          l.ticketeira_atual,
          l.fit_bio,
          l.link_bio,
          l.post_preview,
          String(l.raw?.["whatsapp"] ?? ""),
          String(l.raw?.["telefone"] ?? ""),
          String(l.raw?.["email"] ?? ""),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return termos.every((t) => alvo.includes(t));
    });
  }, [leads, busca, sdrFiltro, periodo, de, ate, baseData, lastByLead]);
  const desqualificados = escopo.filter(foraIcp).length;
  const ativos = escopo.filter((l) => !foraIcp(l));
  const integrados = ativos.filter((l) => l.rd_integrated_at && !l.rd_manual).length;
  const manuais = ativos.filter((l) => l.rd_manual).length;
  const naoIntegrados = ativos.filter((l) => !l.rd_integrated_at).length;
  const novos = escopo.filter(ehNovo).length;



  return (
    <div style={{ minHeight: "100dvh", background: "#f5f2f6", color: "#1a1020" }}>
      <header
        style={{
          background: `linear-gradient(135deg, ${ROXO}, ${ROXO_2})`,
          color: "#fff",
          padding: "14px 16px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate({ to: "/" })}
            style={{
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.25)",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Voltar à página inicial do painel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Painel
          </button>
          <img src={LOGO} alt="Clube do Ingresso" style={{ height: 34, width: "auto" }} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Qualificação SDR</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Instagram Oficial{" "}
              {isAdmin
                ? `· ${visao ? (visao === "laysla" ? "Laysla" : "Danilo") : "Todos os SDRs"}`
                : sdrKey
                  ? `· ${sdrKey === "laysla" ? "Laysla" : "Danilo"}`
                  : ""}
            </div>
          </div>
          {isAdmin && (
            <select
              value={visao}
              onChange={(e) => {
                setLoading(true);
                setVisao(e.target.value);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.3)",
                background: "rgba(255,255,255,.12)",
                color: "#fff",
                fontSize: 13,
              }}
            >
              <option value="" style={{ color: "#222" }}>
                Todos os SDRs
              </option>
              <option value="laysla" style={{ color: "#222" }}>
                Laysla
              </option>
              <option value="danilo" style={{ color: "#222" }}>
                Danilo
              </option>
            </select>
          )}
          {isAdmin && (
            <button
              onClick={() => void atualizar()}
              disabled={syncing}
              style={btn(OURO, "#2a1a00")}
            >
              {syncing ? "Atualizando…" : "Atualizar"}
            </button>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            style={btn("rgba(255,255,255,.14)", "#fff")}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        {erro && (
          <div
            style={{
              background: "#fdecec",
              border: "1px solid #f3b9b9",
              color: "#8a1f1f",
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {erro}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          <Card titulo="Leads" valor={String(escopo.length)} />
          <Card titulo="Novos" valor={String(novos)} />
          <Card titulo="Não integrados" valor={String(naoIntegrados)} />
          <Card titulo="Integrados" valor={String(integrados)} />
          <Card titulo="Integrados manualmente" valor={String(manuais)} />
          <Card titulo="Fora do ICP" valor={String(desqualificados)} />
          {isAdmin && (
            <Card
              titulo="Última sincronização"
              valor={lastSync ? new Date(lastSync).toLocaleTimeString("pt-BR", { timeZone: TZ }) : "—"}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, margin: "14px 0", flexWrap: "wrap" }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por @usuário, empresa, cidade, evento…"
            style={{
              flex: "1 1 220px",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd6de",
              fontSize: 14,
              background: "#fff",
            }}
          />
          {(
            [
              ["todos", "Todos"],
              ["recentes", `Novos${novos ? ` (${novos})` : ""}`],
              ["novos", `Não integrados${naoIntegrados ? ` (${naoIntegrados})` : ""}`],
              ["integrados", `Integrados${integrados ? ` (${integrados})` : ""}`],
              ["manuais", `Integrados manualmente${manuais ? ` (${manuais})` : ""}`],
              ["fora", `Fora do ICP${desqualificados ? ` (${desqualificados})` : ""}`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={
                f === "fora"
                  ? btn(filtro === f ? "#b42318" : "#fee4e2", filtro === f ? "#fff" : "#b42318", true)
                  : btn(filtro === f ? ROXO : "#fff", filtro === f ? "#fff" : ROXO, true)
              }
            >
              {label}
            </button>
          ))}
          <select
            value={sdrFiltro}
            onChange={(e) => setSdrFiltro(e.target.value)}
            title="Filtrar por SDR responsável"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${ROXO}`,
              background: "#fff",
              color: ROXO,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <option value="">SDR: todos</option>
            {sdrsDisponiveis.map((s) => (
              <option key={s} value={s}>
                SDR: {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            title="Organizar a lista: por data de criação, última interação, atualização ou ordem alfabética"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${ROXO}`,
              background: "#fff",
              color: ROXO,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {ORDEM_OPÇÕES.map(([o, label]) => (
              <option key={o} value={o}>
                {label}
              </option>
            ))}
          </select>
          {(sdrKey || isAdmin) && (
            <button
              onClick={() => setNovoAberto(true)}
              style={btn("#fff", ROXO)}
              title="Cadastrar um lead manualmente na sua fila de qualificação"
            >
              + Cadastrar lead manualmente
            </button>
          )}
        </div>

        {/* Filtro de período com múltipla seleção (união dos intervalos escolhidos). */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            margin: "0 0 14px",
            padding: 10,
            border: "1px solid #eadfee",
            borderRadius: 12,
            background: "#fbf8fc",
          }}
        >
          <strong style={{ fontSize: 12, color: "#6b5a70", textTransform: "uppercase" }}>
            Período
          </strong>
          <select
            value={baseData}
            onChange={(e) => setBaseData(e.target.value as BaseData)}
            title="Qual data será usada no filtro de período"
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${ROXO}`,
              background: "#fff",
              color: ROXO,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {BASE_OPÇÕES.map(([b, label]) => (
              <option key={b} value={b}>
                {label}
              </option>
            ))}
          </select>
          {PERIODO_OPÇÕES.map(([p, label]) => {
            const ativo = periodo === p;
            return (
              <button
                key={p}
                onClick={() => {
                  if (ativo) {
                    setPeriodo(null);
                    setDeTmp(de);
                    setAteTmp(ate);
                  } else {
                    setPeriodo(p);
                    if (p === "personalizado") {
                      setDeTmp(de);
                      setAteTmp(ate);
                    }
                  }
                }}
                title="Escolha um período por vez"
                style={{
                  ...btn(ativo ? ROXO : "#fff", ativo ? "#fff" : ROXO, true),
                  fontSize: 12,
                  padding: "7px 11px",
                }}
              >
                {ativo ? "✓ " : ""}
                {label}
              </button>
            );
          })}
          {periodo === "personalizado" && (
            <>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                <input
                  type="date"
                  value={deTmp}
                  onChange={(e) => setDeTmp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") aplicarPersonalizado();
                  }}
                  style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid #ddd6de" }}
                />
                <span style={{ color: "#6b5a70" }}>até</span>
                <input
                  type="date"
                  value={ateTmp}
                  onChange={(e) => setAteTmp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") aplicarPersonalizado();
                  }}
                  style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid #ddd6de" }}
                />
              </span>
              <button
                type="button"
                onClick={aplicarPersonalizado}
                disabled={!deTmp || !ateTmp}
                title="Aplicar o intervalo escolhido"
                style={{
                  ...btn(OURO, "#2a1a00", true),
                  fontSize: 12,
                  padding: "7px 11px",
                  opacity: deTmp && ateTmp ? 1 : 0.5,
                  cursor: deTmp && ateTmp ? "pointer" : "not-allowed",
                }}
              >
                Aplicar
              </button>
              {aplicadoOk && de && ate && (
                <span style={{ fontSize: 12, color: "#1c7a3f", fontWeight: 600 }}>
                  ✓ Período aplicado
                </span>
              )}
            </>
          )}
          {periodo && (
            <>
              <button
                onClick={() => {
                  setPeriodo(null);
                  setDe("");
                  setAte("");
                  setDeTmp("");
                  setAteTmp("");
                }}
                style={{ ...btn("#fff", "#6b5a70", true), fontSize: 12, padding: "7px 11px" }}
              >
                Limpar período
              </button>
              <span style={{ fontSize: 12, color: "#6b5a70" }}>
                {filtrados.length} lead(s) no período selecionado
                {periodo === "personalizado" && (!de || !ate)
                  ? " — informe as duas datas e clique em Aplicar"
                  : ""}
              </span>
            </>
          )}
        </div>




        {loading ? (
          <p style={{ color: "#6b5a70" }}>Carregando leads…</p>
        ) : !sdrKey && !isAdmin ? (
          <p style={{ color: "#6b5a70" }}>
            Seu usuário ainda não está vinculado a uma aba de qualificação. Peça ao administrador para
            vincular seu acesso.
          </p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: "#6b5a70" }}>
            {filtro === "recentes"
              ? "Nenhum lead novo encontrado nas últimas 72 horas."
              : "Nenhum lead encontrado para os filtros selecionados."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtrados.map((l) => (
              <article
                key={l.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e8e1ea",
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: "0 1px 2px rgba(39,9,41,.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: ROXO }}>@{l.username}</div>
                    <div style={{ fontSize: 13, color: "#584a5c" }}>
                      {l.nome_empresa || "—"} {l.cidade ? `· ${l.cidade}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b5a70", marginTop: 4 }}>
                      SDR responsável:{" "}
                      <strong style={{ color: ROXO }}>
                        {l.sdr_key === "laysla" ? "Laysla" : l.sdr_key === "danilo" ? "Danilo" : l.sdr_key || "—"}
                      </strong>{" "}
                      · Fonte:{" "}
                      {l.origem === "manual"
                        ? "Cadastro manual do SDR"
                        : "Prospecção automatizada Instagram"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b5a70", marginTop: 4 }}>
                      Entrou na fila: <strong>{fmtDT(l.created_at)}</strong>
                      {l.data_evento ? (
                        <>
                          {" · "}Data do evento: <strong>{l.data_evento}</strong>
                        </>
                      ) : null}
                      {" · "}
                      {l.rd_integrated_at ? (
                        <>
                          Integrado em <strong style={{ color: "#1c7a3f" }}>{fmtDT(l.rd_integrated_at)}</strong>
                          {(() => {
                            const d0 = dias(l.created_at);
                            const d1 = dias(l.rd_integrated_at);
                            return d0 !== null && d1 !== null
                              ? ` (${Math.max(0, d0 - d1)} dia(s) até trabalhar)`
                              : "";
                          })()}
                        </>
                      ) : (
                        <span style={{ color: (dias(l.created_at) ?? 0) >= 3 ? "#8a1f1f" : "#8a6a06" }}>
                          Aguardando integração há {dias(l.created_at) ?? 0} dia(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {ehNovo(l) && <span style={tag("#e8f0ff", "#1b4bb8")}>NOVO</span>}
                    {foraIcp(l) ? (
                      <span style={tag("#fee4e2", "#b42318")}>● Fora do ICP</span>
                    ) : l.rd_manual ? (
                      <span style={tag("#eef6ff", "#1b4bb8")}>Integrado manualmente</span>
                    ) : l.rd_integrated_at ? (
                      <span style={tag("#e7f6ec", "#1c7a3f")}>No RD Station</span>
                    ) : (
                      <span style={tag("#fdf3d9", "#8a6a06")}>Pendente</span>
                    )}
                  </div>
                </div>

                {foraIcp(l) && l.disqualified_reason && (
                  <div style={{ fontSize: 12, color: "#8a1f1f", marginTop: 8 }}>
                    Motivo: {l.disqualified_reason}
                  </div>
                )}


                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={() => { setAberto(l); setModo("detalhe"); }} style={btn("#f3eef4", ROXO, true)}>
                    Ver dados
                  </button>
                  <button onClick={() => { setAberto(l); setModo("ia"); }} style={btn(ROXO, "#fff", true)}>
                    Clara IA
                  </button>
                  {!foraIcp(l) && <IntegrarBtn lead={l} onDone={carregar} />}
                  <IcpBtn lead={l} onDone={carregar} />
                  {!foraIcp(l) && <ManualBtn lead={l} onDone={carregar} />}
                  {/* Quando a planilha não traz o link da bio, cai para o perfil do Instagram. */}
                  <a
                    href={l.link_bio || `https://instagram.com/${String(l.username).replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...btn("#fff", ROXO, true), textDecoration: "none" }}
                  >
                    {l.link_bio ? "Link da bio" : "Ver perfil"}
                  </a>
                  {l.post_preview && (
                    <a href={l.post_preview} target="_blank" rel="noreferrer" style={{ ...btn("#fff", ROXO, true), textDecoration: "none" }}>
                      Ver post
                    </a>
                  )}
                  {/* Conversa direta pelo WhatsApp Web quando o lead tem número. */}
                  {whatsAppLink(l) && (
                    <a
                      href={whatsAppLink(l)!}
                      target="_blank"
                      rel="noreferrer"
                      title={`Falar com ${l.nome_empresa || "@" + l.username} no WhatsApp (${l.raw?.["whatsapp"] ?? ""})`}
                      style={{ ...btn("#25D366", "#0b3d1e", true), textDecoration: "none" }}
                    >
                      WhatsApp
                    </a>
                  )}
                  <span
                    title="SDR responsável pelo lead (enviado ao RD Station)"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#f3eef4",
                      color: ROXO,
                      border: `1px solid ${ROXO}22`,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    SDR: {l.sdr_key === "laysla" ? "Laysla" : l.sdr_key === "danilo" ? "Danilo" : l.sdr_key || "—"}
                  </span>

                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {aberto && (
        <Drawer lead={aberto} modo={modo} setModo={setModo} onClose={() => setAberto(null)} onDone={carregar} />
      )}

      {novoAberto && (
        <NovoLeadModal
          isAdmin={isAdmin}
          sdrKey={sdrKey}
          visao={visao}
          onClose={() => setNovoAberto(false)}
          onDone={carregar}
        />
      )}
    </div>
  );
}

const CAMPOS_NOVO: Array<[string, string, string]> = [
  ["username", "@usuário do Instagram *", "ex.: produtoraxyz"],
  ["nome_empresa", "Nome / Empresa", "Nome usado na oportunidade do RD CRM"],
  ["cidade", "Cidade", "ex.: Goiânia - GO"],
  ["segmento", "Segmento", "ex.: casa de show, festival, atlética"],
  ["seguidores", "Seguidores", "ex.: 12.400"],
  ["link_bio", "Link da bio", "https://…"],
  ["fit_bio", "Fit de bio", "O que a bio indica"],
  ["plataforma_atual", "Plataforma atual", "ex.: Sympla, própria, Pix/WhatsApp"],
  ["ticketeira_atual", "Ticketeira atual", "ex.: Ingresse"],
  ["frequencia", "Frequência", "ex.: eventos semanais"],
  ["evento_detectado", "Evento detectado", "ex.: Festival de Verão"],
  ["data_evento", "Data do evento", "ex.: 20/10/2026"],
];

function NovoLeadModal({
  isAdmin,
  sdrKey,
  visao,
  onClose,
  onDone,
}: {
  isAdmin: boolean;
  sdrKey: string | null;
  visao: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const criar = useServerFn(createSdrLead);
  const [form, setForm] = useState<Record<string, string>>({});
  const [dono, setDono] = useState<string>(visao || sdrKey || "danilo");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    setErro(null);
    if (!(form["username"] ?? "").trim()) {
      setErro("Informe o @usuário do Instagram do lead.");
      return;
    }
    setSalvando(true);
    try {
      await criar({ data: { ...form, username: form["username"]!, ...(isAdmin ? { sdrKey: dono } : {}) } as never });
      await onDone();
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível cadastrar o lead.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid #ddd6de",
    fontSize: 14,
    background: "#fff",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,6,22,.55)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 720,
          width: "100%",
          padding: 18,
          marginTop: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: ROXO }}>Cadastrar lead manualmente</h2>
          <button onClick={onClose} style={btn("#f1ecf2", ROXO, true)}>
            Fechar
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "#6b5a70", marginTop: 6 }}>
          O lead entra na sua fila de qualificação já vinculado a você, com Clara, link da bio e envio ao RD
          Station CRM disponíveis.
        </p>

        {erro && (
          <div
            style={{
              background: "#fdecec",
              border: "1px solid #f3b9b9",
              color: "#8a1f1f",
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              margin: "10px 0",
            }}
          >
            {erro}
          </div>
        )}

        {isAdmin && (
          <label style={{ display: "block", fontSize: 12.5, color: "#584a5c", marginTop: 10 }}>
            SDR responsável
            <select value={dono} onChange={(e) => setDono(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="danilo">Danilo</option>
              <option value="laysla">Laysla</option>
            </select>
          </label>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          {CAMPOS_NOVO.map(([k, rotulo, ph]) => (
            <label key={k} style={{ fontSize: 12.5, color: "#584a5c" }}>
              {rotulo}
              <input
                value={form[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                placeholder={ph}
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          ))}
        </div>

        {(
          [
            ["observacoes", "Observações"],
            ["post_preview", "Pré-visualização do post / contexto"],
          ] as const
        ).map(([k, rotulo]) => (
          <label key={k} style={{ display: "block", fontSize: 12.5, color: "#584a5c", marginTop: 10 }}>
            {rotulo}
            <textarea
              value={form[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
              rows={3}
              style={{ ...inputStyle, marginTop: 4, resize: "vertical" }}
            />
          </label>
        ))}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={onClose} style={btn("#f1ecf2", ROXO)}>
            Cancelar
          </button>
          <button onClick={() => void salvar()} disabled={salvando} style={btn(ROXO, "#fff")}>
            {salvando ? "Salvando…" : "Cadastrar lead"}
          </button>
        </div>
      </div>
    </div>
  );
}


/** Marca o lead como já integrado manualmente no RD CRM (fora do painel). */
function ManualBtn({ lead, onDone }: { lead: Lead; onDone: () => Promise<void> }) {
  const setManual = useServerFn(setLeadRdManual);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const manual = !!lead.rd_manual;

  async function acionar() {
    if (!manual && !window.confirm(`Confirmar que @${lead.username} já foi integrado manualmente no RD CRM?`)) return;
    setBusy(true);
    setErro(null);
    try {
      await setManual({ data: { leadId: lead.id, manual: !manual } });
      await onDone();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        disabled={busy}
        onClick={() => void acionar()}
        style={btn(manual ? "#eef6ff" : "#fff", manual ? "#1b4bb8" : ROXO, true)}
        title={manual ? `Marcado como manual em ${fmtDT(lead.rd_manual_at)}` : "Já integrei manualmente no RD CRM"}
      >
        {busy ? "Salvando…" : manual ? "Desfazer integração manual" : "Já integrado manualmente"}
      </button>
      {erro && <span style={{ fontSize: 12, color: "#8a1f1f", alignSelf: "center" }}>{erro}</span>}
    </>
  );
}


function IcpBtn({ lead, onDone }: { lead: Lead; onDone: () => Promise<void> }) {
  const setIcp = useServerFn(setLeadIcp);
  const fora = foraIcp(lead);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function acionar() {
    let motivo: string | null = null;
    if (!fora) {
      motivo = window.prompt(
        `Desqualificar @${lead.username} como FORA DO ICP.\nInforme o motivo (opcional):`,
        "",
      );
      if (motivo === null) return;
    }
    setBusy(true);
    setErro(null);
    try {
      await setIcp({ data: { leadId: lead.id, foraIcp: !fora, motivo: motivo ?? "" } });
      await onDone();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar o status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        disabled={busy}
        onClick={() => void acionar()}
        style={btn(fora ? "#fff" : "#fdecec", fora ? ROXO : "#8a1f1f", true)}
        title={fora ? "Devolver o lead para a fila de pendentes" : "Marcar lead como fora do perfil ideal"}
      >
        {busy ? "Salvando…" : fora ? "Reativar lead" : "Fora do ICP"}
      </button>
      {erro && <span style={{ fontSize: 12, color: "#8a1f1f", alignSelf: "center" }}>{erro}</span>}
    </>
  );
}

function IntegrarBtn({ lead, onDone }: { lead: Lead; onDone: () => Promise<void> }) {
  const integrate = useServerFn(integrateLeadRd);
  const [state, setState] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const jaIntegrado = !!lead.rd_integrated_at;

  async function acionar() {
    setConfirmar(false);
    setState("loading");
    setMsg(null);
    try {
      const r = await integrate({ data: { leadId: lead.id, force: jaIntegrado } });
      setMsg(r.already ? "Já integrado anteriormente." : "Enviado ao RD CRM.");
      setState("idle");
      await onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao integrar.");
      setState("err");
    }
  }

  return (
    <>
      <button
        disabled={state === "loading"}
        onClick={() => setConfirmar(true)}
        style={btn(jaIntegrado ? "#fff" : OURO, jaIntegrado ? ROXO : "#2a1a00", true)}
        title={jaIntegrado ? `Integrado em ${fmtDT(lead.rd_integrated_at)}` : "Integrar no RD CRM"}
      >
        {state === "loading"
          ? "Integrando…"
          : jaIntegrado
            ? "Reenviar (já integrado)"
            : "Integrar no RD CRM"}
      </button>
      {msg && <span style={{ fontSize: 12, color: state === "err" ? "#8a1f1f" : "#1c7a3f", alignSelf: "center" }}>{msg}</span>}

      {confirmar && (
        <div
          onClick={() => setConfirmar(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,10,25,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,.25)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: ROXO, marginBottom: 8 }}>
              Integrar no RD CRM
            </div>
            <p style={{ fontSize: 14, color: "#4a3a50", lineHeight: 1.5, margin: 0 }}>
              {jaIntegrado ? (
                <>
                  <strong>@{lead.username}</strong> já foi integrado em {fmtDT(lead.rd_integrated_at)}.
                  Reenviar pode criar um novo registro no CRM. Deseja continuar?
                </>
              ) : (
                <>
                  Confirmar o envio de <strong>@{lead.username}</strong> para o RD CRM com a fonte
                  “Prospecção automatizada Instagram”?
                </>
              )}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setConfirmar(false)} style={btn("#fff", ROXO, true)}>
                Cancelar
              </button>
              <button onClick={() => void acionar()} style={btn(OURO, "#2a1a00", true)}>
                {jaIntegrado ? "Reenviar mesmo assim" : "Confirmar integração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



function Drawer({
  lead,
  modo,
  setModo,
  onClose,
  onDone,
}: {
  lead: Lead;
  modo: "detalhe" | "ia";
  setModo: (m: "detalhe" | "ia") => void;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const getChat = useServerFn(getLeadChat);
  const send = useServerFn(sendLeadChat);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [iaModo, setIaModo] = useState<"completo" | "rapido">("completo");
  const [copiado, setCopiado] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modo !== "ia") return;
    void (async () => {
      try {
        const r = await getChat({ data: { leadId: lead.id } });
        setMsgs((r.messages ?? []) as Msg[]);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao abrir a conversa.");
      }
    })();
  }, [modo, lead.id, getChat]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (modo === "ia" && !enviando) inputRef.current?.focus();
  }, [modo, enviando]);

  async function enviar(pergunta: string) {
    if (!pergunta.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    const otim: Msg = { id: `t-${Date.now()}`, role: "user", content: pergunta, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, otim]);
    setTexto("");
    try {
      const r = await send({ data: { leadId: lead.id, message: pergunta, mode: iaModo } });
      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: r.answer, created_at: new Date().toISOString() }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A IA não respondeu. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  /** Extrai só a mensagem pronta para envio de uma resposta do assistente. */
  function mensagemDe(content: string) {
    const m = content.match(/MENSAGEM(?: RECOMENDADA)?:?\s*\n?([\s\S]*?)(?:\n\s*(?:OBJETIVO|POR QUE ESTA ABORDAGEM|PRÓXIMA AÇÃO|PROXIMA ACAO)\b|$)/i);
    const t = (m?.[1] ?? "").trim();
    return t && t.toLowerCase() !== "sem abordagem recomendada" ? t : null;
  }

  async function copiar(id: string, txt: string) {
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      /* clipboard indisponível */
    }
  }

  const SUGESTOES = [
    "Analise este lead e monte a primeira abordagem no Direct.",
    "Ele visualizou e não respondeu há 3 dias. Qual a próxima melhor ação?",
    "Ele disse que já usa outra ticketeira. Como conduzo?",
    "Ele perguntou qual é a taxa. O que respondo?",
    "Prepare um follow-up curto com um novo contexto.",
    "Vale pedir reunião agora ou ainda é cedo? Justifique.",
  ];
  const RESULTADOS: Array<[string, string]> = [
    ["Respondeu", "Registro de resultado: o lead RESPONDEU (REPLY). Ajuste a estratégia e me diga o próximo passo."],
    ["Sem resposta", "Registro de resultado: NO_REPLY até agora. Quando e como faço o próximo follow-up?"],
    ["Objeção", "Registro de resultado: o lead levantou uma OBJEÇÃO. Vou colar o que ele disse a seguir; me oriente."],
    ["Reunião", "Registro de resultado: REUNIÃO agendada. Como me preparo e o que devo descobrir nela?"],
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,6,22,.55)", zIndex: 40, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "min(720px,100%)",
          maxHeight: "92dvh",
          borderRadius: "18px 18px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background:
              modo === "ia" ? "linear-gradient(135deg,#270929,#4A1550)" : ROXO,
            color: "#fff",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {modo === "ia" ? (
            <img
              src={CLARA_IMG}
              alt="Clara, assistente do Clube do Ingresso"
              style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", background: "#fff" }}
            />
          ) : (
            <img src={LOGO} alt="" style={{ height: 24 }} />
          )}
          <div style={{ flex: 1 }}>
            {modo === "ia" ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Clara</div>
                <div style={{ fontSize: 12, color: "#D9C7DD" }}>
                  Assistente do Clube do Ingresso · @{lead.username}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 14 }}>@{lead.username}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{lead.nome_empresa || "—"}</div>
              </>
            )}
          </div>
          <button onClick={onClose} style={btn("rgba(255,255,255,.15)", "#fff", true)}>Fechar</button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
          {(["detalhe", "ia"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              style={{
                flex: 1,
                padding: 12,
                border: "none",
                background: modo === m ? "#f6f1f7" : "#fff",
                color: modo === m ? ROXO : "#7a6b7e",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {m === "detalhe" ? "Dados do lead" : "Clara · Assistente IA"}
            </button>
          ))}
        </div>

        {modo === "detalhe" ? (
          <div style={{ padding: 14, overflowY: "auto" }}>
            <dl style={{ display: "grid", gap: 10, margin: 0 }}>
              <Campo rotulo="Username" valor={`@${lead.username}`} />
              {lead.link_bio && (
                <div>
                  <dt style={dtS}>Link da bio</dt>
                  <dd style={{ margin: 0 }}>
                    <a href={lead.link_bio} target="_blank" rel="noreferrer" style={{ color: ROXO, fontSize: 14 }}>
                      {lead.link_bio}
                    </a>
                  </dd>
                </div>
              )}
              {CAMPOS.map(([k, rotulo]) => (
                <Campo key={String(k)} rotulo={rotulo} valor={(lead[k] as string) || "—"} />
              ))}
            </dl>
            <div style={{ marginTop: 14 }}>
              <IntegrarBtn lead={lead} onDone={onDone} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderBottom: "1px solid #eee", background: "#fff", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#8a7a8e", marginRight: 4 }}>Modo</span>
              {(["completo", "rapido"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setIaModo(m)}
                  style={{
                    ...btn(iaModo === m ? ROXO : "#f6f1f7", iaModo === m ? "#fff" : ROXO, true),
                    padding: "5px 10px",
                    fontSize: 12,
                  }}
                >
                  {m === "completo" ? "Resposta completa" : "Mensagem rápida"}
                </button>
              ))}
              <span style={{ fontSize: 11, color: "#8a7a8e", marginLeft: "auto" }}>
                {iaModo === "rapido" ? "Só a mensagem pronta + próxima ação" : "Diagnóstico, mensagem e próxima ação"}
              </span>
            </div>
            <div style={{ padding: 14, overflowY: "auto", flex: 1, background: "#faf8fb" }}>
              {msgs.length === 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <img
                      src={CLARA_IMG}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover", flexShrink: 0, marginTop: 2 }}
                    />
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #ece5ee",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontSize: 14,
                        color: "#26192a",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {`Olá! Eu sou a Clara 👋\nJá estou com o perfil de @${lead.username} em mãos — analiso segmento, evento, timing, plataforma e situação no CRM antes de sugerir qualquer mensagem.\nComo posso ajudar agora?`}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUGESTOES.map((s) => (
                      <button
                        key={s}
                        onClick={() => void enviar(s)}
                        style={{
                          background: "#F3ECF5",
                          color: "#4A1550",
                          border: "1px solid #E6D9EA",
                          borderRadius: 999,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m) => {
                const pronta = m.role === "assistant" ? mensagemDe(m.content) : null;
                return (
                  <div
                    key={m.id}
                    style={{
                      margin: "8px 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", maxWidth: "92%" }}>
                      {m.role === "assistant" && (
                        <img
                          src={CLARA_IMG}
                          alt=""
                          style={{ width: 26, height: 26, borderRadius: 999, objectFit: "cover", flexShrink: 0, marginTop: 2 }}
                        />
                      )}
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: m.role === "user" ? ROXO : "#fff",
                          color: m.role === "user" ? "#fff" : "#26192a",
                          border: m.role === "user" ? "none" : "1px solid #ece5ee",
                          fontSize: 14,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                    {m.role === "assistant" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 4, marginLeft: 34 }}>
                        {pronta && (
                          <button type="button" onClick={() => void copiar(`${m.id}-msg`, pronta)} style={{ ...btn("#fff", ROXO, true), padding: "4px 8px", fontSize: 11 }}>
                            {copiado === `${m.id}-msg` ? "Mensagem copiada ✓" : "Copiar mensagem"}
                          </button>
                        )}
                        <button type="button" onClick={() => void copiar(m.id, m.content)} style={{ ...btn("#f6f1f7", "#6b5a70", true), padding: "4px 8px", fontSize: 11 }}>
                          {copiado === m.id ? "Copiado ✓" : "Copiar tudo"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {enviando && <p style={{ fontSize: 13, color: "#6b5a70" }}>Clara está analisando o lead e a melhor próxima ação…</p>}
              {erro && <p style={{ fontSize: 13, color: "#8a1f1f" }}>{erro}</p>}
              <div ref={fim} />
            </div>
            {msgs.length > 0 && (
              <div style={{ display: "flex", gap: 6, padding: "8px 12px 0", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#8a7a8e" }}>Registrar resultado:</span>
                {RESULTADOS.map(([rotulo, prompt]) => (
                  <button key={rotulo} type="button" disabled={enviando} onClick={() => void enviar(prompt)} style={{ ...btn("#f6f1f7", ROXO, true), padding: "4px 10px", fontSize: 12 }}>
                    {rotulo}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enviar(texto);
              }}
              style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #eee" }}
            >
              <input
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={iaModo === "rapido" ? "Ex.: mensagem de follow-up no WhatsApp…" : "Escreva para a Clara…"}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd6de", fontSize: 14 }}
              />
              <button type="submit" disabled={enviando} style={btn(ROXO, "#fff", true)}>
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const dtS: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#8a7a8e" };

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt style={dtS}>{rotulo}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: "#26192a", whiteSpace: "pre-wrap" }}>{valor}</dd>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e1ea", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#8a7a8e" }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: ROXO }}>{valor}</div>
    </div>
  );
}

function btn(bg: string, fg: string, small = false): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    border: bg === "#fff" ? "1px solid #ddd6de" : "none",
    borderRadius: 10,
    padding: small ? "8px 12px" : "9px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function tag(bg: string, fg: string): React.CSSProperties {
  return { background: bg, color: fg, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, height: "fit-content" };
}
