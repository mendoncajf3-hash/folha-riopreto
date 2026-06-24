/**
 * Agente WhatsApp — Recrutamento Leiturista Entregador
 * Atende candidatos via WhatsApp, responde dúvidas com IA (Gemini)
 * e registra os interessados em candidatos.json
 */

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CONFIG_FILE      = path.join(__dirname, 'whatsapp-config.json');
const CANDIDATOS_FILE  = path.join(__dirname, 'candidatos.json');
const AUTH_DIR         = path.join(__dirname, 'auth_info_baileys');
const LOG_FILE         = path.join(__dirname, 'whatsapp-agent.log');

const GEMINI_API_KEY   = 'AIzaSyD3iHLLZ2mSCjI0_Rkp5YZcI3eJiPQ4l5k';
const GEMINI_MODEL     = 'gemini-flash-lite-latest';

// Tempo máximo de inatividade por conversa: 30 minutos
const TIMEOUT_CONVERSA = 30 * 60 * 1000;

// ── ESTADO DAS CONVERSAS (em memória) ────────────────────────────────────────

// Mapa: telefone → { estado, nome, chat, ultimaInteracao }
const conversas = new Map();

// ── SISTEMA DE LOG ────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const linha = `[${ts}] ${msg}`;
  console.log(linha);
  try { fs.appendFileSync(LOG_FILE, linha + '\n'); } catch (_) {}
}

// ── CANDIDATOS ────────────────────────────────────────────────────────────────

function carregarCandidatos() {
  if (!fs.existsSync(CANDIDATOS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CANDIDATOS_FILE, 'utf8')); } catch (_) { return []; }
}

function salvarCandidato(nome, telefone, idade, bairro) {
  const lista = carregarCandidatos();
  const jaExiste = lista.some(c => c.telefone === telefone);
  if (jaExiste) return false;

  lista.push({
    nome,
    telefone,
    idade: idade || '',
    bairro: bairro || '',
    data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    status: 'interessado',
  });
  fs.writeFileSync(CANDIDATOS_FILE, JSON.stringify(lista, null, 2));
  log(`✅ Candidato registrado: ${nome} | ${idade} | ${bairro} | (${telefone})`);
  return true;
}

// ── GEMINI ────────────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const PROMPT_SISTEMA = `Você é "Ana", assistente de recrutamento da empresa LEC (Leitura e Entrega de Contas), responsável pelo atendimento de candidatos à vaga de Leiturista Entregador em São José do Rio Preto - SP.

INFORMAÇÕES DA VAGA:
- Cargo: Leiturista Entregador
- Empresa: LEC - São José do Rio Preto
- Regime: CLT
- Salário: A combinar (compatível com o mercado)
- Horário: Segunda a sexta, das 07h às 17h
- Requisito principal: disponibilidade para andar a pé durante o expediente (rotas a pé pela cidade)
- Outros requisitos: boa comunicação, responsabilidade, pontualidade
- Atividades: leitura de hidrômetros e medidores em campo, entrega de contas e documentos nas residências, atendimento cordial aos clientes
- Benefícios: vale alimentação, vale transporte (a confirmar no ato da contratação)
- Observação: não é necessário ter moto ou CNH — o trabalho é feito a pé nas rotas designadas

