import { adminAuth, adminDb } from "./_lib/firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        message: "Sincronização de claims ignorada: token não enviado pelo front."
      });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const snap = await adminDb.collection("usuarios").doc(uid).get();
    const role = snap.exists ? (snap.data()?.role || "user") : "user";
    const isAdmin = role === "admin";

    await adminAuth.setCustomUserClaims(uid, {
      admin: isAdmin,
      role
    });

    return res.status(200).json({ ok: true, uid, role, admin: isAdmin });
  } catch (error) {
    console.error("[admin-sync-claims] Erro:", error);
    return res.status(500).json({ ok: false, error: error?.message || "Erro interno." });
  }
}

