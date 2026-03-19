import { admin, adminAuth, adminDb } from "./_lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Token de autenticação ausente."
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const { descriptor } = req.body || {};

    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Descriptor facial inválido."
      });
    }

    const descriptorNumerico = descriptor.map((valor) => Number(valor));

    await adminDb.collection("usuarios").doc(uid).set(
      {
        usuarioId: uid,
        faceLoginEnabled: true,
        faceEmbedding: descriptorNumerico,
        faceEmbeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      message: "Rosto cadastrado com sucesso."
    });
  } catch (error) {
    console.error("[face-enroll] Erro:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Erro interno ao cadastrar rosto."
    });
  }
}