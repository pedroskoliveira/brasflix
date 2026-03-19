import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const perfilAvatar = document.getElementById("perfilAvatar");
const perfilNome = document.getElementById("perfilNome");
const perfilEmail = document.getElementById("perfilEmail");
const perfilPlano = document.getElementById("perfilPlano");
const perfilData = document.getElementById("perfilData");
const perfilStatus = document.getElementById("perfilStatus");

const tempoAssistido = document.getElementById("tempoAssistido");
const totalFavoritos = document.getElementById("totalFavoritos");
const videosAssistidos = document.getElementById("videosAssistidos");
const taxaConclusao = document.getElementById("taxaConclusao");

const horarioAtivo = document.getElementById("horarioAtivo");
const categoriaDominante = document.getElementById("categoriaDominante");
const formatoPreferido = document.getElementById("formatoPreferido");
const nivelEngajamento = document.getElementById("nivelEngajamento");

const categoriasContainer = document.getElementById("categoriasPreferidas");
const historicoContainer = document.getElementById("historicoPerfil");
const favoritosContainer = document.getElementById("favoritosPerfil");

function formatarData(valor) {
  if (!valor) return "—";

  const data = valor.toDate ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";

  return data.toLocaleDateString("pt-BR");
}

function obterImagemVideo(video = {}) {
  return (
    video.thumbnail ||
    video.capa ||
    video.imagem ||
    "imagens/logo.png"
  );
}

function obterCategoriaVideo(video = {}) {
  return video.categoria || video.genero || video.tag || "Sem categoria";
}

function criarCardVideo(video = {}) {
  const item = document.createElement("a");
  item.className = "card";
  item.href = `video.html?id=${encodeURIComponent(video.id || "")}`;
  item.setAttribute("aria-label", `Abrir ${video.titulo || "vídeo"}`);

  item.innerHTML = `
    <img src="${obterImagemVideo(video)}" alt="${video.titulo || "Vídeo"}">
    <div class="card-overlay">
      <h3>${video.titulo || "Sem título"}</h3>
      <p>${obterCategoriaVideo(video)}</p>
    </div>
  `;

  return item;
}

function criarCategoria(nome = "") {
  const chip = document.createElement("div");
  chip.className = "categoria-card";
  chip.textContent = nome;
  return chip;
}

function definirTexto(el, texto) {
  if (el) el.textContent = texto;
}

function mostrarListaVazia(container, mensagem) {
  if (!container) return;
  container.innerHTML = `<div class="estado-vazio-lista"><p>${mensagem}</p></div>`;
}

function renderizarHistorico(lista = []) {
  if (!historicoContainer) return;

  historicoContainer.innerHTML = "";

  if (!lista.length) {
    mostrarListaVazia(historicoContainer, "Nenhum vídeo no histórico ainda.");
    return;
  }

  lista.forEach((video) => historicoContainer.appendChild(criarCardVideo(video)));
}

function renderizarFavoritos(lista = []) {
  if (!favoritosContainer) return;

  favoritosContainer.innerHTML = "";

  if (!lista.length) {
    mostrarListaVazia(favoritosContainer, "Nenhum favorito salvo ainda.");
    return;
  }

  lista.forEach((video) => favoritosContainer.appendChild(criarCardVideo(video)));
}

function renderizarCategorias(lista = []) {
  if (!categoriasContainer) return;

  categoriasContainer.innerHTML = "";

  if (!lista.length) {
    mostrarListaVazia(categoriasContainer, "Nenhuma categoria preferida ainda.");
    return;
  }

  lista.forEach((categoria) => categoriasContainer.appendChild(criarCategoria(categoria)));
}

function extrairCategorias(historico = [], favoritos = []) {
  const categorias = [...historico, ...favoritos]
    .map((video) => obterCategoriaVideo(video))
    .filter(Boolean)
    .filter((categoria) => categoria !== "Sem categoria");

  return [...new Set(categorias)];
}

function calcularHorarioMaisAtivo(historicoDocs = []) {
  if (!historicoDocs.length) return "Ainda sem dados";

  const contagemHoras = new Map();

  historicoDocs.forEach((item) => {
    const data = item.timestamp?.toDate ? item.timestamp.toDate() : null;
    if (!data) return;
    const hora = data.getHours();
    contagemHoras.set(hora, (contagemHoras.get(hora) || 0) + 1);
  });

  let melhorHora = null;
  let maior = 0;

  contagemHoras.forEach((valor, chave) => {
    if (valor > maior) {
      maior = valor;
      melhorHora = chave;
    }
  });

  if (melhorHora === null) return "Ainda sem dados";

  return `${String(melhorHora).padStart(2, "0")}:00`;
}

function calcularCategoriaDominante(historico = [], favoritos = []) {
  const categorias = [...historico, ...favoritos]
    .map((video) => obterCategoriaVideo(video))
    .filter(Boolean);

  if (!categorias.length) return "Ainda sem dados";

  const mapa = new Map();

  categorias.forEach((categoria) => {
    mapa.set(categoria, (mapa.get(categoria) || 0) + 1);
  });

  let melhor = "";
  let maior = 0;

  mapa.forEach((valor, chave) => {
    if (valor > maior) {
      maior = valor;
      melhor = chave;
    }
  });

  return melhor || "Ainda sem dados";
}

