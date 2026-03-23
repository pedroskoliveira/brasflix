import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  getIdToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const inputSecret = document.getElementById("setupAdminSecret");
const btnPromover = document.getElementById("btnPromoverPrimeiroAdmin");
const btnVerificar = document.getElementById("btnVerificarStatusAdmin");
const statusEl = document.getElementById("setupAdminStatus");

let currentUser = null;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.borderColor = isError ? "#5a1f1f" : "#1f3f28";
  statusEl.style.background = isError ? "#1a0f0f" : "#0f1711";
  statusEl.style.color = isError ? "#ffb4b4" : "#b8f3c9";
}

async function safeJson(response) {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      ok: false,
      error: raw || "Resposta inválida do servidor."
    };
  }
}

async function verificarStatus() {
  if (!currentUser) {
    setStatus("Faça login antes de verificar seu status.", true);
    return;
  }

  try {
    const snap = await getDoc(doc(db, "usuarios", currentUser.uid));
    const dados = snap.exists() ? snap.data() || {} : {};
    const role = dados.role || "user";

    setStatus(
      `Usuário autenticado: ${currentUser.email || currentUser.uid}\nRole atual no Firestore: ${role}\nUID: ${currentUser.uid}`,
      false
    );
  } catch (error) {
    console.error("[SetupAdmin] Erro ao verificar status:", error);
    setStatus(error.message || "Falha ao verificar status.", true);
  }
}

async function promoverPrimeiroAdmin() {
  if (!currentUser) {
    setStatus("Faça login antes de promover o primeiro admin.", true);
    return;
  }

  const secret = inputSecret?.value?.trim();

  if (!secret) {
    setStatus("Informe o valor de SETUP_ADMIN_SECRET.", true);
    return;
  }

  try {
    setStatus("Promovendo usuário para admin...");

    const token = await getIdToken(currentUser, true);

    const response = await fetch("/api/setup-first-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ secret })
    });

    const data = await safeJson(response);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Falha ao promover o primeiro admin.");
    }

    setStatus(
      `Primeiro admin configurado com sucesso.\nUID: ${data.uid}\nRole: ${data.role}\nAgora acesse admin/dashboard.html ou admin/videos.html.`,
      false
    );
  } catch (error) {
    console.error("[SetupAdmin] Erro ao promover admin:", error);
    setStatus(error.message || "Falha ao configurar o primeiro admin.", true);
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!user) {
    setStatus("Nenhum usuário autenticado. Faça login e volte para esta página.", true);
    return;
  }

  await verificarStatus();
});

btnVerificar?.addEventListener("click", verificarStatus);
btnPromover?.addEventListener("click", promoverPrimeiroAdmin);
