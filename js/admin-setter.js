import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const inputUid = document.getElementById("userUid");
const inputEmail = document.getElementById("userEmail");
const selectRole = document.getElementById("userRole");
const statusEl = document.getElementById("result");
const btnSetRole = document.getElementById("setRoleBtn");
const btnRemove = document.getElementById("removeBtn");
const btnLoadUsers = document.getElementById("loadUsersBtn");
const usersList = document.getElementById("usersList");
const loggedUserInfo = document.getElementById("loggedUserInfo");

let currentUser = null;
let isCurrentUserAdmin = false;

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#ff4d4f" : "#22c55e";
}

function renderLoggedUser(user, dados = {}) {
  if (!loggedUserInfo) return;
  loggedUserInfo.textContent = user
    ? `${dados.nome || user.displayName || user.email || user.uid} • role: ${dados.role || "user"}`
    : "Nenhum usuário logado";
}

async function buscarUsuarioPorUid(uid) {
  if (!uid) return null;
  const refUsuario = doc(db, "usuarios", uid);
  const snap = await getDoc(refUsuario);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function buscarUsuarioPorEmail(email) {
  if (!email) return null;
  const consulta = query(collection(db, "usuarios"), where("email", "==", email), limit(1));
  const snapshot = await getDocs(consulta);
  if (snapshot.empty) return null;
  const primeiro = snapshot.docs[0];
  return { id: primeiro.id, ...primeiro.data() };
}

function preencherFormularioUsuario(usuario) {
  if (!usuario) return;
  if (inputUid) inputUid.value = usuario.uid || usuario.usuarioId || usuario.id || "";
  if (inputEmail) inputEmail.value = usuario.email || "";
  if (selectRole) selectRole.value = usuario.role || "user";
}

async function aplicarRole(role = "user") {
  if (!currentUser) return setStatus("Faça login primeiro.", true);
  if (!isCurrentUserAdmin) return setStatus("Você não tem permissão para alterar cargos.", true);

  const uid = inputUid?.value?.trim();
  if (!uid) return setStatus("Informe ou selecione um usuário.", true);
  if (!["user", "admin"].includes(role)) return setStatus("Role inválido.", true);

  try {
    const refUsuario = doc(db, "usuarios", uid);
    const snap = await getDoc(refUsuario);
    if (!snap.exists()) return setStatus("Usuário não encontrado no Firestore.", true);

    await updateDoc(refUsuario, { role });
    if (selectRole) selectRole.value = role;
    setStatus(`Cargo atualizado com sucesso para: ${role}`);
    await carregarUsuarios();
  } catch (error) {
    console.error("[AdminSetter] Erro ao atualizar role:", error);
    setStatus(`Erro ao atualizar role: ${error.message}`, true);
  }
}

async function carregarUsuarios() {
  if (!usersList) return;
  usersList.innerHTML = "<p>Carregando usuários...</p>";

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));
    if (snapshot.empty) {
      usersList.innerHTML = "<p>Nenhum usuário encontrado.</p>";
      return;
    }

    usersList.innerHTML = "";
    snapshot.docs.forEach((docSnap) => {
      const usuario = { id: docSnap.id, ...docSnap.data() };
      const item = document.createElement("button");
      item.type = "button";
      item.className = "user-item";
      item.textContent = `${usuario.nome || usuario.email || usuario.id} • ${usuario.role || "user"}`;
      item.addEventListener("click", () => {
        preencherFormularioUsuario(usuario);
        setStatus(`Usuário selecionado: ${usuario.nome || usuario.email || usuario.id}`);
      });
      usersList.appendChild(item);
    });
  } catch (error) {
    console.error("[AdminSetter] Erro ao carregar usuários:", error);
    usersList.innerHTML = "<p>Erro ao carregar usuários.</p>";
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    renderLoggedUser(null);
    setStatus("Você precisa estar logado.", true);
    return;
  }

  try {
    const dados = await buscarUsuarioPorUid(user.uid);
    renderLoggedUser(user, dados || {});

    if (!dados) {
      setStatus("Seu documento de usuário não foi encontrado.", true);
      return;
    }

    isCurrentUserAdmin = dados.role === "admin";
    if (!isCurrentUserAdmin) {
      setStatus("Somente administradores podem alterar perfis.", true);
      return;
    }

    setStatus("Administrador autenticado. Você já pode alterar cargos.");
    await carregarUsuarios();
  } catch (error) {
    console.error("[AdminSetter] Erro:", error);
    setStatus("Erro ao validar administrador.", true);
  }
});

btnLoadUsers?.addEventListener("click", carregarUsuarios);
btnSetRole?.addEventListener("click", () => aplicarRole(selectRole?.value?.trim() || "user"));
btnRemove?.addEventListener("click", () => aplicarRole("user"));

inputUid?.addEventListener("change", async () => {
  const uid = inputUid.value.trim();
  if (!uid) return;
  const usuario = await buscarUsuarioPorUid(uid);
  if (usuario) preencherFormularioUsuario(usuario);
});

inputEmail?.addEventListener("change", async () => {
  const email = inputEmail.value.trim();
  if (!email) return;
  const usuario = await buscarUsuarioPorEmail(email);
  if (usuario) preencherFormularioUsuario(usuario);
});
