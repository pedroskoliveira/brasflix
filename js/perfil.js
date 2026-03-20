import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const qs = new URLSearchParams(location.search);
const targetUid = qs.get("uid");
let currentUser = null;
let currentProfile = null;
let viewedProfile = null;

const els = {
  avatar: document.getElementById("perfilAvatar"),
  nome: document.getElementById("perfilNome"),
  username: document.getElementById("perfilUsername"),
  email: document.getElementById("perfilEmail"),
  bio: document.getElementById("perfilBio"),
  seguidores: document.getElementById("perfilSeguidores"),
  seguindo: document.getElementById("perfilSeguindo"),
  conversas: document.getElementById("perfilConversas"),
  favoritos: document.getElementById("totalFavoritos"),
  categorias: document.getElementById("categoriasPreferidas"),
  sugestoes: document.getElementById("sugestoesPerfil"),
  listaSeguidores: document.getElementById("listaSeguidores"),
  listaSeguindo: document.getElementById("listaSeguindo"),
  historico: document.getElementById("historicoPerfil"),
  favs: document.getElementById("favoritosPerfil"),
  btnFollow: document.getElementById("btnFollowPerfil"),
  btnConversar: document.getElementById("btnConversarPerfil"),
  btnMensagens: document.getElementById("btnAbrirMensagens")
};

