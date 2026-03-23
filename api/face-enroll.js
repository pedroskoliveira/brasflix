import { adminAuth, adminDb } from "./_lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ ok: false, error: "Token ausente." });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { descriptor } = req.body || {};

    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        ok: false,
        error: "Descriptor facial inválido. Esperado array com 128 posições."
      });
    }

    const descriptorNumerico = descriptor.map((item) => Number(item));

    if (descriptorNumerico.some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        ok: false,
        error: "Descriptor facial contém valores inválidos."
      });
    }

    await adminDb.collection("usuarios").doc(uid).set(
      {
        uid,
        usuarioId: uid,
        faceDescriptor: descriptorNumerico,
        faceLoginEnabled: true,
        faceRegisteredAt: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      uid
    });
  } catch (error) {
    console.error("[face-enroll] Erro:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Erro interno ao cadastrar rosto."
    });
  }
}
