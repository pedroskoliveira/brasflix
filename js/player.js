import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const playerBrasflix = document.getElementById("playerBrasflix");

const videoCategoria = document.getElementById("videoCategoria");
const videoTitulo = document.getElementById("videoTitulo");
const videoDescricao = document.getElementById("videoDescricao");
const videoDuracao = document.getElementById("videoDuracao");
const videoPublicacao = document.getElementById("videoPublicacao");
const videoViews = document.getElementById("videoViews");

const analyticsViews = document.getElementById("analyticsViews");
const analyticsLikes = document.getElementById("analyticsLikes");
const analyticsFavoritos = document.getElementById("analyticsFavoritos");
const analyticsRetencao = document.getElementById("analyticsRetencao");

const listaComentariosVideo = document.getElementById("listaComentariosVideo");
const estadoVazioComentarios = document.getElementById("estadoVazioComentarios");

const recomendacoesVideo = document.getElementById("recomendacoesVideo");
const estadoVazioRecomendacoes = document.getElementById("estadoVazioRecomendacoes");

function obterVideoIdDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function escaparHtml(texto = "") {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarTextoOuPadrao(valor, padrao = "—") {
  if (valor === null || valor === undefined || valor === "") {
    return padrao;
  }

  return String(valor);
}

function preencherInformacoesVideo(video = {}) {
  if (videoCategoria) {
    videoCategoria.textContent = video.categoria || "Categorizado";
  }

  if (videoTitulo) {
    videoTitulo.textContent = video.titulo || "Vídeo indisponível";
  }

  if (videoDescricao) {
    videoDescricao.textContent =
      video.descricao ||
      "As informações deste vídeo aparecerão aqui quando os dados forem carregados.";
  }

  if (videoDuracao) {
    videoDuracao.textContent = formatarTextoOuPadrao(video.duracao);
  }

  if (videoPublicacao) {
    videoPublicacao.textContent = formatarTextoOuPadrao(video.dataPublicacao);
  }

  if (videoViews) {
    videoViews.textContent = formatarTextoOuPadrao(video.views);
  }

  if (analyticsViews) {
    analyticsViews.textContent = formatarTextoOuPadrao(video.views);
  }

  if (analyticsLikes) {
    analyticsLikes.textContent = formatarTextoOuPadrao(video.likes);
  }

  if (analyticsFavoritos) {
    analyticsFavoritos.textContent = formatarTextoOuPadrao(video.favoritos);
  }

  if (analyticsRetencao) {
    analyticsRetencao.textContent = formatarTextoOuPadrao(video.retencao);
  }

  if (playerBrasflix && video.urlVideo) {
    playerBrasflix.src = video.urlVideo;
  }

  if (playerBrasflix && video.thumbnail) {
    playerBrasflix.setAttribute("poster", video.thumbnail);
  }

  if (video.titulo) {
    document.title = `BRASFLIX - ${video.titulo}`;
  }

  prepararEntradaVideo(video);
}

function prepararEntradaVideo(video = {}) {
  const entradaOverlay = document.getElementById("entradaVideoOverlay");
  const entradaBtn = document.getElementById("entradaVideoBtn");

  if (!entradaOverlay || !entradaBtn || !playerBrasflix) return;

  entradaOverlay.classList.remove("oculto");
  playerBrasflix.pause();

  const introUrl = video.introUrl || "";

  entradaBtn.onclick = async () => {
    try {
      entradaOverlay.classList.add("oculto");

      if (introUrl) {
        const mainUrl = playerBrasflix.src;
        playerBrasflix.src = introUrl;
        playerBrasflix.muted = false;

        playerBrasflix.play().catch(() => {});

        playerBrasflix.onended = () => {
          playerBrasflix.onended = null;
          playerBrasflix.src = mainUrl;
          playerBrasflix.play().catch(() => {});
        };

        return;
      }

      playerBrasflix.play().catch(() => {
        console.warn("Não foi possível reproduzir o vídeo imediatamente.");
      });
    } catch (erro) {
      console.error("Erro ao iniciar vídeo após toque:", erro);
    }
  };
}

function criarComentario(comentario = {}) {
  const item = document.createElement("div");
  item.classList.add("comentario");

  item.innerHTML = `
    <strong>${escaparHtml(comentario.usuario || "Usuário")}</strong>
    <p>${escaparHtml(comentario.texto || "")}</p>
  `;

  return item;
}

function atualizarComentarios(lista = []) {
  if (!listaComentariosVideo || !estadoVazioComentarios) return;

  listaComentariosVideo.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    estadoVazioComentarios.style.display = "flex";
    listaComentariosVideo.style.display = "none";
    return;
  }

  estadoVazioComentarios.style.display = "none";
  listaComentariosVideo.style.display = "flex";

  lista.forEach((comentario) => {
    listaComentariosVideo.appendChild(criarComentario(comentario));
  });
}

