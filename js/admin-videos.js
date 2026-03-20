import { db, auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const listaVideosAdmin = document.getElementById("listaVideosAdmin");
const estadoVazioVideosAdmin = document.getElementById("estadoVazioVideosAdmin");
const contadorVideosAdmin = document.getElementById("contadorVideosAdmin");
const formVideoAdmin = document.getElementById("form-video-admin");
const btnSair = document.querySelector(".login");

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_VIDEO_MB = 10;
const MAX_IMAGE_MB = 2;

const valor = (id) => document.getElementById(id)?.value?.trim() || "";
const check = (id) => !!document.getElementById(id)?.checked;
const arquivo = (id) => document.getElementById(id)?.files?.[0] || null;
const slugify = (texto = "") =>
  String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function validarVideo(file) {
  if (!file) throw new Error("Selecione um vídeo.");
  const limiteBytes = MAX_VIDEO_MB * 1024 * 1024;

  if (!file.type.startsWith("video/")) {
    throw new Error("O arquivo precisa ser um vídeo.");
  }

  if (file.size > limiteBytes) {
    throw new Error(`O vídeo deve ter no máximo ${MAX_VIDEO_MB} MB.`);
  }

  return true;
}

function validarImagem(file) {
  if (!file) return true;
  const limiteBytes = MAX_IMAGE_MB * 1024 * 1024;

  if (!file.type.startsWith("image/")) {
    throw new Error("A thumbnail precisa ser uma imagem.");
  }

  if (file.size > limiteBytes) {
    throw new Error(`A thumbnail deve ter no máximo ${MAX_IMAGE_MB} MB.`);
  }

  return true;
}

async function uploadVideoCloudinary(file, slug) {
  validarVideo(file);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary não configurado na Vercel.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "brasflix/videos");
  formData.append("public_id", slug);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Erro ao enviar vídeo para o Cloudinary.");
  }

  return {
    url: data.secure_url || "",
    secureUrl: data.secure_url || "",
    publicId: data.public_id || "",
    bytes: data.bytes || 0,
    format: data.format || "",
    duration: data.duration || 0,
    resourceType: data.resource_type || "video",
    version: data.version || null,
    createdAtCloudinary: data.created_at || null,
    folder: data.folder || "brasflix/videos"
  };
}

async function uploadImagemCloudinary(file, slug) {
  if (!file) {
    return {
      url: "",
      publicId: "",
      bytes: 0,
      format: ""
    };
  }

  validarImagem(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "brasflix/thumbnails");
  formData.append("public_id", `${slug}-thumb`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Erro ao enviar thumbnail para o Cloudinary.");
  }

  return {
    url: data.secure_url || "",
    secureUrl: data.secure_url || "",
    publicId: data.public_id || "",
    bytes: data.bytes || 0,
    format: data.format || "",
    resourceType: data.resource_type || "image",
    version: data.version || null,
    createdAtCloudinary: data.created_at || null,
    folder: data.folder || "brasflix/thumbnails"
  };
}

function atualizarListaVideosAdmin(lista = []) {
  if (!listaVideosAdmin || !estadoVazioVideosAdmin || !contadorVideosAdmin) return;

  contadorVideosAdmin.textContent = `${lista.length} vídeo(s)`;
  listaVideosAdmin.innerHTML = "";
  estadoVazioVideosAdmin.style.display = lista.length ? "none" : "flex";

  if (!lista.length) return;

  lista.forEach((video) => {
    const card = document.createElement("article");
    card.className = "admin-video-card";
    card.innerHTML = `
      <div class="admin-video-card-thumb">
        <img src="${video.thumbnailUrl || video.thumbnail || '../imagens/logo.png'}" alt="${video.titulo || 'Vídeo'}">
      </div>
      <div class="admin-video-card-body">
        <h3>${video.titulo || "Sem título"}</h3>
        <p>${video.categoria || "Sem categoria"} • ${video.duracaoTexto || video.duracao || "Sem duração"}</p>
        <div class="admin-video-card-actions">
          <button type="button" data-action="toggleAlta" data-id="${video.docId}">
            ${video.emAlta ? "Remover de Em Alta" : "Marcar Em Alta"}
          </button>
          <button type="button" data-action="toggleTop" data-id="${video.docId}">
            ${video.topSemanal ? "Remover do Top" : "Marcar Top"}
          </button>
          <button type="button" data-action="delete" data-id="${video.docId}">
            Excluir
          </button>
        </div>
      </div>
    `;

    card.querySelectorAll("button").forEach((botao) =>
      botao.addEventListener("click", async () => {
        const action = botao.dataset.action;
        const id = botao.dataset.id;

        try {
          if (action === "delete") {
            await deleteDoc(doc(db, "videos", id));
          }

          if (action === "toggleAlta") {
            await updateDoc(doc(db, "videos", id), {
              emAlta: !video.emAlta,
              atualizadoEm: serverTimestamp()
            });
          }

          if (action === "toggleTop") {
            await updateDoc(doc(db, "videos", id), {
              topSemanal: !video.topSemanal,
              atualizadoEm: serverTimestamp()
            });
          }

          await carregarVideosAdmin();
        } catch (error) {
          console.error("[AdminVideos] Erro na ação:", error);
          alert("Não foi possível concluir a ação.");
        }
      })
    );

    listaVideosAdmin.appendChild(card);
  });
}

