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
      contexto = {}
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Prompt vazio"
      });
    }

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
        (Array.isArray(context) && context.length)
          ? `Contexto: ${JSON.stringify(context)}`
          : (Object.keys(contexto || {}).length ? `Contexto: ${JSON.stringify(contexto)}` : ""),
        `Pergunta: ${prompt}`
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
          error: data?.error?.message || JSON.stringify(data)
        });
      }

      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      return res.status(200).json({
        ok: true,
        ok: true,
        provider: "gemini",
        text: answer,
        raw: data
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

    if (Object.keys(contexto || {}).length > 0) {
      messages.push({
        role: "system",
        content: `[CONTEXTO]\n${JSON.stringify(contexto, null, 2)}`
      });
    }

    messages.push({
      role: "user",
      content: prompt.trim()
    });

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.message || JSON.stringify(data)
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      ok: true,
      provider: "mistral",
      text: answer,
      raw: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Erro interno"
    });
  }
} }
}
