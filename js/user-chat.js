export const ChatUsuarios = {
  iniciar() {
    console.log("[ChatUsuarios] Módulo inicializado");
  },

  formatarTempo(timestamp) {
    if (!timestamp) return "";

    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const agora = Date.now();
    const diferencaSegundos = Math.floor((agora - data.getTime()) / 1000);

    if (diferencaSegundos < 60) return "Agora";
    if (diferencaSegundos < 3600) return `${Math.floor(diferencaSegundos / 60)}m`;
    if (diferencaSegundos < 86400) return `${Math.floor(diferencaSegundos / 3600)}h`;
    if (diferencaSegundos < 604800) return `${Math.floor(diferencaSegundos / 86400)}d`;

    return data.toLocaleDateString("pt-BR");
  },

  validarMensagem(texto) {
    if (!texto || typeof texto !== "string") return false;
    const textoLimpo = texto.trim();
    return textoLimpo.length > 0 && textoLimpo.length <= 1000;
  },

  sanitizarMensagem(texto) {
    if (typeof texto !== "string") return "";

    return texto
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .substring(0, 1000);
  },

  obterNomeExibicao(usuario = {}) {
    return usuario.nome || usuario.displayName || usuario.email || usuario.uid || "Usuário";
  },

  ordenarParticipantes(uid1, uid2) {
    return [uid1, uid2].filter(Boolean).sort().join("_");
  },

  gerarRoomId(uid1, uid2) {
    return this.ordenarParticipantes(uid1, uid2);
  },

  contatoEhValido(contato = {}) {
    if (!contato || typeof contato !== "object") return false;
    const uid = String(contato.uid || contato.id || "").trim();
    return uid.length > 0;
  },

  ehConversaPropria(uidAtual, uidOutro) {
    return !!uidAtual && !!uidOutro && uidAtual === uidOutro;
  },

  normalizarContato(contato = {}) {
    return {
      uid: String(contato.uid || contato.id || "").trim(),
      nome: String(contato.nome || contato.displayName || "").trim(),
      email: String(contato.email || "").trim(),
      fotoURL: String(contato.fotoURL || contato.avatar || contato.photoURL || "").trim()
    };
  },

  salaEhValida(sala) {
    if (!sala || typeof sala !== "object") return false;
    if (!Array.isArray(sala.participantes)) return false;
    if (typeof sala.participantesOrdenados !== "string") return false;
    return sala.participantes.length >= 2;
  },

  limitarTexto(texto, tamanhoMaximo = 1000) {
    if (typeof texto !== "string") return "";
    return texto.trim().substring(0, tamanhoMaximo);
  }
};

if (typeof window !== "undefined") {
  window.ChatUsuarios = ChatUsuarios;
  ChatUsuarios.iniciar();
}

export default ChatUsuarios;