async function carregarVideosAdmin() {
  try {
    const snapshot = await getDocs(collection(db, "videos"));
    const lista = snapshot.docs.map((item) => ({ docId: item.id, ...item.data() }));

    lista.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return bTime - aTime;
    });

    atualizarListaVideosAdmin(lista);
  } catch (error) {
    console.error("[AdminVideos] Erro ao carregar vídeos:", error);
    atualizarListaVideosAdmin([]);
  }
}

formVideoAdmin?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const titulo = valor("tituloVideo");
  const categoria = valor("categoriaVideo");

  if (!titulo || !categoria) {
    return alert("Preencha pelo menos título e categoria.");
  }

  const videoFile = arquivo("arquivoVideo");
  const thumbFile = arquivo("thumbnailVideo");

  if (!videoFile) {
    return alert("Selecione o arquivo de vídeo.");
  }

  const slug = slugify(titulo);

  try {
    const videoData = await uploadVideoCloudinary(videoFile, slug);
    const thumbData = await uploadImagemCloudinary(thumbFile, slug);

    const docId = `${slug}-${Date.now()}`;

    await addDoc(collection(db, "videos"), {
      docIdSlug: docId,
      id: slug,
      titulo,
      categoria,
      descricao: valor("descricaoVideo"),
      duracaoTexto: valor("duracaoVideo"),
      duracao: videoData.duration || 0,
      autor: valor("autorVideo"),
      tags: valor("tagsVideo").split(",").map((item) => item.trim()).filter(Boolean),

      videoUrl: videoData.url,
      videoSecureUrl: videoData.secureUrl,
      videoPublicId: videoData.publicId,
      videoBytes: videoData.bytes,
      videoFormat: videoData.format,
      videoResourceType: videoData.resourceType,
      videoVersion: videoData.version,
      videoCreatedAtCloudinary: videoData.createdAtCloudinary,
      videoFolder: videoData.folder,

      thumbnailUrl: thumbData.url,
      thumbnailSecureUrl: thumbData.secureUrl,
      thumbnailPublicId: thumbData.publicId,
      thumbnailBytes: thumbData.bytes,
      thumbnailFormat: thumbData.format,
      thumbnailResourceType: thumbData.resourceType,
      thumbnailVersion: thumbData.version,
      thumbnailCreatedAtCloudinary: thumbData.createdAtCloudinary,
      thumbnailFolder: thumbData.folder,

      destaque: check("videoDestaque"),
      lancamento: check("videoLancamento"),
      emAlta: check("videoEmAlta"),
      topSemanal: check("videoTopSemanal"),

      views: 0,
      likes: 0,
      dislikes: 0,
      createdAt: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    formVideoAdmin.reset();
    alert("Vídeo cadastrado com sucesso.");
    await carregarVideosAdmin();
  } catch (error) {
    console.error("[AdminVideos] Erro ao salvar vídeo:", error);
    alert(error.message || "Não foi possível salvar o vídeo.");
  }
});

btnSair?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../login.html";
  } catch (error) {
    console.error("[AdminVideos] Erro ao sair:", error);
  }
});

carregarVideosAdmin();
