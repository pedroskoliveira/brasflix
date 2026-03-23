import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const searchInput = document.getElementById("usersSearch");
const usersGrid = document.getElementById("usersGrid");
const usersEmpty = document.getElementById("usersEmpty");
const usersCount = document.getElementById("usersCount");

let allUsers = [];
let currentProfile = null;
let currentUser = null;
let loaded = false;

function normalize(text = "") {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getAvatar(user = {}) {
  return user.avatar || user.fotoURL || "imagens/logo.png";
}

function categories(user = {}) {
  return Array.isArray(user.categoriasFavoritas) ? user.categoriasFavoritas : [];
}

async function carregarPerfilAtual() {
  if (!currentUser) {
    currentProfile = null;
    return null;
  }

  const snap = await getDoc(doc(db, "usuarios", currentUser.uid));
  currentProfile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  return currentProfile;
}

function isFollowing(uid) {
  const seguindo = Array.isArray(currentProfile?.seguindo) ? currentProfile.seguindo : [];
  return seguindo.includes(uid);
}

async function toggleFollow(targetUid) {
  if (!currentUser) {
    alert("Faça login para seguir pessoas.");
    return;
  }

  const myRef = doc(db, "usuarios", currentUser.uid);
  const targetRef = doc(db, "usuarios", targetUid);
  const following = isFollowing(targetUid);

  await updateDoc(myRef, { seguindo: following ? arrayRemove(targetUid) : arrayUnion(targetUid) });
  await updateDoc(targetRef, { seguidores: following ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  await carregarPerfilAtual();
  renderList(searchInput?.value || "");
}

function openChat(user) {
  if (!currentUser) {
    alert("Faça login para conversar com outros usuários.");
    return;
  }

  if (window.BrasflixUserChat?.openConversationWith) {
    window.BrasflixUserChat.openConversationWith(user);
    return;
  }

  if (window.BrasflixUserChat?.openPanel) {
    window.BrasflixUserChat.openPanel();
  }

  alert("O chat de usuários ainda está carregando. Tente novamente em alguns segundos.");
}

function card(user) {
  const tags =
    categories(user)
      .slice(0, 3)
      .map((tag) => `<span class="user-card-tag">${tag}</span>`)
      .join("") || `<span class="user-card-tag">Sem categorias</span>`;

  const wrapper = document.createElement("article");
  wrapper.className = "user-card";
  wrapper.innerHTML = `
    <div class="user-card-top">
      <img class="user-card-avatar" src="${getAvatar(user)}" alt="${user.nome || "Usuário"}">
      <div>
        <div class="user-card-name">${user.nome || "Usuário"}</div>
        <div class="user-card-username">@${user.username || user.apelido || (user.nome || "usuario").toLowerCase().replace(/[^a-z0-9]+/g, "")}</div>
      </div>
    </div>
    <div class="user-card-bio">${user.bio || "Sem bio por enquanto."}</div>
    <div class="user-card-tags">${tags}</div>
    <div class="user-card-actions">
      <a href="perfil.html?uid=${encodeURIComponent(user.uid || user.id)}">Ver perfil</a>
      <button type="button" class="primary btn-chat">Conversar</button>
      <button type="button" class="btn-follow">${isFollowing(user.uid || user.id) ? "Seguindo" : "Seguir"}</button>
    </div>`;

  wrapper
    .querySelector(".btn-chat")
    ?.addEventListener("click", () =>
      openChat({
        uid: user.uid || user.id,
        nome: user.nome || "",
        email: user.email || "",
        fotoURL: getAvatar(user)
      })
    );

  wrapper.querySelector(".btn-follow")?.addEventListener("click", () => toggleFollow(user.uid || user.id));
  return wrapper;
}

function renderList(term = "") {
  const queryText = normalize(term);
  const filtered = allUsers.filter((user) => {
    const hay = [user.nome, user.username, user.email, ...categories(user)].map(normalize).join(" ");
    return !queryText || hay.includes(queryText);
  });

  usersGrid.innerHTML = "";
  usersCount.textContent = `${filtered.length} perfil(is)`;
  usersEmpty.style.display = filtered.length ? "none" : "block";
  filtered.forEach((user) => usersGrid.appendChild(card(user)));
}

async function loadUsers() {
  await carregarPerfilAtual();

  const [pubSnap, userSnap] = await Promise.all([
    getDocs(collection(db, "usuarios_publicos")),
    getDocs(collection(db, "usuarios"))
  ]);

  const usersById = new Map();
  userSnap.forEach((d) => usersById.set(d.id, { id: d.id, ...d.data() }));

  allUsers = [];

  pubSnap.forEach((d) => {
    const base = { id: d.id, ...d.data() };
    const full = usersById.get(d.id) || {};
    const merged = { ...full, ...base, uid: base.uid || full.uid || d.id };
    if (currentUser?.uid && merged.uid === currentUser.uid) return;
    if (merged.mostrarPerfilPublico === false) return;
    allUsers.push(merged);
  });

  if (!allUsers.length) {
    userSnap.forEach((d) => {
      const merged = { id: d.id, ...d.data(), uid: d.data().uid || d.id };
      if (currentUser?.uid && merged.uid === currentUser.uid) return;
      allUsers.push(merged);
    });
  }

  renderList(searchInput?.value || "");
}

searchInput?.addEventListener("input", (e) => renderList(e.target.value || ""));

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if (!loaded) {
      loaded = true;
      await loadUsers();
      return;
    }

    await carregarPerfilAtual();
    renderList(searchInput?.value || "");
  });
});
