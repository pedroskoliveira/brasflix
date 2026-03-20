import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const inputSecret = document.getElementById("setupAdminSecret");
const btnPromover = document.getElementById("btnPromoverPrimeiroAdmin");
const btnVerificar = document.getElementById("btnVerificarStatusAdmin");
const statusEl = document.getElementById("setupAdminStatus");
let currentUser = null;

function setStatus(texto, erro = false) {
  if (!statusEl) return;
  statusEl.textContent = texto;
  statusEl.style.color = erro ? "#ff8383" : "#d7e8d7";
}

async function verificarStatus() {
  if (!currentUser) return setStatus("Faça login primeiro.", true);
  const snap = await getDoc(doc(db, "usuarios", currentUser.uid));
  const role = snap.exists() ? (snap.data()?.role || "user") : "user";
  setStatus(`Usuário atual: ${currentUser.email || currentUser.uid}
Role atual: ${role}`);
}

async function promover() {
  if (!currentUser) return setStatus("Faça login primeiro.", true);
  const secret = inputSecret?.value?.trim();
  if (!secret) return setStatus("Informe o segredo de bootstrap.", true);

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch("/api/setup-first-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ secret })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Falha ao promover admin.");
    setStatus("Admin ativado com sucesso. Saia e entre novamente se necessário.");
  } catch (error) {
    console.error("[setup-admin] Erro:", error);
    setStatus(error.message || "Erro ao ativar admin.", true);
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user || null;
  setStatus(user ? `Logado como ${user.email || user.uid}` : "Faça login para continuar.");
});

btnPromover?.addEventListener("click", promover);
btnVerificar?.addEventListener("click", verificarStatus);
