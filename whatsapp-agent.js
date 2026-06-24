/**
 * Agente WhatsApp - Sistema LEC Rio Preto
 * Usa @whiskeysockets/baileys para conexão via WhatsApp Web
 * Integrado com database.json do sistema de folha
 */

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(__dirname, 'whatsapp-config.json');
const DB_FILE_PRIMARY   = path.join(__dirname, 'database.json');
const DB_FILE_FALLBACK  = path.join(__dirname, 'db.json');
const AUTH_DIR  = path.join(__dirname, 'auth_info_baileys');
const LOG_FILE  = path.join(__dirname, 'whatsapp-agent.log');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const def = {
      admins: [],
      prefixo: '!',
      nomeAgente: 'LEC Rio Preto',
      silencioso: false
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(def, null, 2));
    log('⚙️  whatsapp-config.json criado. Adicione seus números admin antes de usar!');
    return def;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// ── LOGGING ───────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch(_) {}
}

// ── DATABASE ──────────────────────────────────────────────────────────────────

function getDB() {
  const file = fs.existsSync(DB_FILE_PRIMARY) ? DB_FILE_PRIMARY : DB_FILE_FALLBACK;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e) {
    return { cadastro: [], eventos: [], config: {}, calendario: {} };
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function jidToNumero(jid) {
  // Remove sufixo @s.whatsapp.net e @g.us
  return jid.replace(/@.+$/, '');
}

function isAdmin(jid, config) {
  if (!config.admins || config.admins.length === 0) return true; // sem restrição se lista vazia
  const numero = jidToNumero(jid);
  return config.admins.some(a => a.replace(/\D/g, '') === numero.replace(/\D/g, ''));
}

function isGrupo(jid) {
  return jid.endsWith('@g.us');
}

function getTexto(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  ).trim();
}

// ── COMANDOS ──────────────────────────────────────────────────────────────────

function cmdAjuda(config) {
  const p = config.prefixo;
  return [
    `🤖 *${config.nomeAgente} — Comandos disponíveis*`,
    ``,
    `📋 *Consultas gerais:*`,
    `  ${p}status    → Status do sistema`,
    `  ${p}resumo    → Resumo da competência atual`,
    `  ${p}faltas    → Resumo de faltas por tipo`,
    `  ${p}config    → Configurações do período`,
    ``,
    `👥 *Funcionários:*`,
    `  ${p}total     → Total de funcionários ativos`,
    `  ${p}lista     → Lista de funcionários (admin)`,
    ``,
    `📅 *Eventos:*`,
    `  ${p}eventos   → Últimos 10 lançamentos`,
    `  ${p}hoje      → Eventos de hoje`,
    ``,
    `ℹ️  Envie ${p}ajuda para ver este menu.`,
  ].join('\n');
}

