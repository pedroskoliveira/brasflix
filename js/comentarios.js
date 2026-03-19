import { auth, db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const comentariosContainer =
  document.getElementById("listaComentariosVideo") ||
  document.getElementById("comentariosContainer");

const estadoVazioComentarios = document.getElementById("estadoVazioComentarios");

const formComentario =
  document.getElementById("formNovoComentario") ||
  document.querySelector(".form-comentario");

const inputComentario =
  document.getElementById("inputComentario") ||
  document.querySelector(".form-comentario textarea");

let videoIdAtual = null;
let cancelarComentarios = null;

function detectarVideoAtual() {
  const params = new URLSearchParams(window.location.search);
  videoIdAtual = params.get("id");
  return videoIdAtual;
}

function escaparHtml(texto = "") {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderizarVazio() {
  if (estadoVazioComentarios) {
    estadoVazioComentarios.style.display = "flex";
  }

  if (comentariosContainer) {
    comentariosContainer.innerHTML = "";
  }
}

function renderizarComentario(comentario) {
  if (!comentariosContainer) return;

  const podeExcluir = comentario.userId === auth.currentUser?.uid;

  const div = document.createElement("div");
  div.className = "card-comentario";

  div.innerHTML = `
    <div class="comentario-autor">
      <strong>${escaparHtml(comentario.nomeAutor || "Anônimo")}</strong>
      <span class="comentario-data">
        ${new Date(comentario.timestamp?.toDate?.() || Date.now()).toLocaleDateString("pt-BR")}
      </span>
    </div>

    <p class="comentario-texto">${escaparHtml(comentario.texto || "")}</p>

    <div class="comentario-acoes">
      ${podeExcluir ? `<button class="btn-comentario-deletar" data-id="${comentario.id}">🗑️ Deletar</button>` : ""}
    </div>
  `;

  const btnDelete = div.querySelector(".btn-comentario-deletar");
  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "comentarios", comentario.id));
      } catch (error) {
        console.error("[Comentários] Erro ao excluir comentário:", error);
      }
    });
  }

  comentariosContainer.appendChild(div);
}

function carregarComentarios(videoId) {
  if (!videoId || !comentariosContainer) return;

  if (cancelarComentarios) {
    cancelarComentarios();
    cancelarComentarios = null;
  }

  const consulta = query(
    collection(db, "comentarios"),
    where("videoId", "==", videoId),
    orderBy("timestamp", "desc")
  );

  cancelarComentarios = onSnapshot(
    consulta,
    (snapshot) => {
      comentariosContainer.innerHTML = "";

      if (snapshot.empty) {
        renderizarVazio();
        return;
      }

      if (estadoVazioComentarios) {
        estadoVazioComentarios.style.display = "none";
      }

      snapshot.forEach((docSnap) => {
        renderizarComentario({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
    },
    (error) => {
      console.error("[Comentários] Erro ao carregar comentários:", error);
      renderizarVazio();
    }
  );
}

async function enviarComentario(event) {
  event.preventDefault();

  if (!auth.currentUser) {
    alert("Você precisa estar logado para comentar.");
    return;
  }

  if (!videoIdAtual) {
    alert("Vídeo não identificado.");
    return;
  }

  const texto = inputComentario?.value?.trim();

  if (!texto) return;

  try {
    await addDoc(collection(db, "comentarios"), {
      videoId: videoIdAtual,
      userId: auth.currentUser.uid,
      nomeAutor: auth.currentUser.displayName || auth.currentUser.email || "Usuário",
      texto,
      timestamp: serverTimestamp()
    });

    if (inputComentario) {
      inputComentario.value = "";
    }
  } catch (error) {
    console.error("[Comentários] Erro ao enviar comentário:", error);
    alert("Não foi possível enviar o comentário.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const videoId = detectarVideoAtual();

  if (videoId) {
    carregarComentarios(videoId);
  }

  if (formComentario) {
    formComentario.addEventListener("submit", enviarComentario);
  }
});

window.BrasflixComentarios = {
  carregarComentarios,
  detectarVideoAtual
};

export {
  carregarComentarios,
  detectarVideoAtual
};