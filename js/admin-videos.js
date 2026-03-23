import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET_IMAGE =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE ||
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  "";
const CLOUDINARY_UPLOAD_PRESET_VIDEO =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  "";

const state = {
  currentUser: null,
  currentUserData: null,
  editingId: null,
  videos: []
};

function qs(selectors = []) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

const els = {
  form: qs([
    "#formVideo",
    "#videoForm",
    "#formCadastrarVideo",
    "form[data-admin-video-form]"
  ]),
  titulo: qs([
    "#tituloVideo",
    "#videoTitulo",
    "#titulo",
    "input[name='titulo']"
  ]),
  descricao: qs([
    "#descricaoVideo",
    "#videoDescricao",
    "#descricao",
    "textarea[name='descricao']"
  ]),
  categoria: qs([
    "#categoriaVideo",
    "#videoCategoria",
    "#categoria",
    "select[name='categoria']",
    "input[name='categoria']"
  ]),
  thumbnailUrl: qs([
    "#thumbnailUrl",
    "#videoThumbnail",
    "#capaUrl",
    "input[name='thumbnailUrl']"
  ]),
  videoUrl: qs([
    "#videoUrl",
    "#urlVideo",
    "input[name='videoUrl']"
  ]),
  thumbnailFile: qs([
    "#thumbnailFile",
    "#thumbFile",
    "#uploadThumbnail",
    "input[name='thumbnailFile']"
  ]),
  videoFile: qs([
    "#videoFile",
    "#uploadVideo",
    "input[name='videoFile']"
  ]),
  destaque: qs([
    "#videoDestaque",
    "#destaqueVideo",
    "#destaque",
    "input[name='destaque']"
  ]),
  ordem: qs([
    "#videoOrdem",
    "#ordemVideo",
    "#ordem",
    "input[name='ordem']"
  ]),
  duracao: qs([
    "#videoDuracao",
    "#duracaoVideo",
    "#duracao",
    "input[name='duracao']"
  ]),
  tags: qs([
    "#videoTags",
    "#tagsVideo",
    "#tags",
    "input[name='tags']"
  ]),
  btnSubmit: qs([
    "#btnSalvarVideo",
    "#btnCadastrarVideo",
    "button[type='submit']"
  ]),
  btnReset: qs([
    "#btnLimparVideo",
    "#btnCancelarEdicaoVideo",
    "button[type='reset']"
  ]),
  lista: qs([
    "#listaVideosAdmin",
    "#adminVideosLista",
    "#videosAdminLista",
    "[data-admin-videos-list]"
  ]),
  status: qs([
    "#adminVideosStatus",
    "#videoAdminStatus",
    "[data-admin-videos-status]"
  ]),
  previewThumb: qs([
    "#previewThumbnail",
    "#thumbnailPreview",
    "[data-video-thumbnail-preview]"
  ]),
  previewVideo: qs([
    "#previewVideo",
    "#videoPreview",
    "[data-video-preview]"
  ])
};

function setStatus(message, isError = false) {
  if (!els.status) {
    console[isError ? "error" : "log"]("[admin-videos]", message);
    return;
  }

  els.status.textContent = message;
  els.status.style.color = isError ? "#ff9b9b" : "#d8d8d8";
  els.status.style.borderColor = isError ? "#5b1c1c" : "#2a2a2a";
}

function alertar(message) {
  window.alert(message);
}

function limparTexto(value) {
  return typeof value === "string" ? value.trim() : "";
}

function limparNumero(value, fallback = 0) {
  if (value === "" || value === null || typeof value === "undefined") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function splitTags(value) {
  return limparTexto(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBool(value) {
  return Boolean(value);
}

function isCloudinaryConfiguredForImage() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET_IMAGE);
}

function isCloudinaryConfiguredForVideo() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET_VIDEO);
}

function getFile(el) {
  return el?.files?.[0] || null;
}

function resetPreviews() {
  if (els.previewThumb) {
    els.previewThumb.innerHTML = "";
  }

  if (els.previewVideo) {
    els.previewVideo.innerHTML = "";
  }
}

