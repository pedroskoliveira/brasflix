import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  buscarTodosVideos,
  buscarVideoPorId,
  buscarRecomendacoesPorCategoria
} from "./firebase-service.js";

import {
  registrarVisualizacao,
  atualizarTempoVisualizacao
} from "./historico.js";

import {
  adicionarFavorito,
  removerFavorito,
  favoritado
} from "./favoritos.js";

const topVideosContainer = document.getElementById("topVideos");
const topSemanalContainer = document.getElementById("topSemanal");
const emAltaContainer = document.getElementById("emAlta");
const categoriaTecnologiaContainer = document.getElementById("categoriaTecnologia");

const videoPlayer = document.getElementById("videoPlayer") || document.getElementById("playerBrasflix");
const videoTitulo = document.getElementById("videoTitulo");
const videoDescricao = document.getElementById("videoDescricao");
const videoCategoria = document.getElementById("videoCategoria");
const videoDuracao = document.getElementById("videoDuracao");
const videoPublicacao = document.getElementById("videoPublicacao");
const videoViews = document.getElementById("videoViews");

const analyticsViews = document.getElementById("analyticsViews");
const analyticsLikes = document.getElementById("analyticsLikes");
const analyticsFavoritos = document.getElementById("analyticsFavoritos");
const analyticsRetencao = document.getElementById("analyticsRetencao");

const recomendacoesVideo = document.getElementById("recomendacoesVideo");
const estadoVazioRecomendacoes = document.getElementById("estadoVazioRecomendacoes");

const botoesAcaoVideo = document.querySelectorAll(".acoes-video .btn-acao");

let videoAtual = null;

function escaparHtml(texto = "") {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarData(valor) {
  if (!valor) return "—";
  const data = valor.toDate ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

function formatarDuracao(segundos = 0) {
  const total = Number(segundos || 0);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = Math.floor(total % 60);

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  }

  return `${minutos}min ${String(segs).padStart(2, "0")}s`;
}

function abrirVideo(video) {
  if (!video?.id) return;
  window.location.href = `video.html?id=${encodeURIComponent(video.id)}`;
}

function criarMarkupPreview(video) {
  if (!video?.previewUrl) return "";

  return `
    <video muted loop playsinline preload="none" aria-hidden="true">
      <source src="${escaparHtml(video.previewUrl)}" type="video/mp4">
    </video>
  `;
}

function configurarHoverPreview(card) {
  const videoPreview = card.querySelector("video");
  if (!videoPreview) return;

  card.addEventListener("mouseenter", async () => {
    try {
      videoPreview.currentTime = 0;
      await videoPreview.play();
    } catch (error) {
      console.warn("[Vídeos] Preview não iniciado:", error);
    }
  });

  card.addEventListener("mouseleave", () => {
    videoPreview.pause();
    videoPreview.currentTime = 0;
  });
}

function criarCardNormal(video) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Abrir vídeo ${video.titulo || "vídeo"}`);

  card.innerHTML = `
    <div class="card-media">
      <img src="${escaparHtml(video.thumbnail || video.capa || "imagens/logo.png")}" alt="${escaparHtml(video.titulo || "Vídeo")}">
      ${criarMarkupPreview(video)}
      <div class="card-overlay">
        <h3>${escaparHtml(video.titulo || "Sem título")}</h3>
        <p>${escaparHtml(video.categoria || "Sem categoria")}</p>
      </div>
    </div>
  `;

  card.addEventListener("click", () => abrirVideo(video));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirVideo(video);
    }
  });

  configurarHoverPreview(card);
  return card;
}

function criarCardRanking(video, posicao) {
  const card = document.createElement("div");
  card.classList.add("card-ranking");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Abrir vídeo ${video.titulo || "vídeo"}, posição ${posicao}`);

  card.innerHTML = `
    <span class="ranking-numero">${posicao}</span>
    <div class="card-ranking-thumb">
      <img src="${escaparHtml(video.thumbnail || video.capa || "imagens/logo.png")}" alt="${escaparHtml(video.titulo || "Vídeo")}">
      ${criarMarkupPreview(video)}
      <div class="card-ranking-overlay">
        <h3>${escaparHtml(video.titulo || "Sem título")}</h3>
        <p>${escaparHtml(video.categoria || "Sem categoria")}</p>
      </div>
    </div>
  `;

  card.addEventListener("click", () => abrirVideo(video));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirVideo(video);
    }
  });

  configurarHoverPreview(card);
  return card;
}

function renderizarLista(container, lista, tipo = "normal") {
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(lista) || !lista.length) {
    return;
  }

  lista.forEach((video, index) => {
    const card = tipo === "ranking"
      ? criarCardRanking(video, index + 1)
      : criarCardNormal(video);

    container.appendChild(card);
  });
}

