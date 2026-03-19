import { adminAuth, adminDb } from "./_lib/firebase-admin.js";

function calcularDistanciaEuclidiana(vetorA = [], vetorB = []) {
  if (!Array.isArray(vetorA) || !Array.isArray(vetorB)) {
    return Number.POSITIVE_INFINITY;
  }

  if (vetorA.length === 0 || vetorB.length === 0 || vetorA.length !== vetorB.length) {
    return Number.POSITIVE_INFINITY;
  }

  let soma = 0;

  for (let i = 0; i < vetorA.length; i += 1) {
    const diferenca = Number(vetorA[i]) - Number(vetorB[i]);
    soma += diferenca * diferenca;
  }

  return Math.sqrt(soma);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {
    const { descriptor } = req.body || {};

    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Descriptor facial inválido."
      });
    }

    const descriptorAtual = descriptor.map((valor) => Number(valor));

    const snapshot = await adminDb
      .collection("usuarios")
      .where("faceLoginEnabled", "==", true)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        ok: false,
        error: "Nenhum rosto cadastrado para login facial."
      });
    }

    let melhorMatch = null;

    snapshot.forEach((documento) => {
      const dados = documento.data() || {};
      const embeddingSalvo = Array.isArray(dados.faceEmbedding) ? dados.faceEmbedding : [];
      const distancia = calcularDistanciaEuclidiana(descriptorAtual, embeddingSalvo);

      if (!melhorMatch || distancia < melhorMatch.distancia) {
        melhorMatch = {
          uid: documento.id,
          distancia,
          dados
        };
      }
    });

    const LIMIAR = 0.60;

    if (!melhorMatch || melhorMatch.distancia > LIMIAR) {
      return res.status(401).json({
        ok: false,
        error: "Rosto não reconhecido."
      });
    }

    const customToken = await adminAuth.createCustomToken(melhorMatch.uid, {
      authMethod: "face"
    });

    return res.status(200).json({
      ok: true,
      uid: melhorMatch.uid,
      score: melhorMatch.distancia,
      customToken
    });
  } catch (error) {
    console.error("[face-login] Erro:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno no login facial."
    });
  }
}