function renderThumbPreview(url = "") {
  if (!els.previewThumb) return;
  const safe = limparTexto(url);
  if (!safe) {
    els.previewThumb.innerHTML = "";
    return;
  }

  els.previewThumb.innerHTML = `<img src="${safe}" alt="Prévia da thumbnail" style="max-width:220px;border-radius:12px;display:block;">`;
}

function renderVideoPreview(url = "") {
  if (!els.previewVideo) return;
  const safe = limparTexto(url);
  if (!safe) {
    els.previewVideo.innerHTML = "";
    return;
  }

  els.previewVideo.innerHTML = `
    <video controls style="max-width:260px;border-radius:12px;display:block;">
      <source src="${safe}">
      Seu navegador não suporta vídeo.
    </video>
  `;
}

function bindPreviewEvents() {
  els.thumbnailUrl?.addEventListener("input", () => {
    renderThumbPreview(els.thumbnailUrl.value);
  });

  els.videoUrl?.addEventListener("input", () => {
    renderVideoPreview(els.videoUrl.value);
  });

  els.thumbnailFile?.addEventListener("change", () => {
    const file = getFile(els.thumbnailFile);
    if (!file || !els.previewThumb) return;

    const reader = new FileReader();
    reader.onload = () => renderThumbPreview(reader.result || "");
    reader.readAsDataURL(file);
  });

  els.videoFile?.addEventListener("change", () => {
    const file = getFile(els.videoFile);
    if (!file || !els.previewVideo) return;

    const reader = new FileReader();
    reader.onload = () => renderVideoPreview(reader.result || "");
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file, resourceType = "image") {
  if (!file) {
    return {
      url: "",
      secureUrl: "",
      publicId: ""
    };
  }

  const isImage = resourceType === "image";
  const preset = isImage ? CLOUDINARY_UPLOAD_PRESET_IMAGE : CLOUDINARY_UPLOAD_PRESET_VIDEO;

  if (!CLOUDINARY_CLOUD_NAME || !preset) {
    throw new Error(
      isImage
        ? "Cloudinary de imagem não configurado."
        : "Cloudinary de vídeo não configurado."
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  formData.append("folder", isImage ? "brasflix/thumbnails" : "brasflix/videos");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Erro ao enviar ${isImage ? "imagem" : "vídeo"}.`);
  }

  return {
    url: limparTexto(data?.url || data?.secure_url || ""),
    secureUrl: limparTexto(data?.secure_url || data?.url || ""),
    publicId: limparTexto(data?.public_id || "")
  };
}

function montarPayloadVideo(base = {}) {
  const thumbnailUrl = limparTexto(base.thumbnailUrl);
  const thumbnailSecureUrl =
    limparTexto(base.thumbnailSecureUrl) || thumbnailUrl || "";
  const videoUrl = limparTexto(base.videoUrl);
  const videoSecureUrl =
    limparTexto(base.videoSecureUrl) || videoUrl || "";

  return {
    titulo: limparTexto(base.titulo),
    descricao: limparTexto(base.descricao),
    categoria: limparTexto(base.categoria),
    thumbnailUrl,
    thumbnailSecureUrl,
    thumbnailPublicId: limparTexto(base.thumbnailPublicId),
    videoUrl,
    videoSecureUrl,
    videoPublicId: limparTexto(base.videoPublicId),
    destaque: toBool(base.destaque),
    ordem: limparNumero(base.ordem, 0),
    duracao: limparNumero(base.duracao, 0),
    tags: Array.isArray(base.tags) ? base.tags.filter(Boolean) : [],
    ativo: typeof base.ativo === "boolean" ? base.ativo : true,
    atualizadoEm: serverTimestamp()
  };
}

async function ensureAdmin(user) {
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const data = snap.exists() ? snap.data() || {} : {};

  if (data.role !== "admin") {
    window.location.href = "../index.html";
    return null;
  }

  return data;
}

function getFormValues() {
  return {
    titulo: els.titulo?.value || "",
    descricao: els.descricao?.value || "",
    categoria: els.categoria?.value || "",
    thumbnailUrl: els.thumbnailUrl?.value || "",
    videoUrl: els.videoUrl?.value || "",
    destaque: els.destaque?.checked || false,
    ordem: els.ordem?.value || 0,
    duracao: els.duracao?.value || 0,
    tags: splitTags(els.tags?.value || "")
  };
}

function validatePayload(payload) {
  if (!payload.titulo) throw new Error("Informe o título do vídeo.");
  if (!payload.descricao) throw new Error("Informe a descrição.");
  if (!payload.categoria) throw new Error("Informe a categoria.");

  if (!payload.thumbnailUrl && !payload.thumbnailSecureUrl) {
    throw new Error("Informe a thumbnail por URL ou upload.");
  }

  if (!payload.videoUrl && !payload.videoSecureUrl) {
    throw new Error("Informe o vídeo por URL ou upload.");
  }
}

function limparFormulario() {
  state.editingId = null;

  els.form?.reset?.();
  resetPreviews();
  setStatus("Formulário limpo.");
  if (els.btnSubmit) {
    els.btnSubmit.textContent = "Salvar vídeo";
  }
}

function preencherFormulario(video) {
  state.editingId = video.id;

  if (els.titulo) els.titulo.value = video.titulo || "";
  if (els.descricao) els.descricao.value = video.descricao || "";
  if (els.categoria) els.categoria.value = video.categoria || "";
  if (els.thumbnailUrl) els.thumbnailUrl.value = video.thumbnailSecureUrl || video.thumbnailUrl || "";
  if (els.videoUrl) els.videoUrl.value = video.videoSecureUrl || video.videoUrl || "";
  if (els.destaque) els.destaque.checked = !!video.destaque;
  if (els.ordem) els.ordem.value = video.ordem ?? 0;
  if (els.duracao) els.duracao.value = video.duracao ?? 0;
  if (els.tags) els.tags.value = Array.isArray(video.tags) ? video.tags.join(", ") : "";

  renderThumbPreview(video.thumbnailSecureUrl || video.thumbnailUrl || "");
  renderVideoPreview(video.videoSecureUrl || video.videoUrl || "");

  if (els.btnSubmit) {
    els.btnSubmit.textContent = "Atualizar vídeo";
  }

  setStatus(`Editando: ${video.titulo}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirVideo(id, titulo = "") {
  const ok = window.confirm(`Deseja excluir o vídeo "${titulo || "sem título"}"?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "videos", id));
    setStatus("Vídeo excluído com sucesso.");
    await carregarVideos();
  } catch (error) {
    console.error("[admin-videos] Erro ao excluir:", error);
    setStatus(error.message || "Erro ao excluir vídeo.", true);
    alertar(error.message || "Erro ao excluir vídeo.");
  }
}

function renderLista(videos = []) {
  if (!els.lista) return;

  if (!videos.length) {
    els.lista.innerHTML = `
      <div class="admin-video-empty">Nenhum vídeo cadastrado ainda.</div>
    `;
    return;
  }

  els.lista.innerHTML = videos.map((video) => {
    const thumb = video.thumbnailSecureUrl || video.thumbnailUrl || "";
    const safeTitle = video.titulo || "Sem título";

    return `
      <div class="admin-video-card" data-id="${video.id}" style="border:1px solid #232323;border-radius:18px;padding:16px;background:#0f0f0f;margin-bottom:14px;">
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
          <div style="width:180px;max-width:100%;">
            ${thumb ? `<img src="${thumb}" alt="${safeTitle}" style="width:100%;border-radius:12px;display:block;">` : `<div style="height:100px;border-radius:12px;background:#161616;display:flex;align-items:center;justify-content:center;">Sem thumb</div>`}
          </div>
          <div style="flex:1;min-width:240px;">
            <h3 style="margin:0 0 8px;color:#fff;">${safeTitle}</h3>
            <p style="margin:0 0 8px;color:#cfcfcf;">${video.descricao || ""}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <span style="padding:6px 10px;border-radius:999px;background:#1a1a1a;color:#fff;">${video.categoria || "Sem categoria"}</span>
              <span style="padding:6px 10px;border-radius:999px;background:#1a1a1a;color:#fff;">Ordem: ${video.ordem ?? 0}</span>
              <span style="padding:6px 10px;border-radius:999px;background:#1a1a1a;color:#fff;">Duração: ${video.duracao ?? 0}</span>
              ${video.destaque ? `<span style="padding:6px 10px;border-radius:999px;background:#2c0f0f;color:#fff;border:1px solid #e50914;">Destaque</span>` : ""}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" data-action="editar" data-id="${video.id}" style="padding:10px 14px;border-radius:12px;border:none;background:#2b2b2b;color:#fff;cursor:pointer;">Editar</button>
              <button type="button" data-action="excluir" data-id="${video.id}" style="padding:10px 14px;border-radius:12px;border:none;background:#6a1212;color:#fff;cursor:pointer;">Excluir</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  qsa("[data-action='editar']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const video = state.videos.find((item) => item.id === id);
      if (video) preencherFormulario(video);
    });
  });

  qsa("[data-action='excluir']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const video = state.videos.find((item) => item.id === id);
      excluirVideo(id, video?.titulo || "");
    });
  });
}

