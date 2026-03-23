import { db } from "./firebase-config.js";
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { buscarTodosVideos, buscarVideoPorId, buscarRecomendacoesPorCategoria } from "./firebase-service.js";
import { registrarVisualizacao, atualizarTempoVisualizacao } from "./historico.js";
import { adicionarFavorito, removerFavorito, favoritado } from "./favoritos.js";

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
const entradaOverlay = document.getElementById("entradaVideoOverlay");
const entradaBtn = document.getElementById("entradaVideoBtn");

let videoAtual = null;
let curtirTravado = false;

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
  if (!total) return "—";
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = Math.floor(total % 60);
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  return `${minutos}min ${String(segs).padStart(2, "0")}s`;
}

function normalizarVideo(video = {}) {
  const thumb = video.thumbnailSecureUrl || video.thumbnailUrl || video.thumbnail || video.capa || "imagens/logo.png";
  const urlFinal = video.videoSecureUrl || video.videoUrl || video.urlVideo || video.src || "";

  let duracaoExibicao = "—";
  if (typeof video.duracao === "string" && video.duracao.trim()) duracaoExibicao = video.duracao.trim();
  else if (typeof video.duracao === "number" || typeof video.duracaoSegundos === "number") duracaoExibicao = formatarDuracao(video.duracaoSegundos || video.duracao || 0);

  return {
    ...video,
    id: video.id || video.docId || "",
    docId: video.docId || video.id || "",
    thumb,
    urlFinal,
    previewUrl: video.previewUrl || urlFinal,
    duracaoExibicao,
    publicadoEmFinal: video.publicadoEm || video.createdAt || video.criadoEm || null
  };
}

function abrirVideo(video) {
  if (!video?.id) return;
  window.location.href = `video.html?id=${encodeURIComponent(video.id)}`;
}

function criarMarkupPreview(video) {
  if (!video?.previewUrl) return "";
  return `<video muted loop playsinline preload="none" aria-hidden="true"><source src="${escaparHtml(video.previewUrl)}" type="video/mp4"></video>`;
}

function configurarHoverPreview(card) {
  const videoPreview = card.querySelector("video");
  if (!videoPreview) return;
  card.addEventListener("mouseenter", async () => {
    try {
      videoPreview.currentTime = 0;
      await videoPreview.play();
    } catch {}
  });
  card.addEventListener("mouseleave", () => {
    videoPreview.pause();
    videoPreview.currentTime = 0;
  });
}

