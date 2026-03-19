class GeminiClient {
  constructor() {
    this.provider = "gemini";
    this.defaultModel = "gemini-1.5-flash";
  }

  async sendMessage({
    message,
    context = [],
    systemInstruction = "Você é o assistente inteligente da plataforma BRASFLIX. Responda em português do Brasil de forma clara, útil e objetiva.",
    model = this.defaultModel
  }) {
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: this.provider,
          model,
          prompt: message,
          context,
          systemInstruction
        })
      });

      const textoBruto = await response.text();
      let data = {};

      try {
        data = textoBruto ? JSON.parse(textoBruto) : {};
      } catch {
        throw new Error(textoBruto || "A resposta da IA não veio em JSON válido.");
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.text || data?.texto || "Erro ao chamar a IA Gemini.");
      }

      return {
        ok: true,
        provider: data.provider || data.origem || this.provider,
        model: data.model || model,
        text: data.text || data.texto || "Sem resposta da IA."
      };
    } catch (error) {
      console.error("[Gemini] Erro:", error);
      return {
        ok: false,
        provider: this.provider,
        model,
        text: "Não consegui responder agora. Tente novamente em instantes.",
        error: error.message
      };
    }
  }
}

const geminiClient = new GeminiClient();

window.GeminiClient = GeminiClient;
window.geminiClient = geminiClient;

export { GeminiClient, geminiClient };
