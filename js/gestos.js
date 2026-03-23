const Gestos = {
  elementos: {},
  stream: null,
  ativo: false,
  intervaloMock: null,

  iniciar() {
    this.mapear();

    if (!this.elementos.widget) {
      console.warn("[Gestos] Widget real não encontrado no HTML. Nenhum fallback será criado.");
      return;
    }

    this.removerFallbackAntigo();
    this.bind();
    this.aplicarEstadoInicial();
  },

  mapear() {
    this.elementos = {
      widget: document.getElementById("gestosWidget"),
      indicador: document.getElementById("gestosIndicador"),
      minimizar: document.getElementById("gestosMinimizar"),
      ativar: document.getElementById("ativarGestos"),
      desativar: document.getElementById("desativarGestos"),
      abrirTutorial: document.getElementById("abrirTutorialPainel"),
      gestoDetectado: document.getElementById("gestoDetectado"),
      webcam: document.getElementById("webcamGestos"),
      modalTutorial: document.getElementById("modalTutorialGestos"),
      fecharTutorial: document.getElementById("fecharTutorialGestos"),
      fecharOverlay: document.getElementById("fecharTutorialOverlay"),
      tutorialStatus: document.getElementById("tutorialStatusGesto")
    };
  },

  removerFallbackAntigo() {
    const fallbackIds = ["gestosBox", "gestosVideo", "gestosStatus", "gestosIniciar", "gestosParar"];
    fallbackIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const parent = el.closest("#gestosBox") || el;
        if (parent && parent.id === "gestosBox") {
          parent.remove();
        } else if (el.id === id) {
          el.remove();
        }
      }
    });

    document.querySelectorAll(".gestos-box, .gestos-card, .gestos-video-wrap, .gestos-actions").forEach((el) => {
      el.remove();
    });
  },

  bind() {
    this.elementos.indicador?.addEventListener("click", () => {
      this.elementos.widget?.classList.remove("minimizado");
    });

    this.elementos.minimizar?.addEventListener("click", () => {
      this.elementos.widget?.classList.add("minimizado");
    });

    this.elementos.ativar?.addEventListener("change", async (event) => {
      if (event.target.checked) {
        await this.ativarGestos();
      } else {
        this.desativarGestos();
      }
    });

    this.elementos.desativar?.addEventListener("click", () => {
      this.desativarGestos();
      if (this.elementos.ativar) {
        this.elementos.ativar.checked = false;
      }
    });

    this.elementos.abrirTutorial?.addEventListener("click", () => {
      this.abrirTutorial();
    });

    this.elementos.fecharTutorial?.addEventListener("click", () => {
      this.fecharTutorial();
    });

    this.elementos.fecharOverlay?.addEventListener("click", () => {
      this.fecharTutorial();
    });
  },

  aplicarEstadoInicial() {
    this.setTexto("Gestos aguardando inicialização.");
    this.elementos.widget?.classList.add("minimizado");
    this.elementos.indicador?.classList.add("oculto");
  },

  setTexto(texto) {
    if (this.elementos.gestoDetectado) {
      this.elementos.gestoDetectado.textContent = texto;
    }

    if (this.elementos.tutorialStatus) {
      this.elementos.tutorialStatus.textContent = texto;
    }
  },

  async ativarGestos() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador não suporta câmera para gestos.");
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      if (this.elementos.webcam) {
        this.elementos.webcam.srcObject = this.stream;
        await this.elementos.webcam.play().catch(() => {});
      }

      this.ativo = true;
      this.setTexto("Gestos ativos. Câmera iniciada com sucesso.");
      this.elementos.indicador?.classList.remove("oculto");

      if (this.intervaloMock) {
        clearInterval(this.intervaloMock);
      }

      this.intervaloMock = setInterval(() => {
        if (!this.ativo) return;
        this.setTexto("Gestos ativos. Estrutura pronta para reconhecimento.");
      }, 3000);
    } catch (error) {
      console.error("[Gestos] Erro ao ativar:", error);
      this.setTexto(error.message || "Erro ao ativar gestos.");
      this.ativo = false;
    }
  },

  desativarGestos() {
    if (this.intervaloMock) {
      clearInterval(this.intervaloMock);
      this.intervaloMock = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.elementos.webcam) {
      this.elementos.webcam.srcObject = null;
    }

    this.ativo = false;
    this.setTexto("Gestos desativados.");
    this.elementos.indicador?.classList.add("oculto");
  },

  abrirTutorial() {
    this.elementos.modalTutorial?.classList.remove("oculto");
    this.setTexto("Tutorial aberto. A detecção real pode ser expandida depois.");
  },

  fecharTutorial() {
    this.elementos.modalTutorial?.classList.add("oculto");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Gestos.iniciar();
});

window.GestosBRASFLIX = Gestos;
export { Gestos };
