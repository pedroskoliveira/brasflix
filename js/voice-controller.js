const VoiceUI = {
  init() {
    this.widget = document.getElementById("voiceWidget");
    this.toggle = document.getElementById("voiceToggle");
    this.minimizar = document.getElementById("voiceMinimizar");
    this.status = document.getElementById("voiceStatus");
    this.btnOuvir = document.getElementById("btnOuvirComando");
    this.btnLer = document.getElementById("btnLerResposta");

    if (!this.widget || !this.toggle || !this.status) return;

    this.toggle.addEventListener("click", () => this.abrir());
    this.minimizar?.addEventListener("click", () => this.fechar());
    this.btnOuvir?.addEventListener("click", () => this.ouvirComando());
    this.btnLer?.addEventListener("click", () => this.lerUltimaMensagem());

    this.setStatus("Clique no microfone para abrir o assistente de voz.");
  },

  abrir() {
    this.widget.classList.remove("minimizado");
    this.setStatus("Assistente aberto. Você pode ouvir um comando ou pedir para ler a última resposta.");
  },

  fechar() {
    this.widget.classList.add("minimizado");
  },

  setStatus(texto, tipo = "") {
    if (!this.status) return;
    this.status.textContent = texto;
    this.status.classList.remove("ativo", "erro");
    if (tipo) this.status.classList.add(tipo);
  },

  lerUltimaMensagem() {
    const ultima = Array.from(document.querySelectorAll('#chatbot-messages .chatbot-message-bot, #chatbot-messages .chatbot-message-system')).pop();
    const texto = ultima?.textContent?.trim() || "Ainda não há resposta para eu ler.";
    this.falar(texto);
  },

  falar(texto) {
    if (!('speechSynthesis' in window)) {
      this.setStatus("Seu navegador não suporta leitura por voz.", "erro");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = localStorage.getItem('brasflix_lang') || 'pt-BR';
    window.speechSynthesis.speak(utter);
    this.setStatus("Lendo resposta em voz alta.", "ativo");
  },

  async ouvirComando() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.setStatus("Seu navegador não suporta reconhecimento de voz.", "erro");
      return;
    }

    const rec = new Recognition();
    rec.lang = localStorage.getItem('brasflix_lang') || 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    this.setStatus("Estou ouvindo... fale agora.", "ativo");

    rec.onresult = async (event) => {
      const texto = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!texto) {
        this.setStatus("Não consegui entender o comando.", "erro");
        return;
      }

      this.setStatus(`Comando ouvido: ${texto}`, "ativo");

      try {
        const motor = window.VoiceIntent;
        if (!motor) {
          this.setStatus("A lógica de voz não foi carregada.", "erro");
          return;
        }
        const intencao = motor.classificar(texto);
        const resultado = await motor.executarIntencao(intencao);
        const mensagem = resultado?.mensagem || "Comando executado.";
        this.setStatus(mensagem, resultado?.ok ? "ativo" : "erro");
        if (resultado?.mensagem && !resultado?.abrirChat) this.falar(mensagem);
      } catch (error) {
        console.error('[VoiceUI] Erro:', error);
        this.setStatus(error.message || 'Erro ao processar o comando.', 'erro');
      }
    };

    rec.onerror = () => this.setStatus("Erro ao ouvir o comando.", "erro");
    rec.onend = () => {
      if (this.status?.textContent === 'Estou ouvindo... fale agora.') {
        this.setStatus('Escuta finalizada.');
      }
    };

    rec.start();
  }
};

document.addEventListener('DOMContentLoaded', () => VoiceUI.init());
window.VoiceUI = VoiceUI;
export { VoiceUI };
