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
const aceitarTermos = document.getElementById("aceitarTermosFace");

let stream = null;
let modelosCarregados = false;
let usuarioAtual = null;

function atualizarStatus(texto) {
  if (statusEl) {
    statusEl.textContent = texto;
  }
  console.log("[FACE]", texto);
}

function atualizarVisibilidadeBotoes() {
  if (btnEntrarFace) {
    btnEntrarFace.style.display = stream ? "inline-flex" : "none";
  }

  const podeCadastrar = !!usuarioAtual && !!stream && (!aceitarTermos || aceitarTermos.checked);
  if (btnCadastrarFace) {
    btnCadastrarFace.style.display = podeCadastrar ? "inline-flex" : "none";
  }

  if (btnIniciarCamera) {
    btnIniciarCamera.textContent = stream ? "Reiniciar câmera" : "Iniciar câmera";
  }
}

function limparCanvas() {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function desenharDeteccao(detection) {
  if (!canvas || !video || !detection) return;

  const largura = video.videoWidth || 640;
  const altura = video.videoHeight || 480;

  canvas.width = largura;
  canvas.height = altura;

  limparCanvas();

  const displaySize = { width: largura, height: altura };
  const resizedDetection = faceapi.resizeResults(detection, displaySize);

  faceapi.draw.drawDetections(canvas, resizedDetection);
  faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
}

async function carregarModelos() {
  if (modelosCarregados) return;

  atualizarStatus("Carregando modelos faciais...");

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models")
    ]);

    modelosCarregados = true;
    atualizarStatus("Modelos faciais carregados.");
  } catch (error) {
    console.error("[FACE] Erro ao carregar modelos:", error);
    throw new Error("Não foi possível carregar os modelos faciais da pasta ./models.");
  }
}

async function iniciarCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Seu navegador não suporta acesso à câmera.");
    }

    if (!video) {
      throw new Error("Elemento de vídeo não encontrado.");
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
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
      video.onloadedmetadata = () => resolve();
    });

    await video.play();
    atualizarStatus("Câmera iniciada com sucesso.");
    atualizarVisibilidadeBotoes();
  } catch (error) {
    console.error("[FACE] Erro ao iniciar câmera:", error);
    atualizarStatus(error.message || "Erro ao iniciar câmera.");
    atualizarVisibilidadeBotoes();
  }
}

async function capturarRosto() {
  if (!video) {
    throw new Error("Elemento de vídeo não encontrado.");
  }

  if (video.readyState < 2) {
    throw new Error("A câmera ainda não está pronta.");
  }

  await carregarModelos();

  const deteccao = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!deteccao) {
    throw new Error("Nenhum rosto detectado. Ajuste a câmera e tente novamente.");
  }

  desenharDeteccao(deteccao);

  return deteccao;
}

async function garantirDocumentoUsuario(uid, email = "") {
  const refUsuario = doc(db, "usuarios", uid);
  const snapUsuario = await getDoc(refUsuario);

  if (!snapUsuario.exists()) {
    await setDoc(
      refUsuario,
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
    return;
  }

  await updateDoc(refUsuario, {
    atualizadoEm: serverTimestamp()
  });
}

async function cadastrarFace() {
  try {
    if (!usuarioAtual) {
      atualizarStatus("Faça login antes de cadastrar o rosto.");
      return;
    }

    if (aceitarTermos && !aceitarTermos.checked) {
      atualizarStatus("Marque o aceite dos termos para cadastrar o rosto.");
      atualizarVisibilidadeBotoes();
      return;
    }

    atualizarStatus("Capturando rosto para cadastro...");
    const deteccao = await capturarRosto();

    await garantirDocumentoUsuario(usuarioAtual.uid, usuarioAtual.email || "");

    const idToken = await usuarioAtual.getIdToken();
    const descriptor = Array.from(deteccao.descriptor);

    const response = await fetch("/api/face-enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ descriptor })
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

    atualizarStatus("Rosto cadastrado com sucesso.");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (error) {
    console.error("[FACE] Erro no cadastro facial:", error);
    atualizarStatus(error.message || "Erro no cadastro facial.");
  }
}

async function entrarComFace() {
  try {
    atualizarStatus("Capturando rosto para login...");
    const deteccao = await capturarRosto();
    const descriptor = Array.from(deteccao.descriptor);

    const response = await fetch("/api/face-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ descriptor })
    });

    const data = await response.json();

    if (!response.ok || !data?.ok || !data.customToken) {
      throw new Error(data?.error || "Rosto não reconhecido.");
    }

    await signInWithCustomToken(auth, data.customToken);

    atualizarStatus("Login facial realizado com sucesso.");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("[FACE] Erro no login facial:", error);
    atualizarStatus(error.message || "Erro no login facial.");
  }
}

function bindEvents() {
  if (btnIniciarCamera) {
    btnIniciarCamera.addEventListener("click", iniciarCamera);
  }

  if (btnCadastrarFace) {
    btnCadastrarFace.addEventListener("click", cadastrarFace);
  }

  if (btnEntrarFace) {
    btnEntrarFace.addEventListener("click", entrarComFace);
  }

  if (aceitarTermos) {
    aceitarTermos.addEventListener("change", atualizarVisibilidadeBotoes);
  }
}

onAuthStateChanged(auth, (user) => {
  usuarioAtual = user || null;

  if (usuarioAtual) {
    atualizarStatus(`Usuário autenticado: ${usuarioAtual.email || usuarioAtual.uid}`);
  } else {
    atualizarStatus("Nenhum usuário autenticado.");
  }

  atualizarVisibilidadeBotoes();
});

bindEvents();
atualizarVisibilidadeBotoes();