async function carregarHome() {
  if (!topVideosContainer && !emAltaContainer && !categoriaTecnologiaContainer) return;

  try {
    const todos = await buscarTodosVideos();

    const topVideos = todos.filter((v) => v.topVideos || v.topSemanal).slice(0, 8);
    const topSemanal = todos.filter((v) => v.topSemanal).slice(0, 8);
    const emAlta = todos.filter((v) => v.emAlta).slice(0, 12);
    const tecnologia = todos.filter((v) => (v.categoria || "").toLowerCase() === "tecnologia").slice(0, 12);

    renderizarLista(topVideosContainer, topVideos, "ranking");
    renderizarLista(topSemanalContainer, topSemanal, "ranking");
    renderizarLista(emAltaContainer, emAlta, "normal");
    renderizarLista(categoriaTecnologiaContainer, tecnologia, "normal");
  } catch (error) {
    console.error("[Vídeos] Erro ao carregar home:", error);
  }
}

async function incrementarViews(docId) {
  if (!docId) return;

  try {
    await updateDoc(doc(db, "videos", docId), {
      views: increment(1)
    });
  } catch (error) {
    console.error("[Vídeos] Erro ao incrementar views:", error);
  }
}

async function configurarBotoesAcao() {
  if (!botoesAcaoVideo.length || !videoAtual) return;

  const btnCurtir = botoesAcaoVideo[0];
  const btnFavoritar = botoesAcaoVideo[1];

  if (btnCurtir) {
    btnCurtir.addEventListener("click", async () => {
      if (!videoAtual?.docId) return;

      try {
        await updateDoc(doc(db, "videos", videoAtual.docId), {
          likes: increment(1)
        });

        const likesAtual = Number(videoAtual.likes || 0) + 1;
        videoAtual.likes = likesAtual;

        if (analyticsLikes) analyticsLikes.textContent = String(likesAtual);
        btnCurtir.textContent = "👍 Curtido";
      } catch (error) {
        console.error("[Vídeos] Erro ao curtir vídeo:", error);
      }
    });
  }

  if (btnFavoritar) {
    const jaFavoritado = await favoritado(videoAtual.id);

    btnFavoritar.textContent = jaFavoritado ? "⭐ Favoritado" : "⭐ Favoritar";

    btnFavoritar.addEventListener("click", async () => {
      const ativo = await favoritado(videoAtual.id);

      if (ativo) {
        await removerFavorito(videoAtual.id);
        btnFavoritar.textContent = "⭐ Favoritar";
      } else {
        await adicionarFavorito(videoAtual);
        btnFavoritar.textContent = "⭐ Favoritado";
      }
    });
  }
}

async function carregarRecomendacoes(video) {
  if (!recomendacoesVideo) return;

  recomendacoesVideo.innerHTML = "";

  try {
    const lista = await buscarRecomendacoesPorCategoria(video.categoria || "");
    const filtrados = lista.filter((item) => item.id !== video.id).slice(0, 10);

    if (!filtrados.length) {
      if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "flex";
      return;
    }

    if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "none";
    renderizarLista(recomendacoesVideo, filtrados, "normal");
  } catch (error) {
    console.error("[Vídeos] Erro ao carregar recomendações:", error);
    if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "flex";
  }
}

async function carregarPaginaVideo() {
  if (!videoTitulo || !videoPlayer) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  try {
    const video = await buscarVideoPorId(id);

    if (!video) {
      videoTitulo.textContent = "Vídeo não encontrado";
      return;
    }

    videoAtual = video;

    if (videoCategoria) videoCategoria.textContent = video.categoria || "Sem categoria";
    if (videoTitulo) videoTitulo.textContent = video.titulo || "Sem título";
    if (videoDescricao) videoDescricao.textContent = video.descricao || "Sem descrição.";
    if (videoDuracao) videoDuracao.textContent = formatarDuracao(video.duracaoSegundos || video.duracao || 0);
    if (videoPublicacao) videoPublicacao.textContent = formatarData(video.publicadoEm || video.createdAt || video.criadoEm);
    if (videoViews) videoViews.textContent = String(video.views || 0);

    if (analyticsViews) analyticsViews.textContent = String(video.views || 0);
    if (analyticsLikes) analyticsLikes.textContent = String(video.likes || 0);
    if (analyticsFavoritos) analyticsFavoritos.textContent = "—";
    if (analyticsRetencao) analyticsRetencao.textContent = "—";

    const source = videoPlayer.querySelector("source");
    if (source && (video.urlVideo || video.videoUrl || video.src)) {
      source.src = video.urlVideo || video.videoUrl || video.src;
      videoPlayer.load();
    }

    await incrementarViews(video.docId);
    await registrarVisualizacao(video);
    await carregarRecomendacoes(video);
    await configurarBotoesAcao();

    videoPlayer.addEventListener("timeupdate", async () => {
      await atualizarTempoVisualizacao(video.id, videoPlayer.currentTime || 0);
    });
  } catch (error) {
    console.error("[Vídeos] Erro ao carregar página do vídeo:", error);
    if (videoTitulo) videoTitulo.textContent = "Erro ao carregar vídeo";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await carregarHome();
  await carregarPaginaVideo();
});
