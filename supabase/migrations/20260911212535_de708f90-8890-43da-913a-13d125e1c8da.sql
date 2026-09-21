CREATE TABLE public.competitor_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ameaca text,
  tipo text,
  taxa_modelo text,
  reputacao text,
  forcas text,
  vulnerabilidades text,
  pergunta_descoberta text,
  prioridade text,
  ordem int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitor_intel TO authenticated;
GRANT ALL ON public.competitor_intel TO service_role;
ALTER TABLE public.competitor_intel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem concorrentes" ON public.competitor_intel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam concorrentes" ON public.competitor_intel FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER competitor_intel_updated_at BEFORE UPDATE ON public.competitor_intel FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_ts();

CREATE TABLE public.competitor_playbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa text NOT NULL UNIQUE,
  ordem int NOT NULL DEFAULT 100,
  pergunta_central text,
  dados_minimos text,
  evidencia text,
  saida text,
  falha text,
  acao_seguinte text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitor_playbook TO authenticated;
GRANT ALL ON public.competitor_playbook TO service_role;
ALTER TABLE public.competitor_playbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem protocolo" ON public.competitor_playbook FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam protocolo" ON public.competitor_playbook FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.competitor_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte text NOT NULL UNIQUE,
  tipo text,
  sustenta text,
  data_consulta text,
  url text,
  tratamento text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitor_sources TO authenticated;
GRANT ALL ON public.competitor_sources TO service_role;
ALTER TABLE public.competitor_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem fontes" ON public.competitor_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam fontes" ON public.competitor_sources FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.competitor_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  ordem int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitor_guidelines TO authenticated;
GRANT ALL ON public.competitor_guidelines TO service_role;
ALTER TABLE public.competitor_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem diretrizes" ON public.competitor_guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam diretrizes" ON public.competitor_guidelines FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.competitor_intel (nome, ameaca, tipo, taxa_modelo, reputacao, forcas, vulnerabilidades, pergunta_descoberta, prioridade, ordem) VALUES
('Sympla','ALTA','Incumbente nacional / self-service','10% serviço + 2–2,5% processamento; mínimo R$3,99','Ótima; nota 8,2; resolve 86,2%; responde 95%; 6d17h (RA, consulta 11/09/2026)','Descoberta e escala; produto maduro','Suporte assíncrono e fricção no dia do evento','Pergunte quem resolve crise em tempo real e quanto custa a taxa total ao fã.','P1',1),
('Informal (Pix + lista)','ALTA em volume','Concorrente invisível / microprodutores','0% aparente; risco de fraude, chargeback e clonagem','Sem reputação formal consolidada','Custo e simplicidade imediatos','Risco operacional, ausência de dados, fraude e baixa escala','Quantifique perdas, controle de acesso, conciliação e confiança do público.','P1',2),
('Eventim','MÉDIA','Premium internacional + rede física','Serviço + processamento + taxa ADM; modelo interno usa 20% destacada','RA ~6,9–7,0; relatos de compra, cadastro e instabilidade; Procon-SP noticiou questionamentos em 2025','Shows internacionais, exclusividades, rede física','Taxa surpresa, suporte percebido como lento e dependência de canal','Peça o líquido real: rebate, cartão, advance recoupable e preço final.','P2',3),
('Ingresse','MÉDIA-ALTA','B2B + fintech/FIDC + esportes','Até ~3% PDV / ~10% online (referência interna)','GMV interno ~R$1,9 bi em 2024; validar atualização','Financiamento, esportes, escala nacional','Menor descoberta orgânica e FIDC depende de histórico','Explore antecipação, critérios de crédito e autonomia operacional.','P2',4),
('Ticket 360','MÉDIA','Regional SP / TIS Eventos','~18–20% + retirada + processamento, podendo empilhar','RA interno: Bom 7,4–7,9; resposta rápida 11–15h','Presença regional e operação presencial','Opacidade do custo total e dependência de fluxos físicos','Faça o cliente simular preço final e SLA de suporte.','P2',5),
('Ingressos 10','MÉDIA','Regional de nicho / bares e estacionamentos','~15%','Estrutura enxuta; suporte por e-mail segundo material interno','Proximidade e simplicidade regional','Poucos casos públicos de alto volume','Compare robustez, suporte no evento e capacidade de crescimento.','P2',6),
('Ticketmaster','MÉDIA','Premium / megaeventos / venues','Até ~20% serviço + administração do venue','Procon-SP notificou em 2025 no caso The Weeknd; validar por evento','Escala, marcas globais, grandes venues','Custo e burocracia acima do ICP regional','Compare custo final, flexibilidade e autonomia do produtor.','P3',7),
('Ingresso.com','BAIXA-MÉDIA','Modelo fechado / portfólio T4F','Variável; sem tabela pública para independentes','Sem dado comparável interno','Marca tradicional e portfólio T4F','Pouco aderente a produtor independente/self-service','Pergunte se o evento precisa de autonomia, dados e recorrência.','P3',8),
('AppTicket','BAIXA-MÉDIA','Self-service simples','~10% all-in; mínimo ~R$2','Sem dado comparável interno','Simplicidade e transparência','Menos serviços extras, antecipação e operação complexa','Mapeie volume, canais, check-in, promoter e necessidade de suporte.','P3',9),
('Bilheteria Digital','BAIXA','Nicho cultural','Não divulgada; negociar','Sem dado comparável interno','Know-how em teatro, ballet, ópera e assentos','Menor aderência a shows/festas e marketing de descoberta','Teste se o evento precisa de mapa de assentos ou escala de venda.','P4',10),
('Meaple','BAIXA','Comunidades pequenas','Não pública','Sem dado comparável interno','Proximidade e atendimento pessoal','Menor escala e estrutura de produto','Compare atendimento próximo com controles, dados e confiabilidade.','P4',11),
('Guichê Web','BAIXA','Legado / PDV físico','Variável; foco PDV','Sem dado comparável interno','Rede presencial em praças específicas','Digital secundário e menor integração moderna','Pergunte sobre venda digital, dados e check-in em múltiplos canais.','P4',12),
('BuyTicket','N/A (sinal de demanda)','Mercado secundário / revenda','~7,5% comprador + ~7,5% vendedor','Usar como termômetro de demanda, não como concorrente primário','Sinaliza escassez e demanda reprimida','Não controla a venda primária nem a experiência do produtor','Investigue lotes esgotados, preço secundário e demanda não capturada.','Sinal',13);

