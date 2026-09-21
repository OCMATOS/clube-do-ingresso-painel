export const PANELS = [
  { key: "resumo", label: "Resumo executivo" },
  { key: "evolucao", label: "Evolução & comparador" },
  { key: "geracao", label: "Geração diária" },
  { key: "performance", label: "CLUBE DOS CAMPEÕES" },
  { key: "mercado", label: "Inteligência de mercado" },
  { key: "perdas", label: "Perdas & qualidade" },
  { key: "base", label: "Base detalhada" },
  { key: "gerencial", label: "Gerencial Comercial" },
  { key: "agencia", label: "Análise da Agência" },
  { key: "fechamento", label: "Insights do Clube" },
  { key: "churn", label: "Visão de Churn" },
  { key: "nfr", label: "Negócios Fechados × Realizados" },
] as const;

export type PanelKey = (typeof PANELS)[number]["key"];
