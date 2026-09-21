import { createFileRoute } from "@tanstack/react-router";

type ClaraMessage = { role: "user" | "assistant"; content: string };

type ClaraRequest = {
  messages?: ClaraMessage[];
  context?: string;
  mode?: "chat" | "alerts";
};

const SYSTEM_BASE = `Você é a Clara, assistente inteligente do Clube do Ingresso, embarcada no Painel Executivo CRM.

Regras:
- Responda sempre em português do Brasil, de forma direta, executiva e acionável.
- Você recebe um SNAPSHOT com os dados reais do painel (agregados + o que está visível na aba atual). Use SOMENTE esses números. Nunca invente valores.
- Se um dado não estiver no snapshot, diga que não está no recorte atual e sugira qual filtro/aba abrir.
- Formate valores em R$ com separador brasileiro e percentuais com 1 casa.
- Prefira respostas curtas com bullets, destacando: o que aconteceu, por que importa, o que fazer agora.
- Você conhece SDRs (Danilo, Laysla, Lucas, Tarciso), funis, fontes, etapas, motivos de perda, churn e a aba Negócios Fechados × Realizados.`;

const SYSTEM_ALERTS = `${SYSTEM_BASE}

MODO ALERTA: analise o snapshot e devolva APENAS um JSON válido, sem markdown:
{"alerts":[{"level":"critico|atencao|info","title":"curto","detail":"1-2 frases com números","action":"ação recomendada"}]}
Máximo 5 alertas, priorize risco de receita, queda de conversão, SDR sem geração, motivos de perda em alta e churn.`;

export const Route = createFileRoute("/api/clara")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "IA não configurada." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: ClaraRequest;
        try {
          body = (await request.json()) as ClaraRequest;
        } catch {
          return new Response(JSON.stringify({ error: "Requisição inválida." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const history = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
        const alerts = body.mode === "alerts";
        const context = (body.context ?? "").slice(0, 60000);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            stream: !alerts,
            messages: [
              { role: "system", content: alerts ? SYSTEM_ALERTS : SYSTEM_BASE },
              { role: "system", content: `SNAPSHOT DO PAINEL (dados reais, agora):\n${context}` },
              ...history,
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          const msg =
            res.status === 429
              ? "Muitas solicitações agora. Tente de novo em instantes."
              : res.status === 402
                ? "Os créditos de IA do workspace acabaram. Adicione créditos para continuar usando a Clara."
                : `Falha na IA (${res.status}). ${detail.slice(0, 300)}`;
          return new Response(JSON.stringify({ error: msg }), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (alerts) {
          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          return new Response(
            JSON.stringify({ content: data.choices?.[0]?.message?.content ?? "" }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(res.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
