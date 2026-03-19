export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido"
    });
  }

  try {
    const {
      provider = "mistral",
      prompt = "",
      systemInstruction = "",
      context = [],
      contexto = {}
    } = req.body || {};

    if (!String(prompt || "").trim()) {
      return res.status(400).json({
        ok: false,
        error: "Prompt vazio"
      });
    }

    const contextoNormalizado =
      Array.isArray(context) && context.length
        ? context
        : Object.keys(contexto || {}).length
          ? [{ role: "system", content: JSON.stringify(contexto) }]
          : [];

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          ok: false,
          error: "GEMINI_API_KEY ausente"
        });
      }

      const textoFinal = [
        systemInstruction?.trim() || "",
        contextoNormalizado.length
          ? "Contexto adicional:\n" +
            contextoNormalizado
              .map((item) => `- ${item.role || "system"}: ${item.content || ""}`)
              .join("\n")
          : "",
        `Pergunta: ${String(prompt).trim()}`
      ].filter(Boolean).join("\n\n");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: textoFinal }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          provider: "gemini",
          error: data?.error?.message || "Falha ao chamar o Gemini."
        });
      }

      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      return res.status(200).json({
        ok: true,
        provider: "gemini",
        text: answer,
        model: "gemini-1.5-flash"
      });
    }

    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "MISTRAL_API_KEY ausente"
      });
    }

    const messages = [];

    if (systemInstruction?.trim()) {
      messages.push({
        role: "system",
        content: systemInstruction.trim()
      });
    }

    for (const item of contextoNormalizado) {
      if (!item?.content) continue;
      messages.push({
        role: item.role || "system",
        content: String(item.content)
      });
    }

    messages.push({
      role: "user",
      content: String(prompt).trim()
    });

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        provider: "mistral",
        error: data?.message || data?.error?.message || "Falha ao chamar o Mistral."
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      ok: true,
      provider: "mistral",
      text: answer,
      model: "mistral-small-latest"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Erro interno"
    });
  }
}