async function carregarVideos() {
  try {
    const snap = await getDocs(query(collection(db, "videos"), orderBy("ordem", "asc")));
    state.videos = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderLista(state.videos);
  } catch (error) {
    console.error("[admin-videos] Erro ao carregar vídeos:", error);
    setStatus(error.message || "Erro ao carregar vídeos.", true);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  try {
    setStatus("Preparando envio...");

    const values = getFormValues();

    const thumbFile = getFile(els.thumbnailFile);
    const videoFile = getFile(els.videoFile);

    let thumbnailUpload = {
      url: limparTexto(values.thumbnailUrl),
      secureUrl: limparTexto(values.thumbnailUrl),
      publicId: ""
    };

    let videoUpload = {
      url: limparTexto(values.videoUrl),
      secureUrl: limparTexto(values.videoUrl),
      publicId: ""
    };

    if (thumbFile) {
      if (!isCloudinaryConfiguredForImage()) {
        throw new Error("Cloudinary de imagem não configurado para upload da thumbnail.");
      }
      setStatus("Enviando thumbnail...");
      thumbnailUpload = await uploadToCloudinary(thumbFile, "image");
    }

    if (videoFile) {
      if (!isCloudinaryConfiguredForVideo()) {
        throw new Error("Cloudinary de vídeo não configurado para upload do vídeo.");
      }
      setStatus("Enviando vídeo...");
      videoUpload = await uploadToCloudinary(videoFile, "video");
    }

    const payload = montarPayloadVideo({
      titulo: values.titulo,
      descricao: values.descricao,
      categoria: values.categoria,
      thumbnailUrl: thumbnailUpload.url || values.thumbnailUrl || "",
      thumbnailSecureUrl:
        thumbnailUpload.secureUrl || thumbnailUpload.url || values.thumbnailUrl || "",
      thumbnailPublicId: thumbnailUpload.publicId || "",
      videoUrl: videoUpload.url || values.videoUrl || "",
      videoSecureUrl:
        videoUpload.secureUrl || videoUpload.url || values.videoUrl || "",
      videoPublicId: videoUpload.publicId || "",
      destaque: values.destaque,
      ordem: values.ordem,
      duracao: values.duracao,
      tags: values.tags,
      ativo: true
    });

    validatePayload(payload);

    if (state.editingId) {
      await updateDoc(doc(db, "videos", state.editingId), payload);
      setStatus("Vídeo atualizado com sucesso.");
    } else {
      await addDoc(collection(db, "videos"), {
        ...payload,
        criadoEm: serverTimestamp(),
        criadoPor: state.currentUser?.uid || "",
        criadoPorNome: state.currentUserData?.nome || state.currentUser?.email || ""
      });
      setStatus("Vídeo cadastrado com sucesso.");
    }

    limparFormulario();
    await carregarVideos();
  } catch (error) {
    console.error("[admin-videos] Erro ao salvar vídeo:", error);
    setStatus(error.message || "Erro ao salvar vídeo.", true);
    alertar(error.message || "Erro ao salvar vídeo.");
  }
}

function bind() {
  els.form?.addEventListener("submit", handleSubmit);
  els.btnReset?.addEventListener("click", () => {
    setTimeout(() => limparFormulario(), 0);
  });

  bindPreviewEvents();
}

function init() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../login.html";
      return;
    }

    state.currentUser = user;

    const adminData = await ensureAdmin(user);
    if (!adminData) return;

    state.currentUserData = adminData;
    bind();
    await carregarVideos();
    setStatus("Área de vídeos pronta.");
  });
}

document.addEventListener("DOMContentLoaded", init);