function calcularFormatoPreferido(historico = [], favoritos = []) {
  const lista = [...historico, ...favoritos];

  if (!lista.length) return "Ainda sem dados";

  const formatos = lista.map((video) => {
    const titulo = (video.titulo || "").toLowerCase();
    if (titulo.includes("série")) return "Séries";
    if (titulo.includes("document")) return "Documentários";
    return "Vídeos";
  });

  const mapa = new Map();

  formatos.forEach((item) => {
    mapa.set(item, (mapa.get(item) || 0) + 1);
  });

  let melhor = "";
  let maior = 0;

  mapa.forEach((valor, chave) => {
    if (valor > maior) {
      maior = valor;
      melhor = chave;
    }
  });

  return melhor || "Vídeos";
}

function calcularEngajamento(totalHistorico = 0, totalFavoritosUsuario = 0) {
  const pontuacao = totalHistorico + totalFavoritosUsuario * 2;

  if (pontuacao >= 20) return "Muito alto";
  if (pontuacao >= 10) return "Alto";
  if (pontuacao >= 5) return "Médio";
  if (pontuacao >= 1) return "Inicial";
  return "Baixo";
}

async function carregarPerfil(uid, user) {
  try {
    const usuarioSnap = await getDoc(doc(db, "usuarios", uid));
    const usuario = usuarioSnap.exists() ? usuarioSnap.data() : {};

    const historicoQuery = query(
      collection(db, "historico_visualizacoes"),
      where("userId", "==", uid),
      orderBy("timestamp", "desc"),
      limit(12)
    );

    const historicoSnap = await getDocs(historicoQuery);
    const historicoDocs = historicoSnap.docs.map((docItem) => docItem.data());

    const historicoVideos = historicoDocs.map((item) => ({
      id: item.videoId,
      titulo: item.videoTitulo || "Vídeo",
      categoria: item.categoria || "Sem categoria",
      thumbnail: item.thumbnail || item.capa || item.imagem || "imagens/logo.png"
    }));

    const favoritos = Array.isArray(usuario.favoritos) ? usuario.favoritos : [];
    const categorias = Array.isArray(usuario.categoriasPreferidas) && usuario.categoriasPreferidas.length
      ? usuario.categoriasPreferidas
      : extrairCategorias(historicoVideos, favoritos);

    const totalTempo = historicoDocs.reduce((acc, item) => acc + Number(item.tempoAssistido || 0), 0);
    const totalVideos = historicoDocs.length;
    const totalFavs = favoritos.length;

    definirTexto(perfilNome, usuario.nome || user.displayName || "Usuário");
    definirTexto(perfilEmail, usuario.email || user.email || "—");
    definirTexto(perfilPlano, usuario.plano || "Padrão");
    definirTexto(perfilData, formatarData(usuario.criadoEm || user.metadata?.creationTime));
    definirTexto(perfilStatus, usuario.faceLoginEnabled ? "Verificado" : "Ativo");

    if (perfilAvatar) {
      perfilAvatar.src = usuario.avatar || usuario.fotoURL || user.photoURL || "imagens/logo.png";
    }

    definirTexto(tempoAssistido, `${Math.floor(totalTempo / 60)} min`);
    definirTexto(totalFavoritos, `${totalFavs}`);
    definirTexto(videosAssistidos, `${totalVideos}`);
    definirTexto(taxaConclusao, totalVideos ? "Boa" : "—");

    definirTexto(horarioAtivo, calcularHorarioMaisAtivo(historicoDocs));
    definirTexto(categoriaDominante, calcularCategoriaDominante(historicoVideos, favoritos));
    definirTexto(formatoPreferido, calcularFormatoPreferido(historicoVideos, favoritos));
    definirTexto(nivelEngajamento, calcularEngajamento(totalVideos, totalFavs));

    renderizarCategorias(categorias);
    renderizarHistorico(historicoVideos.slice(0, 8));
    renderizarFavoritos(favoritos.slice(0, 8));
  } catch (error) {
    console.error("[Perfil] Erro ao carregar perfil:", error);

    definirTexto(perfilNome, "Usuário");
    definirTexto(perfilEmail, "—");
    definirTexto(perfilPlano, "—");
    definirTexto(perfilData, "—");
    definirTexto(perfilStatus, "—");

    definirTexto(tempoAssistido, "0 min");
    definirTexto(totalFavoritos, "0");
    definirTexto(videosAssistidos, "0");
    definirTexto(taxaConclusao, "—");

    definirTexto(horarioAtivo, "Ainda sem dados");
    definirTexto(categoriaDominante, "Ainda sem dados");
    definirTexto(formatoPreferido, "Ainda sem dados");
    definirTexto(nivelEngajamento, "Baixo");

    renderizarCategorias([]);
    renderizarHistorico([]);
    renderizarFavoritos([]);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await carregarPerfil(user.uid, user);
});