function abrirVideo(video) {
  if (!video || !video.id) return;

  const url = new URL("video.html", window.location.href);
  url.searchParams.set("id", video.id);
  window.location.href = url.toString();
}

function criarMarkupPreview(video) {
  if (!video.previewUrl) return "";

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
    } catch (erro) {
      console.error("Não foi possível tocar o preview:", erro);
    }
  });

  card.addEventListener("mouseleave", () => {
    videoPreview.pause();
    videoPreview.currentTime = 0;
  });
}

function configurarAcoesRecomendacao(card, video) {
  const botaoAssistir = card.querySelector('[data-acao="assistir"]');
  const botaoFavoritar = card.querySelector('[data-acao="favoritar"]');
  const botaoCurtir = card.querySelector('[data-acao="curtir"]');

  card.addEventListener("click", (event) => {
    const clicouEmBotao = event.target.closest("button");
    if (clicouEmBotao) return;

    abrirVideo(video);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      const focadoEhBotao =
        document.activeElement && document.activeElement.tagName === "BUTTON";

      if (focadoEhBotao) return;

      event.preventDefault();
      abrirVideo(video);
    }
  });

  if (botaoAssistir) {
    botaoAssistir.addEventListener("click", (event) => {
      event.stopPropagation();
      abrirVideo(video);
    });
  }

  if (botaoFavoritar) {
    botaoFavoritar.addEventListener("click", (event) => {
      event.stopPropagation();
      console.log("Favoritar recomendação:", video.id);
    });
  }

  if (botaoCurtir) {
    botaoCurtir.addEventListener("click", (event) => {
      event.stopPropagation();
      console.log("Curtir recomendação:", video.id);
    });
  }
}