function criarCardNormal(videoOriginal) {
  const video = normalizarVideo(videoOriginal);
  const card = document.createElement("div");
  card.classList.add("card");
  card.tabIndex = 0;
  card.innerHTML = `<div class="card-media"><img src="${escaparHtml(video.thumb)}" alt="${escaparHtml(video.titulo || "Vídeo")}">${criarMarkupPreview(video)}<div class="card-overlay"><h3>${escaparHtml(video.titulo || "Sem título")}</h3><p>${escaparHtml(video.categoria || "Sem categoria")}</p></div></div>`;
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

function criarCardRanking(videoOriginal, posicao) {
  const video = normalizarVideo(videoOriginal);
  const card = document.createElement("div");
  card.classList.add("card-ranking");
  card.tabIndex = 0;
  card.innerHTML = `<span class="ranking-numero">${posicao}</span><div class="card-ranking-thumb"><img src="${escaparHtml(video.thumb)}" alt="${escaparHtml(video.titulo || "Vídeo")}">${criarMarkupPreview(video)}<div class="card-ranking-overlay"><h3>${escaparHtml(video.titulo || "Sem título")}</h3><p>${escaparHtml(video.categoria || "Sem categoria")}</p></div></div>`;
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
  (lista || []).forEach((video, index) => container.appendChild(tipo === "ranking" ? criarCardRanking(video, index + 1) : criarCardNormal(video)));
}

async function carregarHome() {
  if (!topVideosContainer && !emAltaContainer && !categoriaTecnologiaContainer) return;
  try {
    const todos = (await buscarTodosVideos()).map(normalizarVideo).filter((v) => v.ativo !== false && v.id);
    renderizarLista(topVideosContainer, todos.filter((v) => v.topVideos || v.topSemanal || v.destaque).slice(0, 8), "ranking");
    renderizarLista(topSemanalContainer, todos.filter((v) => v.topSemanal).slice(0, 8), "ranking");
    renderizarLista(emAltaContainer, todos.filter((v) => v.emAlta || v.lancamento).slice(0, 12), "normal");
    renderizarLista(categoriaTecnologiaContainer, todos.filter((v) => (v.categoria || "").toLowerCase() === "tecnologia").slice(0, 12), "normal");
  } catch (error) {
    console.error("[Vídeos] Erro ao carregar home:", error);
  }
}

async function incrementarViews(docId) {
  if (!docId) return;
  try { await updateDoc(doc(db, "videos", docId), { views: increment(1) }); } catch {}
}

function prepararOverlayIntro(urlFinal = "") {
  if (!entradaOverlay || !entradaBtn || !videoPlayer) return;
  entradaOverlay.classList.remove("oculto");
  entradaBtn.onclick = async () => {
    entradaOverlay.classList.add("oculto");
    try {
      if (!videoPlayer.src && urlFinal) {
        const source = videoPlayer.querySelector("source");
        if (source) source.src = urlFinal;
        else videoPlayer.src = urlFinal;
        videoPlayer.load();
      }
      await videoPlayer.play();
    } catch (error) {
      console.warn("[Vídeos] Falha ao iniciar vídeo:", error);
    }
  };
}

async function configurarBotoesAcao() {
  if (!botoesAcaoVideo.length || !videoAtual) return;
  const btnCurtir = botoesAcaoVideo[0];
  const btnFavoritar = botoesAcaoVideo[1];

  if (btnCurtir && !btnCurtir.dataset.bindLike) {
    btnCurtir.dataset.bindLike = "1";
    btnCurtir.addEventListener("click", async () => {
      if (!videoAtual?.docId || curtirTravado) return;
      curtirTravado = true;
      try {
        await updateDoc(doc(db, "videos", videoAtual.docId), { likes: increment(1) });
        videoAtual.likes = Number(videoAtual.likes || 0) + 1;
        if (analyticsLikes) analyticsLikes.textContent = String(videoAtual.likes);
        btnCurtir.textContent = `👍 Curtido (${videoAtual.likes})`;
      } finally {
        setTimeout(() => { curtirTravado = false; }, 1200);
      }
    });
  }

  if (btnFavoritar && !btnFavoritar.dataset.bindFav) {
    btnFavoritar.dataset.bindFav = "1";
    const jaFavoritado = await favoritado(videoAtual.id);
    btnFavoritar.textContent = jaFavoritado ? "⭐ Favoritado" : "⭐ Favoritar";
    btnFavoritar.addEventListener("click", async () => {
      const ativo = await favoritado(videoAtual.id);
      if (ativo) {
        await removerFavorito(videoAtual.id);
        videoAtual.favoritos = Math.max(0, Number(videoAtual.favoritos || 0) - 1);
        btnFavoritar.textContent = "⭐ Favoritar";
      } else {
        await adicionarFavorito(videoAtual);
        videoAtual.favoritos = Number(videoAtual.favoritos || 0) + 1;
        btnFavoritar.textContent = "⭐ Favoritado";
      }
      if (analyticsFavoritos) analyticsFavoritos.textContent = String(videoAtual.favoritos || 0);
    });
  }
}

async function carregarRecomendacoes(video) {
  if (!recomendacoesVideo) return;
  recomendacoesVideo.innerHTML = "";
  try {
    const lista = (await buscarRecomendacoesPorCategoria(video.categoria || "")).map(normalizarVideo);
    const filtrados = lista.filter((item) => item.id !== video.id && item.ativo !== false).slice(0, 10);
    if (!filtrados.length) {
      if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "flex";
      return;
    }
    if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "none";
    renderizarLista(recomendacoesVideo, filtrados, "normal");
  } catch {
    if (estadoVazioRecomendacoes) estadoVazioRecomendacoes.style.display = "flex";
  }
}

async function carregarPaginaVideo() {
  if (!videoTitulo || !videoPlayer) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  try {
    const video = normalizarVideo(await buscarVideoPorId(id) || {});
    if (!video?.id) {
      videoTitulo.textContent = "Vídeo não encontrado";
      return;
    }

    videoAtual = video;
    if (videoCategoria) videoCategoria.textContent = video.categoria || "Sem categoria";
    if (videoTitulo) videoTitulo.textContent = video.titulo || "Sem título";
    if (videoDescricao) videoDescricao.textContent = video.descricao || "Sem descrição.";
    if (videoDuracao) videoDuracao.textContent = video.duracaoExibicao || "—";
    if (videoPublicacao) videoPublicacao.textContent = formatarData(video.publicadoEmFinal);
    if (videoViews) videoViews.textContent = String(video.views || 0);
    if (analyticsViews) analyticsViews.textContent = String(video.views || 0);
    if (analyticsLikes) analyticsLikes.textContent = String(video.likes || 0);
    if (analyticsFavoritos) analyticsFavoritos.textContent = String(video.favoritos || 0);
    if (analyticsRetencao) analyticsRetencao.textContent = "—";

    const source = videoPlayer.querySelector("source");
    if (video.urlFinal) {
      if (source) source.src = video.urlFinal;
      videoPlayer.src = video.urlFinal;
      videoPlayer.poster = video.thumb || "imagens/fundo.png";
      videoPlayer.load();
      prepararOverlayIntro(video.urlFinal);
    } else {
      if (entradaOverlay) entradaOverlay.classList.add("oculto");
      videoTitulo.textContent = `${video.titulo || "Vídeo"} (arquivo de vídeo ausente)`;
    }

    document.title = `BRASFLIX - ${video.titulo || "Vídeo"}`;
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
