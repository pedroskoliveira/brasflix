import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const userNome = document.getElementById("userNome");

function mostrarLogin() {
  if (loginButton) loginButton.classList.remove("oculto");
  if (logoutButton) logoutButton.classList.add("oculto");

  if (userNome) {
    userNome.classList.add("oculto");
    userNome.textContent = "";
  }
}

function mostrarUsuario(nome) {
  if (loginButton) loginButton.classList.add("oculto");
  if (logoutButton) logoutButton.classList.remove("oculto");

  if (userNome) {
    userNome.classList.remove("oculto");
    userNome.textContent = `Olá, ${nome}`;
  }
}

async function buscarNomeUsuario(uid, fallbackEmail = "") {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));

    if (!snap.exists()) {
      return fallbackEmail || "Usuário";
    }

    const dados = snap.data() || {};
    return dados.nome || dados.email || fallbackEmail || "Usuário";
  } catch (error) {
    console.error("[Navbar] Erro ao buscar usuário:", error);
    return fallbackEmail || "Usuário";
  }
}

async function atualizarNavbar(user) {
  if (!user) {
    mostrarLogin();
    return;
  }

  const nome = await buscarNomeUsuario(user.uid, user.email || "");
  mostrarUsuario(nome);
}

if (loginButton) {
  loginButton.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("faceLoginUser");
      localStorage.removeItem("faceLoginEmail");
      window.location.href = "login.html";
    } catch (error) {
      console.error("[Navbar] Erro ao sair:", error);
      alert("Não foi possível sair agora.");
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  await atualizarNavbar(user);
});