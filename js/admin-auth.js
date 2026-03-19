import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, getIdToken, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function sincronizarClaimsSeAdmin(user) {
  try {
    const token = await getIdToken(user, true);

    await fetch("/api/admin-sync-claims", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
  } catch (error) {
    console.warn("[AdminAuth] Não foi possível sincronizar claims agora:", error);
  }
}

function destacarMenuAtual() {
  const atual = window.location.pathname.split("/").pop();
  document.querySelectorAll("nav a, .sidebar a, .menu-admin a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.endsWith(atual)) link.classList.add("ativo");
  });
}

function conectarLogout() {
  const botoes = document.querySelectorAll("[data-admin-logout], .login, .btn-sair-admin");
  botoes.forEach((botao) => {
    botao.addEventListener("click", async (event) => {
      event.preventDefault();
      await signOut(auth);
      window.location.href = "../login.html";
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const role = snap.data()?.role || "user";

  if (role !== "admin") {
    window.location.href = "../index.html";
    return;
  }

  await sincronizarClaimsSeAdmin(user);

  try {
    await getIdTokenResult(user, true);
  } catch {}

  destacarMenuAtual();
  conectarLogout();
});
