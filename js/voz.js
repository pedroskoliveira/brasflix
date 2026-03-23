import VoiceController from "./voice-controller.js";

function criarFallbackSeNecessario() {
  if (document.getElementById("voz-widget")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "voz-widget";
  wrapper.id = "voz-widget";
  wrapper.innerHTML = `
    <button id="voz-toggle" class="voz-toggle" aria-label="Abrir assistente por voz" type="button">🎙️</button>
    <div id="voz-panel" class="voz-panel" aria-hidden="true">
      <header class="voz-header">
        <div>
          <div class="voz-title">Assistente por voz</div>
          <div class="voz-subtitle">Comandos e leitura da PedrIA</div>
        </div>
        <button id="voz-close" class="voz-close" type="button">−</button>
      </header>

      <div id="voz-status" class="voz-status">Pronto para ouvir.</div>

      <div class="voz-actions">
        <button id="voz-ouvir" class="voz-btn voz-btn-primary" type="button">Ouvir comando</button>
        <button id="voz-falar" class="voz-btn" type="button">Ler resposta</button>
      </div>

      <div class="voz-bloco">
        <div class="voz-bloco-titulo">Exemplos</div>
        <div class="voz-bloco-texto">
          Diga: “abrir perfil”, “abrir favoritos”, “abrir analytics” ou envie perguntas para a PedrIA por voz.
        </div>
      </div>

      <div id="voz-transcricao" class="voz-bloco">
        <div class="voz-bloco-titulo">Último comando</div>
        <div class="voz-bloco-texto">Nenhum comando ainda.</div>
      </div>

      <div id="voz-resposta" class="voz-bloco">
        <div class="voz-bloco-titulo">Resposta</div>
        <div class="voz-bloco-texto">Aguardando interação.</div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
}

const VozWidget = {
  elementos: {},
  ultimaResposta: "",

  iniciar() {
    criarFallbackSeNecessario();
    this.mapear();
    this.bind();
    this.setStatus(
      VoiceController.suportado()
        ? "Pronto para ouvir."
        : "Reconhecimento de voz não suportado neste navegador."
    );
  },

  mapear() {
    this.elementos = {
      widget: document.getElementById("voz-widget"),
      toggle: document.getElementById("voz-toggle"),
      panel: document.getElementById("voz-panel"),
      close: document.getElementById("voz-close"),
      btnOuvir: document.getElementById("voz-ouvir"),
      btnFalar: document.getElementById("voz-falar"),
      status: document.getElementById("voz-status"),
      transcricao: document.querySelector("#voz-transcricao .voz-bloco-texto"),
      resposta: document.querySelector("#voz-resposta .voz-bloco-texto")
    };
  },

  bind() {
    this.elementos.toggle?.addEventListener("click", () => this.abrir());
    this.elementos.close?.addEventListener("click", () => this.fechar());

    this.elementos.btnOuvir?.addEventListener("click", () => {
      if (!VoiceController.suportado()) {
        this.setStatus("Reconhecimento de voz não suportado neste navegador.");
        return;
      }

      VoiceController.iniciarReconhecimento({
        onStart: () => this.setStatus("Ouvindo..."),
        onEnd: () => this.setStatus("Pronto para ouvir."),
        onError: (error) => {
          console.error("[Voz] Erro:", error);
          this.setStatus(error.message || "Erro ao ouvir.", true);
        },
        onResult: ({ texto, exec }) => {
          this.setTranscricao(texto || "Nenhum texto reconhecido.");
          this.setResposta(exec?.resposta || "Sem resposta.");
          if (exec?.resposta) {
            this.ultimaResposta = exec.resposta;
          }
        }
      });
    });

    this.elementos.btnFalar?.addEventListener("click", () => {
      const texto = this.ultimaResposta || this.elementos.resposta?.textContent || "";
      if (!texto) return;
      VoiceController.falar(texto);
    });
  },

  abrir() {
    this.elementos.widget?.classList.add("aberto");
    this.elementos.panel?.setAttribute("aria-hidden", "false");
  },

  fechar() {
    this.elementos.widget?.classList.remove("aberto");
    this.elementos.panel?.setAttribute("aria-hidden", "true");
  },

  setStatus(texto, isError = false) {
    if (!this.elementos.status) return;
    this.elementos.status.textContent = texto;
    this.elementos.status.style.borderColor = isError ? "#5a1f1f" : "#2a2a2a";
  },

  setTranscricao(texto) {
    if (this.elementos.transcricao) {
      this.elementos.transcricao.textContent = texto;
    }
  },

  setResposta(texto) {
    if (this.elementos.resposta) {
      this.elementos.resposta.textContent = texto;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => VozWidget.iniciar());

window.VozWidgetBRASFLIX = VozWidget;
export { VozWidget };
