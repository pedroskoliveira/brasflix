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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao chamar a IA Mistral.");
      }

      return {
        ok: true,
        provider: data.provider || this.provider,
        model: data.model || model,
        text: data.text || "Sem resposta da IA."
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