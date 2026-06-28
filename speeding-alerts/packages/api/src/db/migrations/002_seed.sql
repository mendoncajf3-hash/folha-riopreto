-- ═══════════════════════════════════════════════════════════════
-- Seed - Dados iniciais obrigatórios
-- ═══════════════════════════════════════════════════════════════

-- Empresa padrão (LEC)
INSERT INTO companies (id, name, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000001', 'LEC - Logística', NULL);

-- Bases
INSERT INTO bases (id, company_id, name, city, state) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'SAO JOSE RIO PRETO', 'São José do Rio Preto', 'SP'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'MIRASSOL', 'Mirassol', 'SP'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'BADY BASSITT', 'Bady Bassitt', 'SP');

-- Templates de mensagem WhatsApp (graduação por reincidência)
INSERT INTO message_templates (occurrence_number, tone, template_text, use_ai, active) VALUES
(1, 'amigável',
 'Olá {nome}! Passando para informar que foi registrado um alerta de velocidade no veículo {placa} em {data} às {hora}. A velocidade registrada foi de {velocidade} km/h em uma via com limite de {limite} km/h. Pedimos atenção redobrada à sinalização para sua segurança e de todos. Qualquer dúvida estamos à disposição!',
 false, true),

(2, 'firme',
 'Atenção {nome}. Este é o 2º alerta de velocidade registrado no período. Veículo {placa} — {velocidade} km/h em via de {limite} km/h em {data} às {hora}. Pedimos seu comprometimento com as normas de segurança da empresa. Novas ocorrências poderão ser comunicadas à sua liderança.',
 false, true),

(3, 'advertência',
 '{nome}, registramos a 3ª ocorrência de excesso de velocidade neste período. Veículo {placa} — {velocidade} km/h (limite: {limite} km/h) em {data}. Sua situação está sendo acompanhada pela equipe de segurança. Evite novas ocorrências.',
 false, true),

(4, 'escalada',
 '{nome}, esta é a 4ª ocorrência de excesso de velocidade registrada no período. Informamos que sua liderança direta foi notificada sobre este histórico. Veículo {placa} — {data}. Contamos com sua responsabilidade e comprometimento com os protocolos de segurança.',
 false, true),

(5, 'crítico',
 '{nome}, registramos a {ocorrencia}ª ocorrência de excesso de velocidade neste período — situação considerada crítica. Sua liderança e o setor de RH já foram comunicados. Veículo {placa} — {data}. Solicitamos presença imediata para conversa com a gestão.',
 true, true);

-- Configurações padrão do sistema
INSERT INTO system_config (key, value, label) VALUES
  ('alert_tolerance_pct',     '10',    'Tolerância de velocidade (%) antes de acionar sistema'),
  ('recurrence_window_days',  '30',    'Janela de reincidência em dias'),
  ('alert_email_from',        '',      'E-mail do sistema de rastreamento (remetente)'),
  ('alert_email_subject',     'Alerta de velocidade', 'Assunto do e-mail de alerta'),
  ('whatsapp_enabled',        'false', 'WhatsApp ativado'),
  ('whatsapp_send_delay_sec', '5',     'Delay entre envios de WhatsApp (segundos)'),
  ('company_name',            'LEC - Logística', 'Nome da empresa');

INSERT INTO schema_migrations (version) VALUES ('002');
