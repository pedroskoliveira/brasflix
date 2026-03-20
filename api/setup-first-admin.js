import { adminAuth, adminDb } from "./_lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  try {
    const secretExpected = process.env.SETUP_ADMIN_SECRET || "";
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const secretReceived = String(req.body?.secret || "");

    if (!secretExpected) {
      return res.status(500).json({ ok: false, error: "SETUP_ADMIN_SECRET ausente na Vercel." });
    }
    if (!token) {
      return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
    }
    if (secretReceived !== secretExpected) {
      return res.status(403).json({ ok: false, error: "Segredo inválido." });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const adminUsers = await adminDb.collection("usuarios").where("role", "==", "admin").limit(1).get();
    if (!adminUsers.empty) {
      const alreadyAdmin = await adminDb.collection("usuarios").doc(uid).get();
      if (!alreadyAdmin.exists || (alreadyAdmin.data()?.role || "user") !== "admin") {
        return res.status(409).json({ ok: false, error: "Já existe um administrador. Use o admin-setter." });
      }
    }

    await adminDb.collection("usuarios").doc(uid).set({
      usuarioId: uid,
      uid,
      email: decoded.email || "",
      role: "admin",
      atualizadoEm: new Date()
    }, { merge: true });

    await adminAuth.setCustomUserClaims(uid, { admin: true, role: "admin" });

    return res.status(200).json({ ok: true, uid, role: "admin" });
  } catch (error) {
    console.error("[setup-first-admin] Erro:", error);
    return res.status(500).json({ ok: false, error: error?.message || "Erro interno." });
  }
}
