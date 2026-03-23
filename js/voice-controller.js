import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase-config.js";
import VoiceIntent from "./voice-intent.js";
import { PedriaCore } from "./pedria-core.js";

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const SpeechSynthesisAPI = window.speechSynthesis || null;

function falar(texto = "") {
  if (!SpeechSynthesisAPI || !texto) return;
  SpeechSynthesisAPI.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  utterance.pitch = 1;
  SpeechSynthesisAPI.speak(utterance);
}

function paginaAtual() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("perfil")) return "perfil";
  if (path.includes("usuarios")) return "usuarios";
  if (path.includes("analytics")) return "analytics";
  if (path.includes("face")) return "face";
  if (path.includes("video")) return "video";
  if (path.includes("login")) return "login";
  return "index";
}

async function executarIntent(resultado) {
  switch (resultado.intent) {
    case "navigate":
      window.location.href = resultado.target;
      return { ok: true, resposta: `Abrindo ${resultado.target.replace(".html", "")}.` };

    case "logout":
      await signOut(auth);
      window.location.href = "login.html";
      return { ok: true, resposta: "Saindo da sua conta." };

    case "open_chat":
      if (window.BrasflixUserChat?.openPanel) {
        window.BrasflixUserChat.openPanel();
        return { ok: true, resposta: "Abrindo o chat entre usuários." };
      }
      return { ok: false, resposta: "O chat não está disponível nesta página." };

    case "pedria_help":
      return {
        ok: true,
        resposta: "Posso ajudar com vídeos, perfil, pessoas, analytics, login facial, admin, navegação, data, hora e previsão do tempo."
      };

    case "ask_ai": {
      const ia = await PedriaCore.responder(resultado.prompt, {
        pagina: paginaAtual(),
        origem: "voz"
      });
      return { ok: true, resposta: ia?.resposta || "Não consegui responder agora." };
    }

    default:
      return { ok: false, resposta: "Não entendi esse comando." };
  }
}

export const VoiceController = {
  recognition: null,
  ouvindo: false,
  ultimoTexto: "",

  suportado() {
    return !!SpeechRecognitionAPI;
  },

  falar,

  iniciarReconhecimento({ onStart = () => {}, onEnd = () => {}, onError = () => {}, onResult = () => {} } = {}) {
    if (!SpeechRecognitionAPI) {
      onError(new Error("Reconhecimento de voz não suportado neste navegador."));
      return;
    }

    if (this.ouvindo) return;

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.lang = "pt-BR";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.ouvindo = true;
      onStart();
    };

    this.recognition.onend = () => {
      this.ouvindo = false;
      onEnd();
    };

    this.recognition.onerror = (event) => {
      this.ouvindo = false;
      onError(new Error(event?.error || "Erro no reconhecimento de voz."));
    };

    this.recognition.onresult = async (event) => {
      const texto = event?.results?.[0]?.[0]?.transcript || "";
      this.ultimoTexto = texto;
      const intent = VoiceIntent.interpretar(texto);
      const exec = await executarIntent(intent);
      onResult({ texto, intent, exec });
    };

    this.recognition.start();
  },

  pararReconhecimento() {
    if (this.recognition && this.ouvindo) {
      this.recognition.stop();
    }
  }
};

window.VoiceController = VoiceController;
export default VoiceController;
