import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const video = document.getElementById("videoFace");
const canvas = document.getElementById("canvasFace");
const statusEl = document.getElementById("statusFace");
const btnIniciarCamera = document.getElementById("btnIniciarCamera");
const btnCadastrarFace = document.getElementById("btnCadastrarFace");
const btnEntrarFace = document.getElementById("btnEntrarFace");
const aceitarTermos =
  document.getElementById("aceitarTermosFace") ||
  document.getElementById("aceitoTermosFace");
const termosWrap = document.getElementById("termosFaceWrap");

let stream = null;
let modelosCarregados = false;
let usuarioAtual = null;

function status(texto) {
  if (statusEl) {
    statusEl.textContent = texto;
  }
}

function atualizarVisibilidade() {
  const streamAtivo = !!stream;

  if (btnEntrarFace) {
    btnEntrarFace.style.display = streamAtivo ? "inline-flex" : "none";
  }

  if (termosWrap) {
    termosWrap.style.display = usuarioAtual && streamAtivo ? "block" : "none";
  }

  if (btnCadastrarFace) {
    const pode =
      !!usuarioAtual &&
      streamAtivo &&
      (!aceitarTermos || aceitarTermos.checked);

    btnCadastrarFace.style.display = pode ? "inline-flex" : "none";
  }

  if (btnIniciarCamera) {
    btnIniciarCamera.textContent = streamAtivo
      ? "Reiniciar câmera"
      : "Iniciar câmera";
  }
}

async function carregarModelos() {
  if (modelosCarregados) return;

  status("Carregando modelos faciais...");

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("./models")
  ]);

  modelosCarregados = true;
  status("Modelos faciais carregados.");
}

async function iniciarCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    await video.play();

    status("Câmera iniciada com sucesso.");
    atualizarVisibilidade();
  } catch (error) {
    console.error("[FACE]", error);
    status(error.message || "Erro ao iniciar câmera.");
    atualizarVisibilidade();
  }
}

async function capturar() {
  if (video.readyState < 2) {
    throw new Error("A câmera ainda não está pronta.");
  }

  await carregarModelos();

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error("Nenhum rosto detectado. Ajuste a câmera e tente novamente.");
  }

  if (canvas) {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const resized = faceapi.resizeResults(detection, {
      width: canvas.width,
      height: canvas.height
    });

    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  }

  return detection;
}

async function garantirDocumentoUsuario(uid, email = "") {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        usuarioId: uid,
        uid,
        email,
        role: "user",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );
  } else {
    await updateDoc(ref, {
      atualizadoEm: serverTimestamp()
    });
  }
}

async function cadastrarFace() {
  try {
    if (!usuarioAtual) {
      return status("Faça login antes de cadastrar o rosto.");
    }

    if (aceitarTermos && !aceitarTermos.checked) {
      return status("Marque o aceite dos termos para cadastrar o rosto.");
    }

    status("Capturando rosto para cadastro...");

    const det = await capturar();

    await garantirDocumentoUsuario(usuarioAtual.uid, usuarioAtual.email || "");

    const token = await usuarioAtual.getIdToken();

    const response = await fetch("/api/face-enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        descriptor: Array.from(det.descriptor)
      })
    });

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Erro ao cadastrar rosto.");
    }

    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      aceitaTermosFace: true,
      faceLoginEnabled: true,
      faceRegisteredAt: serverTimestamp(),
      onboardingStatus: "done",
      atualizadoEm: serverTimestamp()
    });

    status("Rosto cadastrado com sucesso.");

    setTimeout(() => {
      location.href = "index.html";
    }, 1200);
  } catch (error) {
    console.error("[FACE]", error);
    status(error.message || "Erro no cadastro facial.");
  }
}

async function entrarComFace() {
  try {
    status("Capturando rosto para login...");

    const det = await capturar();

    const response = await fetch("/api/face-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        descriptor: Array.from(det.descriptor)
      })
    });

    const data = await response.json();

    if (!response.ok || !data?.ok || !data.customToken) {
      throw new Error(data?.error || "Rosto não reconhecido.");
    }

    await signInWithCustomToken(auth, data.customToken);

    status("Login facial realizado com sucesso.");

    setTimeout(() => {
      location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("[FACE]", error);
    status(error.message || "Erro no login facial.");
  }
}

onAuthStateChanged(auth, (user) => {
  usuarioAtual = user || null;
  atualizarVisibilidade();
});

btnIniciarCamera?.addEventListener("click", iniciarCamera);
btnCadastrarFace?.addEventListener("click", cadastrarFace);
btnEntrarFace?.addEventListener("click", entrarComFace);
aceitarTermos?.addEventListener("change", atualizarVisibilidade);
document.addEventListener("DOMContentLoaded", atualizarVisibilidade);
