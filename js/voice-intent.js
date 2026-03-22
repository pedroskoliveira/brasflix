function normalizarTexto(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesAny(texto, termos = []) {
  return termos.some((termo) => texto.includes(termo));
}

export const VoiceIntent = {
  interpretar(textoOriginal = "") {
    const texto = normalizarTexto(textoOriginal);

    if (!texto) {
      return { intent: "none", confidence: 0, original: textoOriginal };
    }

    if (includesAny(texto, ["abrir perfil", "ir para perfil", "meu perfil"])) {
      return { intent: "navigate", confidence: 0.98, target: "perfil.html", original: textoOriginal };
    }

    if (includesAny(texto, ["abrir videos", "abrir videos", "ir para videos", "pagina de videos"])) {
      return { intent: "navigate", confidence: 0.98, target: "video.html", original: textoOriginal };
    }

    if (includesAny(texto, ["abrir pessoas", "ir para pessoas", "comunidade", "usuarios"])) {
      return { intent: "navigate", confidence: 0.98, target: "usuarios.html", original: textoOriginal };
    }

    if (includesAny(texto, ["abrir analytics", "ir para analytics"])) {
      return { intent: "navigate", confidence: 0.98, target: "analytics.html", original: textoOriginal };
    }

    if (includesAny(texto, ["abrir face", "login facial", "cadastro facial"])) {
      return { intent: "navigate", confidence: 0.98, target: "face.html", original: textoOriginal };
    }

    if (includesAny(texto, ["sair", "encerrar sessao", "fazer logout"])) {
      return { intent: "logout", confidence: 0.99, original: textoOriginal };
    }

    if (includesAny(texto, ["abrir chat", "falar com usuarios", "chat"])) {
      return { intent: "open_chat", confidence: 0.95, original: textoOriginal };
    }

    if (includesAny(texto, ["o que voce faz", "o que você faz", "o que consegue fazer"])) {
      return { intent: "pedria_help", confidence: 0.92, original: textoOriginal };
    }

    return {
      intent: "ask_ai",
      confidence: 0.75,
      prompt: textoOriginal,
      original: textoOriginal
    };
  }
};

window.VoiceIntent = VoiceIntent;
export default VoiceIntent;