function cmdStatus(config) {
  const db = getDB();
  const cfg = db.config || {};
  const qtdFuncionarios = (db.cadastro || []).filter(f => f.ativo !== false).length;
  const qtdEventos = (db.eventos || []).length;
  const competencia = cfg.competenciaAtual || '—';
  const base = cfg.base || 'Rio Preto';

  return [
    `✅ *Sistema LEC — Online*`,
    ``,
    `📍 Base: ${base}`,
    `📅 Competência: ${formatCompetencia(competencia)}`,
    `👥 Funcionários ativos: ${qtdFuncionarios}`,
    `📌 Total de lançamentos: ${qtdEventos}`,
    `🕐 Atualizado: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  ].join('\n');
}

function cmdResumo() {
  const db = getDB();
  const cfg = db.config || {};
  const funcionarios = (db.cadastro || []).filter(f => f.ativo !== false);
  const eventos = db.eventos || [];

  const competencia = cfg.competenciaAtual || '—';
  const du = cfg.duAtual || '—';
  const dataCorte = cfg.dataCorte ? new Date(cfg.dataCorte + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  // Contar tipos de evento
  const porTipo = {};
  eventos.forEach(e => {
    const tipo = e.tipo || e.evento || 'Outros';
    porTipo[tipo] = (porTipo[tipo] || 0) + (parseFloat(e.quantidade || e.dias || 1));
  });

  const resumoEventos = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tipo, qtd]) => `  • ${tipo}: ${qtd}`)
    .join('\n') || '  Nenhum lançamento';

  return [
    `📊 *Resumo — ${formatCompetencia(competencia)}*`,
    ``,
    `👥 Funcionários: ${funcionarios.length}`,
    `📅 Dias Úteis (DU): ${du}`,
    `✂️  Data de corte: ${dataCorte}`,
    ``,
    `📌 *Top lançamentos:*`,
    resumoEventos,
  ].join('\n');
}

function cmdFaltas() {
  const db = getDB();
  const eventos = db.eventos || [];

  if (eventos.length === 0) {
    return '📭 Nenhum evento lançado até o momento.';
  }

  const porTipo = {};
  eventos.forEach(e => {
    const tipo = e.tipo || e.evento || 'Outros';
    porTipo[tipo] = (porTipo[tipo] || 0) + (parseFloat(e.quantidade || e.dias || 1));
  });

  const linhas = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, qtd]) => `  • ${tipo}: *${qtd}*`);

  return [
    `📋 *Faltas e ocorrências por tipo:*`,
    ``,
    ...linhas,
    ``,
    `Total de registros: ${eventos.length}`,
  ].join('\n');
}

function cmdConfig() {
  const db = getDB();
  const cfg = db.config || {};

  return [
    `⚙️  *Configurações do Sistema*`,
    ``,
    `📅 Competência atual: ${formatCompetencia(cfg.competenciaAtual || '—')}`,
    `📅 Próxima competência: ${formatCompetencia(cfg.competenciaProxima || '—')}`,
    `📆 DU atual: ${cfg.duAtual || '—'} dias`,
    `📆 DU próximo: ${cfg.duProximo || '—'} dias`,
    `✂️  Data de corte: ${cfg.dataCorte ? new Date(cfg.dataCorte + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}`,
    `📍 Base: ${cfg.base || '—'}`,
    `👤 Coordenador: ${cfg.coordenador || '—'}`,
  ].join('\n');
}

function cmdTotal() {
  const db = getDB();
  const ativos = (db.cadastro || []).filter(f => f.ativo !== false);
  const inativos = (db.cadastro || []).filter(f => f.ativo === false);

  return [
    `👥 *Funcionários*`,
    ``,
    `✅ Ativos: ${ativos.length}`,
    `❌ Inativos: ${inativos.length}`,
    `📊 Total cadastrado: ${(db.cadastro || []).length}`,
  ].join('\n');
}

function cmdLista() {
  const db = getDB();
  const ativos = (db.cadastro || []).filter(f => f.ativo !== false);

  if (ativos.length === 0) {
    return '📭 Nenhum funcionário cadastrado.';
  }

  const MAX = 30;
  const exibidos = ativos.slice(0, MAX);
  const linhas = exibidos.map((f, i) => `  ${i + 1}. ${f.nome || f.name || '(sem nome)'}`);

  return [
    `👥 *Lista de funcionários ativos (${ativos.length}):*`,
    ``,
    ...linhas,
    ativos.length > MAX ? `\n  ... e mais ${ativos.length - MAX} funcionários.` : '',
  ].filter(Boolean).join('\n');
}

function cmdEventos() {
  const db = getDB();
  const eventos = (db.eventos || []).slice(-10).reverse();

  if (eventos.length === 0) {
    return '📭 Nenhum evento lançado.';
  }

  const linhas = eventos.map(e => {
    const nome = e.nome || e.funcionario || '?';
    const tipo = e.tipo || e.evento || '?';
    const qtd  = e.quantidade || e.dias || '';
    const data = e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    return `  • ${nome} — ${tipo}${qtd ? ' (' + qtd + ')' : ''}${data ? ' em ' + data : ''}`;
  });

  return [
    `📌 *Últimos ${eventos.length} lançamentos:*`,
    ``,
    ...linhas,
  ].join('\n');
}

function cmdHoje() {
  const db = getDB();
  const hoje = new Date().toISOString().split('T')[0];
  const eventos = (db.eventos || []).filter(e => e.data === hoje || e.dataInicio === hoje);

  if (eventos.length === 0) {
    return `📭 Nenhum evento para hoje (${new Date().toLocaleDateString('pt-BR')}).`;
  }

  const linhas = eventos.map(e => {
    const nome = e.nome || e.funcionario || '?';
    const tipo = e.tipo || e.evento || '?';
    return `  • ${nome} — ${tipo}`;
  });

  return [
    `📅 *Eventos de hoje (${new Date().toLocaleDateString('pt-BR')}):*`,
    ``,
    ...linhas,
  ].join('\n');
}

// ── FORMATAR ──────────────────────────────────────────────────────────────────

function formatCompetencia(comp) {
  if (!comp || !comp.includes('-')) return comp;
  const [ano, mes] = comp.split('-');
  const meses = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(mes)] || mes}/${ano}`;
}

// ── HANDLER DE MENSAGENS ──────────────────────────────────────────────────────

async function handleMessage(sock, msg, config) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  if (!from) return;

  // Ignorar mensagens de status/broadcast
  if (from === 'status@broadcast') return;

  const texto = getTexto(msg);
  if (!texto.startsWith(config.prefixo)) return;

  const [cmd, ...args] = texto.slice(config.prefixo.length).trim().toLowerCase().split(/\s+/);
  const numero = jidToNumero(from);

  log(`[MSG] ${numero} → ${config.prefixo}${cmd}`);

  let resposta = null;

  switch (cmd) {
    case 'ajuda':
    case 'help':
    case 'menu':
      resposta = cmdAjuda(config);
      break;

    case 'status':
      resposta = cmdStatus(config);
      break;

    case 'resumo':
    case 'folha':
      resposta = cmdResumo();
      break;

    case 'faltas':
    case 'ocorrencias':
      resposta = cmdFaltas();
      break;

    case 'config':
    case 'configuracao':
    case 'configurações':
      resposta = cmdConfig();
      break;

    case 'total':
    case 'funcionarios':
      resposta = cmdTotal();
      break;

    case 'lista':
      if (!isAdmin(from, config)) {
        resposta = '⛔ Comando restrito. Apenas administradores podem listar funcionários.';
      } else {
        resposta = cmdLista();
      }
      break;

    case 'eventos':
    case 'lancamentos':
      resposta = cmdEventos();
      break;

    case 'hoje':
      resposta = cmdHoje();
      break;

    default:
      // Sem resposta para comandos desconhecidos (evita spam)
      if (!config.silencioso) {
        resposta = `❓ Comando *${config.prefixo}${cmd}* não reconhecido.\nDigite *${config.prefixo}ajuda* para ver os comandos disponíveis.`;
      }
  }

  if (resposta) {
    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    log(`[RESP] ${numero} ← ${cmd} (${resposta.length} chars)`);
  }
}

// ── CONEXÃO BAILEYS ───────────────────────────────────────────────────────────

async function conectar() {
  const config = loadConfig();
  log(`🚀 Iniciando agente: ${config.nomeAgente}`);

  if (config.admins.length === 0) {
    log('⚠️  ATENÇÃO: Nenhum número admin configurado em whatsapp-config.json');
    log('   O comando !lista ficará acessível a qualquer pessoa até você configurar admins.');
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  log(`📦 Baileys versão ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['LEC Rio Preto', 'Chrome', '120.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n');
    }

    if (connection === 'close') {
      const codigo = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : 0;
      const deslogado = codigo === DisconnectReason.loggedOut;

      log(`🔌 Conexão encerrada (código ${codigo}). ${deslogado ? 'Sessão expirada.' : 'Reconectando...'}`);

      if (deslogado) {
        // Limpar sessão e solicitar novo QR
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch(_) {}
        log('🗑️  Sessão removida. Reinicie o agente para gerar novo QR Code.');
        process.exit(1);
      } else {
        // Reconexão com backoff
        const delay = Math.min(5000 * (1 + Math.random()), 15000);
        log(`⏳ Aguardando ${Math.round(delay / 1000)}s para reconectar...`);
        setTimeout(conectar, delay);
      }
    } else if (connection === 'open') {
      log('✅ WhatsApp conectado com sucesso!');
      log(`   Número: ${sock.user?.id || '?'}`);
      log(`   Prefixo de comandos: ${config.prefixo}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg, config);
      } catch(e) {
        log(`❌ Erro ao processar mensagem: ${e.message}`);
      }
    }
  });

  return sock;
}

// ── START ─────────────────────────────────────────────────────────────────────

conectar().catch(e => {
  log(`💥 Erro fatal: ${e.message}`);
  process.exit(1);
});
