import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const favoritosGrid = document.getElementById("favoritosGrid");
const estadoVazioFavoritos = document.getElementById("estadoVazioFavoritos");
const categoriasFavoritas = document.getElementById("categoriasFavoritas");
const estadoVazioCategorias = document.getElementById("estadoVazioCategorias");
const contadorFavoritos = document.getElementById("contadorFavoritos");

function obterImagemVideo(video = {}) {
  return video.thumbnail || video.capa || video.imagem || "imagens/logo.png";
}

function obterCategoriaVideo(video = {}) {
  return video.categoria || video.genero || video.tag || "Sem categoria";
}

function criarCardFavorito(video = {}) {
  const artigo = document.createElement("article");
  artigo.className = "card-favorito";

  artigo.innerHTML = `
    <a href="video.html?id=${encodeURIComponent(video.id || "")}" class="card-favorito-link">
      <img src="${obterImagemVideo(video)}" alt="${video.titulo || "Vídeo"}">
      <div class="card-favorito-conteudo">
        <h3>${video.titulo || "Sem título"}</h3>
        <p>${obterCategoriaVideo(video)}</p>
      </div>
    </a>
  `;

  return artigo;
}

function atualizarEstadoFavoritos(listaFavoritos = []) {
  if (!favoritosGrid) return;

  favoritosGrid.innerHTML = "";
  if (contadorFavoritos) {
    contadorFavoritos.textContent = `${listaFavoritos.length} itens`;
  }

  if (!listaFavoritos.length) {
    if (estadoVazioFavoritos) estadoVazioFavoritos.style.display = "flex";
    favoritosGrid.style.display = "none";
    return;
  }

  if (estadoVazioFavoritos) estadoVazioFavoritos.style.display = "none";
  favoritosGrid.style.display = "grid";

  listaFavoritos.forEach((video) => {
    favoritosGrid.appendChild(criarCardFavorito(video));
  });
}

function atualizarCategoriasFavoritas(listaCategorias = []) {
  if (!categoriasFavoritas) return;

  categoriasFavoritas.innerHTML = "";

  if (!listaCategorias.length) {
    if (estadoVazioCategorias) estadoVazioCategorias.style.display = "flex";
    categoriasFavoritas.style.display = "none";
    return;
  }

  if (estadoVazioCategorias) estadoVazioCategorias.style.display = "none";
  categoriasFavoritas.style.display = "flex";

  listaCategorias.forEach((categoria) => {
    const chip = document.createElement("span");
    chip.className = "chip-categoria";
    chip.textContent = categoria;
    categoriasFavoritas.appendChild(chip);
  });
}

function extrairCategoriasDosFavoritos(listaFavoritos = []) {
  const categorias = listaFavoritos
    .map((video) => obterCategoriaVideo(video))
    .filter(Boolean)
    .filter((categoria) => categoria !== "Sem categoria");

  return [...new Set(categorias)];
}

async function garantirUsuario(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      usuarioId: uid,
      role: "user",
      favoritos: [],
      categoriasFavoritas: []
    }, { merge: true });
  }
}

async function adicionarFavorito(video = {}) {
  if (!auth.currentUser) {
    alert("Faça login para favoritar.");
    return null;
  }

  if (!video?.id) return null;

  const payload = {
    id: video.id,
    titulo: video.titulo || "Vídeo",
    categoria: video.categoria || "Sem categoria",
    thumbnail: video.thumbnail || video.capa || video.imagem || ""
  };

  try {
    const uid = auth.currentUser.uid;
    await garantirUsuario(uid);

    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const dados = snap.exists() ? snap.data() : {};
    const favoritosAtuais = Array.isArray(dados.favoritos) ? dados.favoritos : [];

    const jaExiste = favoritosAtuais.some((item) => item.id === payload.id);
    if (jaExiste) return true;

    const novaLista = [...favoritosAtuais, payload];
    const novasCategorias = extrairCategoriasDosFavoritos(novaLista);

    await updateDoc(ref, {
      favoritos: arrayUnion(payload),
      categoriasFavoritas: novasCategorias
    });

    return true;
  } catch (error) {
    console.error("[Favoritos] Erro ao adicionar favorito:", error);
    return null;
  }
}

async function removerFavorito(videoId = "") {
  if (!auth.currentUser || !videoId) return null;

  try {
    const uid = auth.currentUser.uid;
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const dados = snap.data() || {};
    const favoritosAtuais = Array.isArray(dados.favoritos) ? dados.favoritos : [];
    const alvo = favoritosAtuais.find((item) => item.id === videoId);

    if (!alvo) return true;

    const novaLista = favoritosAtuais.filter((item) => item.id !== videoId);
    const novasCategorias = extrairCategoriasDosFavoritos(novaLista);

    await updateDoc(ref, {
      favoritos: arrayRemove(alvo),
      categoriasFavoritas: novasCategorias
    });

    return true;
  } catch (error) {
    console.error("[Favoritos] Erro ao remover favorito:", error);
    return null;
  }
}

async function favoritado(videoId = "") {
  if (!auth.currentUser || !videoId) return false;

  try {
    const snap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if (!snap.exists()) return false;

    const dados = snap.data() || {};
    const favoritos = Array.isArray(dados.favoritos) ? dados.favoritos : [];

    return favoritos.some((item) => item.id === videoId);
  } catch (error) {
    console.error("[Favoritos] Erro ao verificar favorito:", error);
    return false;
  }
}

function carregarDadosFavoritos(uid) {
  const usuarioRef = doc(db, "usuarios", uid);

  onSnapshot(
    usuarioRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        atualizarEstadoFavoritos([]);
        atualizarCategoriasFavoritas([]);
        return;
      }

      const dados = snapshot.data() || {};
      const listaFavoritos = Array.isArray(dados.favoritos) ? dados.favoritos : [];
      const listaCategorias =
        Array.isArray(dados.categoriasFavoritas) && dados.categoriasFavoritas.length
          ? dados.categoriasFavoritas
          : extrairCategoriasDosFavoritos(listaFavoritos);

      atualizarEstadoFavoritos(listaFavoritos);
      atualizarCategoriasFavoritas(listaCategorias);
    },
    (error) => {
      console.error("[Favoritos] Erro ao carregar favoritos:", error);
      atualizarEstadoFavoritos([]);
      atualizarCategoriasFavoritas([]);
    }
  );
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    atualizarEstadoFavoritos([]);
    atualizarCategoriasFavoritas([]);
    return;
  }

  carregarDadosFavoritos(user.uid);
});

window.BrasflixFavoritos = {
  adicionarFavorito,
  removerFavorito,
  favoritado
};

export {
  adicionarFavorito,
  removerFavorito,
  favoritado
};