REGRAS DE COMPORTAMENTO:
1. Responda SOMENTE perguntas sobre a vaga, empresa, processo seletivo ou qualificações necessárias
2. Se perguntarem sobre outros assuntos, redirecione gentilmente: "Posso te ajudar com informações sobre a vaga de Leiturista. Tem alguma dúvida sobre a vaga?"
3. Use linguagem simples, amigável e profissional
4. Mantenha as respostas curtas — máximo 3 parágrafos, ideais para leitura no WhatsApp
5. Quando o candidato confirmar que quer se candidatar (ex: "quero me candidatar", "tenho interesse", "quero a vaga", "quero participar", "pode me inscrever"), responda com entusiasmo e inclua exatamente o marcador [[REGISTRAR]] ao final da mensagem — sem explicar o marcador ao candidato
6. Não inclua [[REGISTRAR]] em nenhuma outra situação
7. Não invente informações que não estão no briefing acima`;

function criarChat(nomeCandidato, idade, bairro) {
  const contexto = `\n\nDados do candidato já coletados:\n- Nome: ${nomeCandidato}\n- Idade: ${idade}\n- Bairro/Região: ${bairro}`;
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: PROMPT_SISTEMA + contexto,
  });
  return model.startChat({ history: [] });
}

async function perguntarGemini(chat, mensagem) {
  const result = await chat.sendMessage(mensagem);
  return result.response.text();
}

// ── MENSAGENS FIXAS ───────────────────────────────────────────────────────────

const MSG_BOAS_VINDAS =
  `Olá! 👋 Bem-vindo ao processo seletivo da *LEC — São José do Rio Preto*.\n\n` +
  `Estou aqui para te ajudar com a vaga de *Leiturista Entregador*. 😊\n\n` +
  `Para começar, me diz seu *nome completo*:`;

const MSG_PEDE_IDADE = (nome) =>
  `Prazer, *${nome}*! 😊\n\nAgora me diz: qual é a sua *idade*?`;

const MSG_PEDE_BAIRRO = () =>
  `Ótimo! E em qual *bairro ou região* de Rio Preto você mora?`;

const MSG_APOS_DADOS = (nome) =>
  `Perfeito, *${nome}*! Dados anotados. ✏️\n\n` +
  `Agora pode me perguntar qualquer coisa sobre a vaga — horário, atividades, o que esperar do dia a dia...\n\n` +
  `Se quiser se candidatar, é só me dizer. 🙂`;

const MSG_REGISTRADO = (nome) =>
  `Perfeito, *${nome}*! ✅\n\n` +
  `Seu interesse foi registrado com sucesso. Nossa equipe de RH entrará em contato em breve.\n\n` +
  `Boa sorte! 🍀`;

const MSG_JA_REGISTRADO = (nome) =>
  `*${nome}*, seu interesse já estava registrado! 📋\n\n` +
  `Nossa equipe de RH vai entrar em contato em breve. Fique atento ao seu celular! 😊`;

const MSG_ERRO = `Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?`;

// ── PROCESSAMENTO DE MENSAGENS ────────────────────────────────────────────────

function obterTexto(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  ).trim();
}

function limparConversasAntigas() {
  const agora = Date.now();
  for (const [tel, conv] of conversas) {
    if (agora - conv.ultimaInteracao > TIMEOUT_CONVERSA) {
      conversas.delete(tel);
    }
  }
}

async function processarMensagem(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  if (!from || from === 'status@broadcast') return;

  // Ignorar grupos
  if (from.endsWith('@g.us')) return;

  const texto = obterTexto(msg);
  if (!texto) return;

  const telefone = from.replace('@s.whatsapp.net', '');

  log(`[MSG] ${telefone}: "${texto.slice(0, 60)}${texto.length > 60 ? '...' : ''}"`);

  limparConversasAntigas();

  let conversa = conversas.get(telefone);

  // ── ESTADO: INÍCIO (primeira mensagem ou conversa expirada) ────────────────
  if (!conversa) {
    conversas.set(telefone, {
      estado: 'aguardando_nome',
      nome: null,
      idade: null,
      bairro: null,
      chat: null,
      ultimaInteracao: Date.now(),
    });
    await enviar(sock, from, MSG_BOAS_VINDAS, msg);
    return;
  }

  conversa.ultimaInteracao = Date.now();

  // ── ESTADO: AGUARDANDO NOME ───────────────────────────────────────────────
  if (conversa.estado === 'aguardando_nome') {
    const nome = texto.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
    if (nome.length < 2) {
      await enviar(sock, from, 'Não consegui identificar seu nome. Pode me dizer seu *nome completo*?', msg);
      return;
    }
    conversa.nome = nome.split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    conversa.estado = 'aguardando_idade';
    await enviar(sock, from, MSG_PEDE_IDADE(conversa.nome), msg);
    return;
  }

  // ── ESTADO: AGUARDANDO IDADE ──────────────────────────────────────────────
  if (conversa.estado === 'aguardando_idade') {
    conversa.idade = texto.trim();
    conversa.estado = 'aguardando_bairro';
    await enviar(sock, from, MSG_PEDE_BAIRRO(), msg);
    return;
  }

  // ── ESTADO: AGUARDANDO BAIRRO ─────────────────────────────────────────────
  if (conversa.estado === 'aguardando_bairro') {
    conversa.bairro = texto.trim();
    conversa.chat = criarChat(conversa.nome, conversa.idade, conversa.bairro);
    conversa.estado = 'conversa';
    await enviar(sock, from, MSG_APOS_DADOS(conversa.nome), msg);
    return;
  }

  // ── ESTADO: JÁ REGISTRADO ────────────────────────────────────────────────
  if (conversa.estado === 'registrado') {
    await enviar(sock, from, MSG_JA_REGISTRADO(conversa.nome), msg);
    return;
  }

  // ── ESTADO: CONVERSA COM IA ───────────────────────────────────────────────
  if (conversa.estado === 'conversa') {
    try {
      const resposta = await perguntarGemini(conversa.chat, texto);

      if (resposta.includes('[[REGISTRAR]]')) {
        const respostaLimpa = resposta.replace('[[REGISTRAR]]', '').trim();
        await enviar(sock, from, respostaLimpa, msg);

        const novo = salvarCandidato(conversa.nome, telefone, conversa.idade, conversa.bairro);
        conversa.estado = 'registrado';

        await enviar(sock, from, novo ? MSG_REGISTRADO(conversa.nome) : MSG_JA_REGISTRADO(conversa.nome), msg);
      } else {
        await enviar(sock, from, resposta, msg);
      }
    } catch (erro) {
      log(`❌ Erro Gemini (${telefone}): ${erro.message}`);
      await enviar(sock, from, MSG_ERRO, msg);
    }
  }
}

async function enviar(sock, jid, texto, msgOrigem) {
  try {
    await sock.sendMessage(jid, { text: texto }, { quoted: msgOrigem });
  } catch (e) {
    log(`❌ Erro ao enviar mensagem: ${e.message}`);
  }
}

// ── CONEXÃO BAILEYS ───────────────────────────────────────────────────────────

async function conectar() {
  log('🚀 Iniciando agente de recrutamento LEC...');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['LEC Recrutamento', 'Chrome', '120.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escaneie o QR Code com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log();
    }

    if (connection === 'close') {
      const codigo = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : 0;
      const deslogado = codigo === DisconnectReason.loggedOut;

      log(`🔌 Conexão encerrada (código ${codigo}). ${deslogado ? 'Sessão expirada.' : 'Reconectando...'}`);

      if (deslogado) {
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
        log('🗑️  Sessão removida. Reinicie para gerar novo QR Code.');
        process.exit(1);
      } else {
        const delay = Math.min(5000 + Math.random() * 5000, 15000);
        setTimeout(conectar, delay);
      }
    } else if (connection === 'open') {
      log(`✅ WhatsApp conectado! Número: ${sock.user?.id || '?'}`);
      log(`   Aguardando mensagens de candidatos...`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      await processarMensagem(sock, msg).catch(e =>
        log(`❌ Erro inesperado: ${e.message}`)
      );
    }
  });
}

// ── START ─────────────────────────────────────────────────────────────────────

conectar().catch(e => {
  log(`💥 Falha ao iniciar: ${e.message}`);
  process.exit(1);
});
