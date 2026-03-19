import { AIEngine } from "./ai-engine.js";

const TOPICOS = [
  { label: "Vídeos", prompt: "Quais vídeos ou conteúdos você me recomenda agora na BRASFLIX?" },
  { label: "Perfil", prompt: "Como eu vejo e edito meu perfil na BRASFLIX?" },
  { label: "Analytics", prompt: "Explique o que aparece na página de analytics da BRASFLIX." },
  { label: "Login", prompt: "Como faço login, cadastro e recuperação de senha na BRASFLIX?" },
  { label: "Admin", prompt: "Como funciona o acesso de administrador na BRASFLIX?" }
];

function escaparHtml(texto = "") {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const ChatbotBRASFLIX = {
  elementos: {},
  ultimaResposta: "",
  primeiraMensagemInserida: false,

  iniciar() {
    this.criarFallbackSeNecessario();
    this.mapearElementos();
    this.injetarTopicosRapidos();
    this.bindEventos();

    if (this.elementos.mensagens && !this.elementos.mensagens.children.length) {
      this.adicionarMensagem(
        "bot",
        "Olá! Eu sou a PedrIA da BRASFLIX. Posso recomendar vídeos, explicar recursos da plataforma, ajudar com sua conta e orientar sobre o painel admin."
      );
    }
  },

  mapearElementos() {
    this.elementos.widget = document.getElementById("chatbot-widget");
    this.elementos.toggle = document.getElementById("chatbot-toggle");
    this.elementos.window = document.getElementById("chatbot-window");
    this.elementos.close = document.getElementById("chatbot-close");
    this.elementos.form = document.getElementById("chatbot-form");
    this.elementos.input = document.getElementById("chatbot-input");
    this.elementos.mensagens = document.getElementById("chatbot-messages");
    this.elementos.topicos = document.getElementById("chatbot-topics");
  },

  criarFallbackSeNecessario() {
    if (document.getElementById("chatbot-widget")) return;

    const widget = document.createElement("div");
    widget.className = "chatbot-widget";
    widget.id = "chatbot-widget";
    widget.innerHTML = `
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Abrir chat com PedrIA" type="button">💭</button>
      <div class="chatbot-window" id="chatbot-window">
        <header class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">😎</div>
            <div>
              <div class="chatbot-title">PedrIA</div>
              <div class="chatbot-subtitle">Assistente do Brasflix</div>
            </div>
          </div>
          <button class="chatbot-close" id="chatbot-close" aria-label="Fechar chat" type="button">❌</button>
        </header>
        <div class="chatbot-messages" id="chatbot-messages"></div>
        <div class="chatbot-topics" id="chatbot-topics"></div>
        <form class="chatbot-form" id="chatbot-form">
          <input id="chatbot-input" class="chatbot-input" type="text" placeholder="Pergunte algo para a PedrIA" autocomplete="off">
          <button type="submit" class="chatbot-send-btn">🎬</button>
        </form>
      </div>
    `;
    document.body.appendChild(widget);
  },

  injetarTopicosRapidos() {
    if (!this.elementos.topicos && this.elementos.window) {
      const barra = document.createElement("div");
      barra.id = "chatbot-topics";
      barra.className = "chatbot-topics";
      this.elementos.window.insertBefore(barra, this.elementos.form);
      this.elementos.topicos = barra;
    }

    if (!this.elementos.topicos) return;

    this.elementos.topicos.innerHTML = TOPICOS.map(
      (item) =>
        `<button class="chatbot-topic-btn" type="button" data-prompt="${escaparHtml(item.prompt)}">${escaparHtml(
          item.label
        )}</button>`
    ).join("");
  },

  bindEventos() {
    this.elementos.toggle?.addEventListener("click", () => this.alternarPainel());
    this.elementos.close?.addEventListener("click", () => this.fecharPainel());
    this.elementos.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.enviarMensagem();
    });

    this.elementos.topicos?.addEventListener("click", async (event) => {
      const botao = event.target.closest(".chatbot-topic-btn");
      if (!botao) return;
      const prompt = botao.dataset.prompt?.trim();
      if (!prompt) return;
      this.abrirPainel();
      this.elementos.input.value = prompt;
      await this.enviarMensagem();
    });
  },

  abrirPainel() {
    this.elementos.widget?.classList.add("aberto");
  },

  fecharPainel() {
    this.elementos.widget?.classList.remove("aberto");
  },

  alternarPainel() {
    if (!this.elementos.widget) return;
    this.elementos.widget.classList.toggle("aberto");
  },

  adicionarMensagem(tipo, texto) {
    if (!this.elementos.mensagens) return;

    const bloco = document.createElement("div");
    const mapa = {
      user: "chatbot-message-user",
      bot: "chatbot-message-bot",
      system: "chatbot-message-system"
    };

    bloco.className = `chatbot-message ${mapa[tipo] || "chatbot-message-bot"}`;
    bloco.innerHTML = escaparHtml(String(texto || "")).replace(/\n/g, "<br>");
    this.elementos.mensagens.appendChild(bloco);

    if (tipo !== "system") {
      this.ultimaResposta = tipo === "bot" ? String(texto || "") : this.ultimaResposta;
    }

    if (this.primeiraMensagemInserida) {
      this.elementos.mensagens.scrollTop = this.elementos.mensagens.scrollHeight;
    } else {
      this.primeiraMensagemInserida = true;
      this.elementos.mensagens.scrollTop = 0;
    }
  },

  removerMensagensSistema() {
    this.elementos.mensagens?.querySelectorAll(".chatbot-message-system").forEach((item) => item.remove());
  },

  async enviarMensagem() {
    const texto = this.elementos.input?.value?.trim();
    if (!texto) return;

    this.adicionarMensagem("user", texto);
    this.elementos.input.value = "";
    this.adicionarMensagem("system", "Pensando...");

    try {
      const resposta = await AIEngine.gerar({
        prompt: texto,
        provider: "gemini",
        incluirContextoUsuario: true,
        system:
          "Você é a PedrIA da BRASFLIX. Ajude com recomendações, navegação na plataforma, conta, vídeos, analytics e acesso admin."
      });

      this.removerMensagensSistema();

      if (!resposta?.sucesso) {
        this.adicionarMensagem(
          "bot",
          resposta?.erro || "Não consegui responder agora. Verifique as chaves da IA ou tente novamente em instantes."
        );
        return;
      }

      this.adicionarMensagem("bot", resposta.texto || "Sem resposta no momento.");
    } catch (error) {
      console.error("[Chatbot] Erro:", error);
      this.removerMensagensSistema();
      this.adicionarMensagem("bot", error?.message || "Ocorreu um erro ao falar com a IA.");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => ChatbotBRASFLIX.iniciar());
window.ChatbotBRASFLIX = ChatbotBRASFLIX;

export { ChatbotBRASFLIX };