INSERT INTO public.competitor_playbook (etapa, ordem, pergunta_central, dados_minimos, evidencia, saida, falha, acao_seguinte) VALUES
('1. Detectar',1,'Qual plataforma aparece no checkout, evento ou divulgação?','URL, nome do evento, produtor, cidade e data','Página oficial + data/hora de captura','Concorrente primário e secundários','Confundir venue, produtor e ticketera','Abrir fontes oficiais e salvar URLs'),
('2. Entender o comprador',2,'Quem paga, quem recebe e quem atende o fã?','Taxa serviço, processamento, retirada, cartão, reembolso','Checkout e termos vigentes','Custo total para fã e produtor','Comparar só a taxa anunciada','Simular pelo menos 3 tickets'),
('3. Medir a dor',3,'Onde existe risco de conversão ou operação?','Suporte, check-in, repasse, dados, lotes, PDV','RA, termos, relatos e entrevista','Dor priorizada por impacto','Generalizar uma reclamação','Buscar padrão e frequência'),
('4. Dimensionar',4,'A oportunidade é economicamente relevante?','Ticket médio, capacidade, dias, GMV e recorrência','Dados do evento + cálculo explícito','Score de oportunidade 0–100','Inventar GMV ou usar lotação máxima sem base','Marcar “estimado” e pedir confirmação'),
('5. Responder',5,'Qual tese do Clube é específica para o caso?','Dor + diferencial + prova + condição','Fonte da prova e premissas','Mensagem curta e defensável','Ataque genérico ou promessa absoluta','Testar com produtor'),
('6. Propor',6,'Qual estrutura torna a troca racional?','Taxa, rebate, cartão, advance, SLA e operação','Simulador e contrato/proposta','Cenários base, downside e upside','Tratar advance recoupable como ganho','Mostrar líquido e risco'),
('7. Aprender',7,'O que mudou desde a última análise?','Data, versão, fonte, resultado','Log de evidências e feedback comercial','Atualização da ficha','Congelar fatos de 2025/2026','Revalidar antes de usar');

