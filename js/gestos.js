const Gestos = {
  video: null,
  stream: null,
  ativo: false,
  intervalo: null,
  ultimoStatus: "",

  getStatusEl() {
    return document.getElementById("gestosStatus");
  },

  setStatus(texto) {
    this.ultimoStatus = texto;
    const el = this.getStatusEl();
    if (el) el.textContent = texto;
  },

  criarFallbackSeNecessario() {
    if (document.getElementById("gestosBox")) return;

    const box = document.createElement("section");
    box.id = "gestosBox";
    box.className = "gestos-box";
    box.innerHTML = `
      <div class="gestos-card">
        <h3>Controle por gestos</h3>
        <p>Base pronta para detecção por câmera.</p>
        <div class="gestos-video-wrap">
          <video id="gestosVideo" autoplay muted playsinline></video>
        </div>
        <div id="gestosStatus" class="gestos-status">Gestos aguardando inicialização.</div>
        <div class="gestos-actions">
          <button id="gestosIniciar" type="button">Iniciar gestos</button>
          <button id="gestosParar" type="button">Parar gestos</button>
        </div>
      </div>
    `;
    document.body.appendChild(box);
  },

  async iniciar() {
    if (this.ativo) return;

    this.criarFallbackSeNecessario();
    this.video = document.getElementById("gestosVideo");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador não suporta câmera para gestos.");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      this.ativo = true;
      this.setStatus("Câmera de gestos iniciada. A lógica de reconhecimento está pronta para expansão.");

      this.intervalo = setInterval(() => {
        this.detectarMock();
      }, 3000);
    } catch (error) {
      console.error("[Gestos] Erro ao iniciar:", error);
      this.setStatus(error.message || "Falha ao iniciar gestos.");
    }
  },

  detectarMock() {
    if (!this.ativo) return;

    const mensagens = [
      "Gestos ativos: monitorando câmera.",
      "Nenhum gesto reconhecido agora.",
      "Base pronta para integrar MediaPipe/Hand Landmarker."
    ];

    const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];
    this.setStatus(mensagem);
  },

  parar() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }

    this.ativo = false;
    this.setStatus("Gestos parados.");
  },

  bind() {
    document.getElementById("gestosIniciar")?.addEventListener("click", () => this.iniciar());
    document.getElementById("gestosParar")?.addEventListener("click", () => this.parar());
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Gestos.criarFallbackSeNecessario();
  Gestos.bind();
});

window.GestosBRASFLIX = Gestos;
export { Gestos };
