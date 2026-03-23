import { AIEngine } from "./ai-engine.js";

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obterSaudacaoAgora() {
  const agora = new Date();
  const hora = agora.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function formatarDataHoraAtual() {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return { data, hora };
}

async function obterPrevisaoTempo() {
  if (!navigator.geolocation) {
    return "Não consigo ver a previsão porque a geolocalização não está disponível neste navegador.";
  }

  const posicao = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000
    });
  }).catch(() => null);

  if (!posicao?.coords) {
    return "Para mostrar a previsão do tempo, preciso da permissão de localização no navegador.";
  }

  const { latitude, longitude } = posicao.coords;

  const [geoResp, weatherResp] = await Promise.all([
    fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=pt&format=json`),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
    )
  ]);

  if (!geoResp.ok || !weatherResp.ok) {
    throw new Error("Não consegui consultar o clima agora.");
  }

  const geoData = await geoResp.json();
  const weatherData = await weatherResp.json();
  const atual = weatherData?.current || {};
  const local = geoData?.results?.[0];
  const nomeLocal = [local?.name, local?.admin1, local?.country].filter(Boolean).join(", ");

  const descricaoCodigo = {
    0: "céu limpo",
    1: "predominantemente limpo",
    2: "parcialmente nublado",
    3: "nublado",
    45: "neblina",
    48: "neblina com geada",
    51: "garoa fraca",
    53: "garoa moderada",
    55: "garoa intensa",
    61: "chuva fraca",
    63: "chuva moderada",
    65: "chuva forte",
    71: "neve fraca",
    80: "pancadas de chuva fracas",
    81: "pancadas de chuva moderadas",
    82: "pancadas de chuva fortes",
    95: "trovoadas"
  };

  return `Agora em ${nomeLocal || "sua região"}: ${Math.round(Number(atual.temperature_2m || 0))}°C, sensação de ${Math.round(Number(atual.apparent_temperature || 0))}°C, ${descricaoCodigo[atual.weather_code] || "condição variável"} e vento em ${Math.round(Number(atual.wind_speed_10m || 0))} km/h.`;
}

function respostaFallback(texto = "", contexto = {}) {
  const pagina = contexto?.pagina || "index";
  return `Não consegui responder isso com precisão agora. Posso ajudar com recursos da BRASFLIX, como vídeos, perfil, pessoas, analytics, login facial, admin, dia, hora, clima e navegação. Página atual: ${pagina}.`;
}

async function tentarRespostaLocal(texto = "", contexto = {}) {
  const t = normalizar(texto);
  const pagina = contexto?.pagina || "";
  const { data, hora } = formatarDataHoraAtual();

  if (!t) return "Não recebi nenhuma mensagem para responder.";

  if (["oi", "ola", "olá", "e ai", "e aí", "bom dia", "boa tarde", "boa noite"].includes(t)) {
    return `${obterSaudacaoAgora()}! Posso ajudar com vídeos, perfil, pessoas, analytics, login facial, área admin, data, hora e previsão do tempo.`;
  }

  if (t.includes("que dia é hoje") || t.includes("qual o dia de hoje") || t.includes("dia atual") || t === "data") {
    return `Hoje é ${data}.`;
  }

  if (t.includes("que horas sao") || t.includes("que horas são") || t.includes("hora atual") || t === "hora") {
    return `Agora são ${hora}.`;
  }

  if (t.includes("tempo") || t.includes("clima") || t.includes("previsao") || t.includes("previsão")) {
    try {
      return await obterPrevisaoTempo();
    } catch (error) {
      return error.message || "Não consegui consultar o clima agora.";
    }
  }

  if (t.includes("o que voce faz") || t.includes("o que você faz") || t.includes("o que consegue fazer")) {
    return "Posso explicar funções da BRASFLIX, orientar navegação, ajudar com vídeos, favoritos, perfil, chat entre usuários, analytics, login facial, administração, data, hora e clima.";
  }

  if (t.includes("como acessar admin") || t.includes("como criar admin")) {
    return "Para criar o primeiro admin, faça login, abra setup-admin.html, informe o SETUP_ADMIN_SECRET e depois acesse admin/dashboard.html.";
  }

  if (t.includes("como postar video") || t.includes("como postar vídeo")) {
    return "Depois de virar admin, entre em admin/videos.html para publicar, editar e excluir vídeos da plataforma.";
  }

  if (t.includes("como funciona o perfil") || t.includes("pagina de perfil") || t.includes("página de perfil")) {
    return "Na página de perfil você vê seus dados, avatar, bio, seguidores, seguindo e atalhos para conversas e sugestões de pessoas.";
  }

  if (t.includes("como funciona analytics") || t.includes("pagina analytics") || t.includes("página analytics")) {
    return "A página de analytics mostra métricas de vídeos, tendências, engajamento e visão resumida do uso da plataforma.";
  }

  if (t.includes("como funciona a home") || t.includes("pagina inicial") || t.includes("home")) {
    return "Na home da BRASFLIX você encontra faixas como Top vídeos, Em alta e categorias. Ao clicar em um card, o vídeo abre na página de reprodução.";
  }

  if (t.includes("como funciona o chat") || t.includes("chat entre usuarios") || t.includes("chat entre usuários")) {
    return "O chat entre usuários permite abrir contatos, iniciar conversas e trocar mensagens em tempo real dentro da plataforma.";
  }

  if (pagina === "face" && (t.includes("erro facial") || t.includes("face-api"))) {
    return "Na tela facial, verifique permissão da câmera, carregamento do face-api.js e publicação da pasta /models no deploy.";
  }

  if (t.includes("ajuda") || t.includes("me ajuda") || t.includes("socorro")) {
    return "Posso te orientar na BRASFLIX. Pergunte sobre vídeos, perfil, pessoas, analytics, admin, login facial, data, hora ou clima.";
  }

  return "";
}

async function tentarRespostaComIA({ mensagemOriginal, contexto = {}, providerPreferencial = "gemini" }) {
  const system = `
Você é a PedrIA da BRASFLIX.

Regras:
- responda em português do Brasil;
- seja objetiva, natural e útil;
- pode responder sobre BRASFLIX, navegação, ajuda de uso, data atual, hora atual, clima e perguntas simples do cotidiano;
- para clima, se não houver dados no contexto, diga com clareza que a previsão depende de localização;
- não invente recursos inexistentes;
- se não souber, diga claramente.
  `.trim();

  const contextoExtra = [
    {
      role: "system",
      content: `
A BRASFLIX possui:
- página inicial com vídeos;
- perfil;
- pessoas/comunidade;
- chat entre usuários;
- analytics;
- login por email/senha, Google e reconhecimento facial;
- área admin protegida por role admin;
- setup-admin.html para o primeiro admin;
- admin/videos.html para postagem/gestão de vídeos.
      `.trim()
    },
    {
      role: "system",
      content: `Contexto da página atual: ${contexto?.pagina || "index"}`
    }
  ];

  const resultado = await AIEngine.gerar({
    prompt: mensagemOriginal,
    system,
    provider: providerPreferencial || "gemini",
    incluirContextoUsuario: true,
    contextoExtra
  });

  if (!resultado?.sucesso) {
    return { ok: false, origem: providerPreferencial, resposta: resultado?.erro || "" };
  }

  return {
    ok: true,
    origem: resultado.origem || providerPreferencial,
    resposta: resultado.texto || ""
  };
}

const PedriaCore = {
  config: {
    usarIA: true,
    providerPreferencial: "gemini",
    usarFallbackLocal: true
  },

  configurar({ usarIA = true, providerPreferencial = "gemini", usarFallbackLocal = true } = {}) {
    this.config.usarIA = Boolean(usarIA);
    this.config.providerPreferencial = providerPreferencial || "gemini";
    this.config.usarFallbackLocal = Boolean(usarFallbackLocal);
  },

  async responder(mensagem, contexto = {}) {
    const textoOriginal = String(mensagem || "").trim();

    if (!textoOriginal) {
      return { origem: "local", resposta: "Não recebi nenhuma mensagem para responder." };
    }

    const local = await tentarRespostaLocal(textoOriginal, contexto);
    if (local) {
      return { origem: "local", resposta: local };
    }

    if (this.config.usarIA) {
      const ia = await tentarRespostaComIA({
        mensagemOriginal: textoOriginal,
        contexto,
        providerPreferencial: this.config.providerPreferencial
      });

      if (ia.ok && ia.resposta) {
        return { origem: ia.origem, resposta: ia.resposta };
      }
    }

    if (this.config.usarFallbackLocal) {
      return { origem: "fallback", resposta: respostaFallback(textoOriginal, contexto) };
    }

    return { origem: "indisponivel", resposta: "A PedrIA ainda não conseguiu responder isso neste momento." };
  },

  async gerarQuiz({ videoId = "", videoTitulo = "", contexto = {} } = {}) {
    const prompt = `
Crie 5 perguntas de múltipla escolha sobre o vídeo.
Retorne um JSON válido com o formato:
{
  "perguntas": [
    {
      "id": "q1",
      "enunciado": "...",
      "alternativas": ["...", "...", "...", "..."],
      "correta": 0
    }
  ]
}
Título do vídeo: ${videoTitulo || "Vídeo atual"}
ID do vídeo: ${videoId || "sem-id"}
Contexto extra: ${JSON.stringify(contexto || {})}
    `.trim();

    const resultado = await AIEngine.gerar({
      prompt,
      provider: this.config.providerPreferencial,
      incluirContextoUsuario: false,
      system: "Você é uma IA que responde apenas em JSON válido."
    });

    if (!resultado?.sucesso || !resultado?.texto) {
      return { ok: false, origem: "ia", perguntas: [] };
    }

    try {
      const dados = JSON.parse(resultado.texto);
      if (Array.isArray(dados?.perguntas)) {
        return { ok: true, origem: resultado.origem, perguntas: dados.perguntas };
      }
    } catch (error) {
      console.warn("[PedrIA] JSON inválido no quiz:", error);
    }

    return { ok: false, origem: resultado.origem || "ia", perguntas: [] };
  }
};

window.PedriaCore = PedriaCore;
export { PedriaCore };