function avatarOf(user={}) { return user.avatar || user.fotoURL || "imagens/logo.png"; }
function usernameOf(user={}) { return user.username || user.apelido || (user.nome || 'usuario').toLowerCase().replace(/[^a-z0-9]+/g,''); }
function listOrEmpty(el, html) { if (el) el.innerHTML = html || '<div class="social-empty">Nada por aqui ainda.</div>'; }
function videoCard(video={}) { return `<a class="social-video-card" href="video.html?id=${encodeURIComponent(video.id || '')}"><img src="${video.thumbnail || video.capa || video.imagem || 'imagens/logo.png'}" alt="${video.titulo || 'Vídeo'}"><div class="social-video-card-content"><strong>${video.titulo || 'Vídeo'}</strong><p>${video.categoria || 'Sem categoria'}</p></div></a>`; }
function personCard(user={}) { return `<div class="social-person"><img src="${avatarOf(user)}" alt="${user.nome || 'Usuário'}"><div><div class="social-person-name">${user.nome || 'Usuário'}</div><div class="social-person-meta">@${usernameOf(user)}</div></div><div class="social-person-actions"><a href="perfil.html?uid=${encodeURIComponent(user.uid || user.id)}">Ver perfil</a><button type="button" class="primary btn-conversar" data-uid="${user.uid || user.id}">Conversar</button></div></div>`; }
function setTexts(profile={}) {
  if (els.avatar) els.avatar.src = avatarOf(profile);
  if (els.nome) els.nome.textContent = profile.nome || 'Usuário';
  if (els.username) els.username.textContent = '@' + usernameOf(profile);
  if (els.email) els.email.textContent = profile.email || '';
  if (els.bio) els.bio.textContent = profile.bio || 'Sem bio por enquanto.';
  if (els.seguidores) els.seguidores.textContent = String((profile.seguidores || []).length || 0);
  if (els.seguindo) els.seguindo.textContent = String((profile.seguindo || []).length || 0);
  if (els.favoritos) els.favoritos.textContent = String((profile.favoritos || []).length || 0);
  if (els.categorias) els.categorias.innerHTML = (profile.categoriasFavoritas || []).map((item) => `<span class="chip">${item}</span>`).join('') || '<div class="social-empty">Nenhuma categoria favorita.</div>';
}
async function loadUser(uid) { const snap = await getDoc(doc(db,'usuarios',uid)); return snap.exists() ? { id:snap.id, ...snap.data(), uid } : null; }
async function loadUsersByIds(ids=[]) { const items = []; for (const id of ids.slice(0,12)) { const user = await loadUser(id); if (user) items.push(user); } return items; }
async function countConversations(uid) { try { const snap = await getDocs(query(collection(db,'chatRooms'), where('participantes','array-contains',uid))); return snap.size; } catch { return 0; } }
async function renderPeopleList(el, ids=[]) { const users = await loadUsersByIds(ids); listOrEmpty(el, users.map(personCard).join('')); bindConversationButtons(el, users); }
function bindConversationButtons(container, users=[]) { container?.querySelectorAll('.btn-conversar').forEach((btn) => { btn.addEventListener('click', () => { const uid = btn.dataset.uid; const user = users.find((u) => (u.uid || u.id) === uid); if (window.BrasflixUserChat?.openConversationWith && user) window.BrasflixUserChat.openConversationWith({ uid: user.uid || user.id, nome: user.nome || '', email: user.email || '', fotoURL: avatarOf(user) }); else alert('O chat de usuários ainda não carregou.'); }); }); }
async function renderSuggestions() {
  const all = await getDocs(collection(db,'usuarios'));
  const mineCats = new Set(currentProfile?.categoriasFavoritas || []);
  const candidates = [];
  all.forEach((d) => { const user = { id:d.id, ...d.data(), uid:d.data().uid || d.id }; if (!currentUser || user.uid === currentUser.uid) return; const score = (user.categoriasFavoritas || []).filter((cat) => mineCats.has(cat)).length; candidates.push({ ...user, score }); });
  candidates.sort((a,b) => b.score - a.score || (a.nome||'').localeCompare(b.nome||'', 'pt-BR'));
  const users = candidates.slice(0,6);
  listOrEmpty(els.sugestoes, users.map((u) => `<div class="social-person"><img src="${avatarOf(u)}"><div><div class="social-person-name">${u.nome || 'Usuário'}</div><div class="social-person-meta">${u.score ? `Interesses em comum: ${u.score}` : '@' + usernameOf(u)}</div></div><div class="social-person-actions"><button type="button" class="primary btn-follow-suggestion" data-uid="${u.uid}">${(currentProfile?.seguindo || []).includes(u.uid) ? 'Seguindo' : 'Seguir'}</button><button type="button" class="btn-suggestion-chat" data-uid="${u.uid}">Conversar</button></div></div>`).join(''));
  els.sugestoes?.querySelectorAll('.btn-follow-suggestion').forEach((btn) => btn.addEventListener('click', () => toggleFollow(btn.dataset.uid)));
  els.sugestoes?.querySelectorAll('.btn-suggestion-chat').forEach((btn) => { btn.addEventListener('click', () => { const user = users.find((u) => u.uid === btn.dataset.uid); if (user && window.BrasflixUserChat?.openConversationWith) window.BrasflixUserChat.openConversationWith({ uid:user.uid, nome:user.nome||'', email:user.email||'', fotoURL:avatarOf(user) }); }); });
}
async function toggleFollow(uid) {
  if (!currentUser || !currentProfile || !viewedProfile) return alert('Faça login para seguir usuários.');
  const myRef = doc(db,'usuarios', currentUser.uid);
  const targetRef = doc(db,'usuarios', uid);
  const following = (currentProfile.seguindo || []).includes(uid);
  await updateDoc(myRef, { seguindo: following ? arrayRemove(uid) : arrayUnion(uid) });
  await updateDoc(targetRef, { seguidores: following ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  currentProfile = await loadUser(currentUser.uid);
  viewedProfile = await loadUser(targetUid || currentUser.uid);
  setTexts(viewedProfile);
  updateFollowButton();
  await renderPeopleList(els.listaSeguidores, viewedProfile?.seguidores || []);
  await renderPeopleList(els.listaSeguindo, viewedProfile?.seguindo || []);
  await renderSuggestions();
}
function updateFollowButton() {
  if (!els.btnFollow || !currentUser || !viewedProfile) return;
  if ((viewedProfile.uid || viewedProfile.id) === currentUser.uid) { els.btnFollow.style.display = 'none'; return; }
  const following = (currentProfile?.seguindo || []).includes(viewedProfile.uid || viewedProfile.id);
  els.btnFollow.textContent = following ? 'Seguindo' : 'Seguir';
}
async function renderMedia(uid) {
  const historicoSnap = await getDocs(query(collection(db,'historico_visualizacoes'), where('userId','==',uid), orderBy('timestamp','desc'), limit(6)));
  const hist = historicoSnap.docs.map((d) => ({ id:d.id, ...d.data() }));
  listOrEmpty(els.historico, hist.map(videoCard).join(''));
  const profile = viewedProfile || {};
  listOrEmpty(els.favs, (profile.favoritos || []).slice(0,6).map(videoCard).join(''));
}
async function init() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    if (!user && !targetUid) location.href = 'login.html';
    if (user) currentProfile = await loadUser(user.uid);
    viewedProfile = await loadUser(targetUid || user?.uid);
    if (!viewedProfile) return;
    setTexts(viewedProfile);
    if (els.conversas) els.conversas.textContent = String(await countConversations(viewedProfile.uid || viewedProfile.id));
    await renderPeopleList(els.listaSeguidores, viewedProfile?.seguidores || []);
    await renderPeopleList(els.listaSeguindo, viewedProfile?.seguindo || []);
    await renderMedia(viewedProfile.uid || viewedProfile.id);
    if (user) await renderSuggestions();
    updateFollowButton();
  });
  els.btnFollow?.addEventListener('click', () => toggleFollow(viewedProfile?.uid || viewedProfile?.id));
  els.btnMensagens?.addEventListener('click', () => document.getElementById('user-chat-toggle')?.click());
  els.btnConversar?.addEventListener('click', () => {
    if (!viewedProfile) return;
    if (window.BrasflixUserChat?.openConversationWith) {
      window.BrasflixUserChat.openConversationWith({ uid:viewedProfile.uid || viewedProfile.id, nome:viewedProfile.nome || '', email:viewedProfile.email || '', fotoURL: avatarOf(viewedProfile) });
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
