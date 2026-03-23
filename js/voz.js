import VoiceController from "./voice-controller.js";

const VozWidget = {
  elementos: {},
  ultimaResposta: "",

  iniciar() {
    this.mapear();

    if (!this.elementos.widget) {
      console.warn("[Voz] Widget de voz não encontrado no HTML.");
      return;
    }

    this.bind();
    this.setStatus(
      VoiceController.suportado()
        ? "Pronto para ouvir."
        : "Reconhecimento de voz não suportado neste navegador."
    );
  },

  mapear() {
    this.elementos = {
      widget: document.getElementById("voiceWidget"),
      panel: document.querySelector("#voiceWidget .voice-panel"),
      toggle: document.getElementById("voiceToggle"),
      minimizar: document.getElementById("voiceMinimizar"),
      status: document.getElementById("voiceStatus"),
      btnOuvir: document.getElementById("btnOuvirComando"),
      btnLer: document.getElementById("btnLerResposta")
    };
  },

  bind() {
    this.elementos.toggle?.addEventListener("click", () => this.abrir());
    this.elementos.minimizar?.addEventListener("click", () => this.fechar());

    this.elementos.btnOuvir?.addEventListener("click", () => {
      if (!VoiceController.suportado()) {
        this.setStatus("Reconhecimento de voz não suportado neste navegador.", true);
        return;
      }

      VoiceController.iniciarReconhecimento({
        onStart: () => {
          this.setStatus("Ouvindo comando...");
          this.elementos.status?.classList.add("ativo");
          this.elementos.status?.classList.remove("erro");
        },

        onEnd: () => {
          this.elementos.status?.classList.remove("ativo");
          this.setStatus("Pronto para ouvir.");
        },

        onError: (error) => {
          console.error("[Voz] Erro:", error);
          this.setStatus(error.message || "Erro ao ouvir.", true);
        },

        onResult: ({ texto, exec }) => {
          const resposta = exec?.resposta || "Sem resposta.";
          this.ultimaResposta = resposta;
          this.setStatus(`Comando: ${texto}\nResposta: ${resposta}`);
        }
      });
    });

    this.elementos.btnLer?.addEventListener("click", () => {
      if (!this.ultimaResposta) {
        this.setStatus("Ainda não existe resposta para ler.");
        return;
      }

      VoiceController.falar(this.ultimaResposta);
    });
  },

  abrir() {
    this.elementos.widget?.classList.remove("minimizado");
  },

  fechar() {
    this.elementos.widget?.classList.add("minimizado");
  },

  setStatus(texto, isError = false) {
    if (!this.elementos.status) return;

    this.elementos.status.textContent = texto;

    this.elementos.status.classList.remove("erro");
    if (isError) {
      this.elementos.status.classList.add("erro");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  VozWidget.iniciar();
});

window.VozWidgetBRASFLIX = VozWidget;
export { VozWidget };