function criarCardRecomendacao(video) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Abrir vídeo ${video.titulo || "vídeo"}`);

  if (video.previewUrl) {
    card.classList.add("has-preview");
  }

  card.innerHTML = `
    <div class="card-media">
      <img src="${escaparHtml(video.thumbnail || "")}" alt="${escaparHtml(video.titulo || "Vídeo")}">
      ${criarMarkupPreview(video)}
      <div class="card-overlay">
        <h3>${escaparHtml(video.titulo || "")}</h3>
        <p>${escaparHtml(video.categoria || "")}</p>
        <div class="card-actions">
          <button class="card-action-btn" type="button" aria-label="Assistir ${escaparHtml(video.titulo || "vídeo")}" data-acao="assistir">▶</button>
          <button class="card-action-btn" type="button" aria-label="Favoritar ${escaparHtml(video.titulo || "vídeo")}" data-acao="favoritar">★</button>
          <button class="card-action-btn" type="button" aria-label="Curtir ${escaparHtml(video.titulo || "vídeo")}" data-acao="curtir">👍</button>
        </div>
      </div>
    </div>
  `;

  configurarHoverPreview(card);
  configurarAcoesRecomendacao(card, video);

  return card;
}

function atualizarRecomendacoes(lista = []) {
  if (!recomendacoesVideo || !estadoVazioRecomendacoes) return;

  recomendacoesVideo.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    estadoVazioRecomendacoes.style.display = "flex";
    recomendacoesVideo.style.display = "none";
    return;
  }

  estadoVazioRecomendacoes.style.display = "none";
  recomendacoesVideo.style.display = "flex";

  lista.forEach((video) => {
    recomendacoesVideo.appendChild(criarCardRecomendacao(video));
  });
}

async function buscarVideoPorId(videoId) {
  const ref = doc(db, "videos", videoId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}

async function buscarComentariosPorVideo(videoId) {
  try {
    const comentariosRef = collection(db, "comentarios");
    const q = query(
      comentariosRef,
      where("videoId", "==", videoId),
      orderBy("criadoEm", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.warn("Erro ao buscar comentários:", error);
    return [];
  }
}

async function buscarRecomendacoesPorCategoria(categoria, videoAtualId) {
  try {
    const videosRef = collection(db, "videos");
    const q = query(
      videosRef,
      where("categoria", "==", categoria),
      limit(12)
    );

    const snap = await getDocs(q);

    return snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((video) => video.id !== videoAtualId);
  } catch (error) {
    console.warn("Erro ao buscar recomendações:", error);
    return [];
  }
}

async function incrementarViewVideo(videoId) {
  try {
    const ref = doc(db, "videos", videoId);
    await updateDoc(ref, {
      views: increment(1)
    });
  } catch (error) {
    console.warn("Erro ao incrementar views:", error);
  }
}

async function carregarVideoAtual() {
  const videoId = obterVideoIdDaUrl();

  if (!videoId) {
    preencherInformacoesVideo({
      titulo: "Vídeo não encontrado",
      descricao: "Nenhum identificador de vídeo foi informado na URL."
    });
    atualizarComentarios([]);
    atualizarRecomendacoes([]);
    return;
  }

  try {
    const video = await buscarVideoPorId(videoId);

    if (!video) {
      preencherInformacoesVideo({
        titulo: "Vídeo não encontrado",
        descricao: "O vídeo informado não existe no Firebase."
      });
      atualizarComentarios([]);
      atualizarRecomendacoes([]);
      return;
    }

    preencherInformacoesVideo(video);

    const [comentarios, recomendacoes] = await Promise.all([
      buscarComentariosPorVideo(videoId),
      buscarRecomendacoesPorCategoria(video.categoria || "", videoId)
    ]);

    atualizarComentarios(comentarios);
    atualizarRecomendacoes(recomendacoes);

    await incrementarViewVideo(videoId);
  } catch (error) {
    console.error("Erro ao carregar vídeo:", error);

    preencherInformacoesVideo({
      titulo: "Erro ao carregar vídeo",
      descricao: "Ocorreu um erro ao buscar os dados no Firebase."
    });

    atualizarComentarios([]);
    atualizarRecomendacoes([]);
  }
}

function salvarMetricasEmocionais(metricas) {
  if (!metricas) return;

  localStorage.setItem("brasflixEmotionMetrics", JSON.stringify(metricas));

  if (metricas.emocaoPredominante) {
    localStorage.setItem(
      "brasflixEmotionDominante",
      metricas.emocaoPredominante
    );
  }
}

async function buscarVideosPorCategoriaFirebase(categoria) {
  if (!categoria) return [];

  try {
    const videosRef = collection(db, "videos");
    const q = query(
      videosRef,
      where("categoria", "==", categoria),
      limit(12)
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.warn("Erro ao buscar vídeos por categoria:", error);
    return [];
  }
}

async function sugerirConteudosPorEmocao(emocao) {
  const sugestoesPorEmocao = {
    feliz: "Comédia",
    triste: "Drama",
    irritado: "Ação",
    surpreso: "Documentário",
    curioso: "Educação",
    neutro: "Clássico"
  };

  const categoria = sugestoesPorEmocao[emocao] || sugestoesPorEmocao.neutro;

  const recomendacoesFirebase = await buscarVideosPorCategoriaFirebase(categoria);

  const recomendacoes =
    recomendacoesFirebase.length > 0
      ? recomendacoesFirebase
      : [
          {
            id: "1",
            titulo: "Sugestão padrão 1",
            categoria,
            thumbnail: "imagens/placeholder.png"
          },
          {
            id: "2",
            titulo: "Sugestão padrão 2",
            categoria,
            thumbnail: "imagens/placeholder.png"
          }
        ];

  atualizarRecomendacoes(recomendacoes);

  const emotionStatus = document.getElementById("emotionStatus");
  if (emotionStatus) {
    emotionStatus.textContent = `Emoção detectada: ${emocao}. Recomendando ${recomendacoes.length} conteúdo(s) de ${categoria}.`;
  }
}

window.BrasflixEmotionRecommender = {
  sugerir: sugerirConteudosPorEmocao
};

function iniciarMonitoramentoEmocional() {
  if (!window.BrasflixEmotionAI || !playerBrasflix) return;

  window.BrasflixEmotionAI.iniciarEmotionAcompanhamento({
    videoElement: playerBrasflix,
    montarFrame: async () => {
      return;
    },
    onUpdate: (data) => {
      salvarMetricasEmocionais(data.metricas);

      const historicoSalvo = localStorage.getItem("brasflixEmotionHistory");

      if (historicoSalvo) {
        try {
          const historico = JSON.parse(historicoSalvo);

          if (window.BrasflixAnalyticsPage?.atualizarHistoricoEmocional) {
            window.BrasflixAnalyticsPage.atualizarHistoricoEmocional(historico);
          }
        } catch (err) {
          console.warn("Falha ao parsear histórico emocional:", err);
        }
      }

      if (window.PedriaCore && window.PedriaCore.config?.usarIA) {
        console.debug("EmotionAI Atualizado:", data.metricas);
      }
    }
  });
}

carregarVideoAtual();
iniciarMonitoramentoEmocional();