INSERT INTO public.competitor_sources (fonte, tipo, sustenta, data_consulta, url, tratamento) VALUES
('Sympla — Quanto custa','Oficial','10% serviço; 2–2,5% processamento; mínimo R$3,99; repasse ao comprador; repasse ao produtor no 3º dia útil após evento','Consulta 11/09/2026','https://produtores.sympla.com.br/quanto-custa/','Fato público; pode variar por configuração/evento'),
('Sympla — taxa de serviço','Oficial','Taxa de serviço e processamento têm naturezas distintas; processamento varia por meio de pagamento','Atualizado 21/01/2026','https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15444341510413','Fato público'),
('Reclame Aqui — Sympla','Reputação pública','Ótima; nota 8,2; 1.993 reclamações; resolve 86,2%; resposta 6d17h (01/03/2026–31/08/2026)','Consulta 11/09/2026','https://www.reclameaqui.com.br/empresa/sympla/','Snapshot temporal; não generalizar'),
('Reclame Aqui — Eventim','Reputação pública','2.229 reclamações; 99,9% respondidas; 50% resolvidas; 3d16h (01/07/2025–31/12/2025)','Consulta 11/09/2026','https://www.reclameaqui.com.br/empresa/eventim/sobre/','Comparabilidade limitada por janela diferente'),
('Reclame Aqui — casos Eventim','Casos públicos','Relatos de dificuldades de cadastro, finalização de compra, acesso e reembolso','2025–2026','https://www.reclameaqui.com.br/empresa/eventim/','Sinais para perguntas, não prova de taxa de falha'),
('Battle_Cards_Concorrentes_2026_ENRIQUECIDO.xlsx','Documento interno','13 perfis, teses, ameaças, vulnerabilidades, fontes e metodologia interna','Arquivo fornecido pelo usuário','Arquivo local fornecido','Referência interna; revalidar antes de comunicação externa'),
('LEADS_CONCORRENTES_DIARIOS_V2_COCKPIT_reparada.xlsx','Documento interno','Pipeline, normalização, enriquecimento, score 0–100, critérios de qualificação e fila RD','Arquivo fornecido pelo usuário','Arquivo local fornecido','Incorporado como protocolo operacional'),
('Simuladores Eventim x Clube','Documento interno','Premissas BB&R, comparação de taxa, rebate, cartão, advance recoupable e sensibilidade','Arquivo fornecido pelo usuário','Arquivos locais fornecidos','Premissas de negociação; não substitui proposta/contrato');

INSERT INTO public.competitor_guidelines (chave, titulo, conteudo, ordem) VALUES
('objetivo','Objetivo da ficha','Diagnosticar concorrente, qualificar oportunidade e montar resposta comercial baseada em evidência.',1),
('regra_ouro','Regra de ouro','Reconheça a força real do concorrente antes de explorar uma vulnerabilidade. Nunca trate hipótese como fato.',2),
('prioridades','Prioridades','P1 (resposta comercial imediata): Sympla e operação informal. P2 (ticketing recorrente): Eventim, Ingresse, Ticket 360 e Ingressos 10. P3/P4: aderência menor ao ICP regional.',3),
('limite_evidencia','Limite da evidência','Taxas e reputação variam por evento, canal, período e contrato. Sempre peça a proposta/checkout atual antes de afirmar número.',4),
('saida_esperada','Saída esperada','Perfil do concorrente → dor verificável → impacto econômico → tese do Clube → próximo passo.',5),
('escala_confianca','Escala de confiança','V = verificado (fonte oficial/pública com data). R = referência interna (revalidar antes de usar com cliente). E = estimativa (hipótese). — = ausência de evidência; nunca preencher com zero ou “não existe”.',6),
('como_usar','Como usar a ficha','1) Identifique o concorrente e o tipo de evento. 2) Colete evidências: URL, data, taxa no checkout, contrato/proposta, reclamações e operação. 3) Calcule custo total e líquido do produtor, não apenas a taxa nominal. 4) Classifique a oportunidade: ICP 15, GMV 20, produtor 15, contato 15, recorrência 15, prazo 10, tese CI 10. 5) Entregue recomendação com objeção provável, resposta, pergunta de descoberta e ação seguinte.',7),
('prompt_operacional','Prompt operacional','Analise [evento/produtor] contra [concorrente]. Separe fato, referência interna, estimativa e hipótese. Cite URL e data. Calcule custo total do fã e líquido do produtor. Identifique 3 forças do concorrente, 3 vulnerabilidades comprováveis, 5 perguntas de descoberta, objeções prováveis, resposta do Clube e próximo passo. Se faltar dado, não invente: liste o que precisa ser confirmado.',8),
('criterio_parada','Critério de parada','Não conclua “Clube vence” sem comparar preço final, líquido do produtor, risco operacional e aderência ao ICP.',9),
('sinal_alerta','Sinal de alerta','Se a fonte for apenas uma reclamação individual, trate como caso ilustrativo, não como taxa de falha.',10),
('saida_comercial','Saída comercial','Finalize sempre com: tese em 1 frase, evidência, cálculo, pergunta e CTA.',11);