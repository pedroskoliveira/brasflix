class MistralClient {
  constructor() {
    this.provider = "mistral";
    this.defaultModel = "mistral-small-latest";
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
        throw new Error(data?.error || data?.text || data?.texto || "Erro ao chamar a IA Mistral.");
      }

      return {
        ok: true,
        provider: data.provider || data.origem || this.provider,
        model: data.model || model,
        text: data.text || data.texto || "Sem resposta da IA."
      };
    } catch (error) {
      console.error("[Mistral] Erro:", error);
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

const mistralClient = new MistralClient();

window.MistralClient = MistralClient;
window.mistralClient = mistralClient;

export { MistralClient, mistralClient };
