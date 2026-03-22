import { AIEngine } from "./ai-engine.js";

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function respostaFallback(texto = "", contexto = {}) {
  const pagina = contexto?.pagina || "index";
  return `Não consegui responder isso com precisão agora. Posso ajudar com recursos da BRASFLIX, como vídeos, perfil, pessoas, analytics, login facial, admin e navegação. Página atual: ${pagina}.`;
}

function tentarRespostaLocal(texto = "", contexto = {}) {
  const t = normalizar(texto);
  const pagina = contexto?.pagina || "";

  if (!t) return "Não recebi nenhuma mensagem para responder.";

  if (["oi", "ola", "olá", "e ai", "e aí", "bom dia", "boa tarde", "boa noite"].includes(t)) {
    return "Olá! Posso ajudar com vídeos, perfil, pessoas, analytics, login facial e área admin da BRASFLIX.";
  }

  if (t.includes("o que voce faz") || t.includes("o que você faz") || t.includes("o que consegue fazer")) {
    return "Posso explicar funções da BRASFLIX, como vídeos, favoritos, perfil, chat entre usuários, analytics, login facial e administração.";
  }

  if (t.includes("como acessar admin") || t.includes("como criar admin")) {
    return "Para criar o primeiro admin, faça login, abra setup-admin.html, informe o SETUP_ADMIN_SECRET e depois acesse admin/dashboard.html.";
  }

  if (t.includes("como postar video") || t.includes("como postar vídeo")) {
    return "Depois de virar admin, entre em admin/videos.html para gerenciar e publicar vídeos.";
  }

  if (pagina === "face" && (t.includes("erro facial") || t.includes("face-api"))) {
    return "Na tela facial, verifique permissão da câmera, carregamento do face-api.js e publicação dos modelos em /models.";
  }

  return "";
}

async function tentarRespostaComIA({ mensagemOriginal, contexto = {}, providerPreferencial = "gemini" }) {
  const system = `
Você é a PedrIA da BRASFLIX.

Regras:
- responda em português do Brasil;
- seja objetiva;
- não invente recursos;
- fale apenas sobre a BRASFLIX e os recursos conhecidos;
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

  configurar({
    usarIA = true,
    providerPreferencial = "gemini",
    usarFallbackLocal = true
  } = {}) {
    this.config.usarIA = Boolean(usarIA);
    this.config.providerPreferencial = providerPreferencial || "gemini";
    this.config.usarFallbackLocal = Boolean(usarFallbackLocal);
  },

  async responder(mensagem, contexto = {}) {
    const textoOriginal = String(mensagem || "").trim();

    if (!textoOriginal) {
      return {
        origem: "local",
        resposta: "Não recebi nenhuma mensagem para responder."
      };
    }

    const local = tentarRespostaLocal(textoOriginal, contexto);
    if (local) {
      return {
        origem: "local",
        resposta: local
      };
    }

    if (this.config.usarIA) {
      const ia = await tentarRespostaComIA({
        mensagemOriginal: textoOriginal,
        contexto,
        providerPreferencial: this.config.providerPreferencial
      });

      if (ia.ok && ia.resposta) {
        return {
          origem: ia.origem,
          resposta: ia.resposta
        };
      }
    }

    if (this.config.usarFallbackLocal) {
      return {
        origem: "fallback",
        resposta: respostaFallback(textoOriginal, contexto)
      };
    }

    return {
      origem: "indisponivel",
      resposta: "A PedrIA ainda não conseguiu responder isso neste momento."
    };
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
