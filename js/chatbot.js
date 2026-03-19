import { AIEngine } from "./ai-engine.js";

const ChatbotBRASFLIX = {
  elementos: {},

  iniciar() {
    this.mapearElementos();
    this.criarFallbackSeNecessario();
    this.mapearElementos();

    if (!this.elementos.widget || !this.elementos.toggle || !this.elementos.window) {
      console.warn("[Chatbot] Estrutura não encontrada.");
      return;
    }

    this.bindEventos();

    if (!this.elementos.mensagens?.children?.length) {
      this.adicionarMensagem("bot", "Olá! Eu sou a PedrIA da BRASFLIX. Posso recomendar vídeos, explicar recursos da plataforma e ajudar com sua conta.");
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
  },

  criarFallbackSeNecessario() {
    if (this.elementos.widget) return;

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
        <form class="chatbot-form" id="chatbot-form">
          <input id="chatbot-input" class="chatbot-input" type="text" placeholder="Pergunte algo para a PedrIA" autocomplete="off">
          <button type="submit" class="chatbot-send-btn">🎬</button>
        </form>
      </div>
    `;
    document.body.appendChild(widget);
  },

  bindEventos() {
    this.elementos.toggle?.addEventListener("click", () => this.alternarPainel());
    this.elementos.close?.addEventListener("click", () => this.fecharPainel());
    this.elementos.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
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
    const mapa = { user: "chatbot-message-user", bot: "chatbot-message-bot", system: "chatbot-message-system" };
    bloco.className = `chatbot-message ${mapa[tipo] || "chatbot-message-bot"}`;
    bloco.innerHTML = String(texto || "").replace(/\n/g, "<br>");
    this.elementos.mensagens.appendChild(bloco);
    this.elementos.mensagens.scrollTop = this.elementos.mensagens.scrollHeight;
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
        system: "Você é a PedrIA da BRASFLIX. Ajude com recomendações, navegação na plataforma, conta, vídeos e recursos de acessibilidade."
      });

      this.removerMensagensSistema();

      if (!resposta?.sucesso) {
        this.adicionarMensagem("bot", resposta?.erro || "Não consegui responder agora.");
        return;
      }

      this.adicionarMensagem("bot", resposta.texto || "Sem resposta no momento.");
    } catch (error) {
      console.error("[Chatbot] Erro:", error);
      this.removerMensagensSistema();
      this.adicionarMensagem("bot", "Ocorreu um erro ao falar com a IA.");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => ChatbotBRASFLIX.iniciar());
window.ChatbotBRASFLIX = ChatbotBRASFLIX;
export { ChatbotBRASFLIX };
