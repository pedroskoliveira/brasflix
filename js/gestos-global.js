import { GestureRecognizer, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Variáveis que serão inicializadas quando DOM estiver pronto
let widget = null;
let gestosMinimizar = null;
let gestosIndicador = null;
let video = null;
let ativarGestos = null;
let abrirTutorialPainel = null;
let desativarGestosBtn = null;
let gestoDetectado = null;
let tutorialVideo = null;
let tutorialCanvas = null;
let tutorialStatusGesto = null;
let modalTutorial = null;
let fecharTutorialGestos = null;
let fecharTutorialOverlay = null;

let recognizer = null;
let stream = null;
let animationId = null;
let gestureEnabled = false;
let tutorialAberto = false;
let ultimoGesto = "";
let ultimoTempoGesto = 0;

const TEMPO_ENTRE_GESTOS = 1800;
const STORAGE_GESTOS = "brasflix_gestos_ativos";

function atualizarTextoGesto(texto) {
    if (gestoDetectado) {
        gestoDetectado.textContent = texto;
    }

    if (tutorialStatusGesto && tutorialAberto) {
        tutorialStatusGesto.textContent = texto;
    }
}

function abrirTutorial() {
    tutorialAberto = true;

    // Remover a classe oculto PRIMEIRO, para garantir que o modal fique visível
    if (modalTutorial) {
        modalTutorial.classList.remove("oculto");
    }

    atualizarTextoGesto("Faça um gesto para testar");

    // Tentar inicializar sistema de tutorial, mas o modal já estará visível mesmo se falhar
    if (typeof iniciarSistemaTutorial === 'function') {
        iniciarSistemaTutorial().catch((erro) => {
            console.error("Erro no tutorial:", erro);
            atualizarTextoGesto("Preparando câmera...");
        });
    } else {
        console.warn("iniciarSistemaTutorial não está definida");
        atualizarTextoGesto("Preparando câmera...");
    }
}

function fecharTutorial() {
    tutorialAberto = false;

    if (modalTutorial) {
        modalTutorial.classList.add("oculto");
    }

    limparCanvasTutorial();

    if (!gestureEnabled) {
        pararSistemaGestos();
    }
}

function abrirWidgetGestos() {
    if (widget) {
        widget.classList.remove("minimizado");
    }
}

function minimizarWidgetGestos() {
    if (widget) {
        widget.classList.add("minimizado");
    }
}

function mostrarIndicador() {
    if (gestosIndicador) {
        gestosIndicador.classList.remove("oculto");
    }
}

function ocultarIndicador() {
    if (gestosIndicador) {
        gestosIndicador.classList.add("oculto");
    }
}

function salvarPreferenciaGestos(valor) {
    localStorage.setItem(STORAGE_GESTOS, valor ? "true" : "false");
}

async function criarReconhecedor() {
    if (recognizer) return recognizer;

    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    recognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    return recognizer;
}

async function iniciarCameraGestos() {
    if (stream) {
        if (tutorialVideo && tutorialVideo.srcObject !== stream) {
            tutorialVideo.srcObject = stream;
            await tutorialVideo.play().catch(() => {});
        }
        return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
    });

    if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
    }

    if (tutorialVideo) {
        tutorialVideo.srcObject = stream;
        await tutorialVideo.play().catch(() => {});
    }

    await new Promise((resolve) => {
        const alvo = tutorialVideo || video;

        if (!alvo) {
            resolve();
            return;
        }

        if (alvo.readyState >= 1) {
            if (tutorialCanvas) {
                tutorialCanvas.width = alvo.videoWidth || 640;
                tutorialCanvas.height = alvo.videoHeight || 480;
            }
            resolve();
            return;
        }

        alvo.onloadedmetadata = () => {
            if (tutorialCanvas) {
                tutorialCanvas.width = alvo.videoWidth || 640;
                tutorialCanvas.height = alvo.videoHeight || 480;
            }
            resolve();
        };
    });
}

function pararCameraGestos() {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    if (tutorialVideo) {
        tutorialVideo.srcObject = null;
    }
}

function pararSistemaGestos() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    pararCameraGestos();
    limparCanvasTutorial();
}

function limparCanvasTutorial() {
    if (!tutorialCanvas) return;
    const ctx = tutorialCanvas.getContext("2d");
    ctx.clearRect(0, 0, tutorialCanvas.width, tutorialCanvas.height);
}

function desenharLandmarks(handLandmarks = []) {
    if (!tutorialCanvas || !tutorialAberto) return;

    const ctx = tutorialCanvas.getContext("2d");
    ctx.clearRect(0, 0, tutorialCanvas.width, tutorialCanvas.height);

    if (!handLandmarks.length) return;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e50914";
    ctx.lineWidth = 2;

    for (const landmark of handLandmarks) {
        const x = landmark.x * tutorialCanvas.width;
        const y = landmark.y * tutorialCanvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function contarDedosEstendidos(landmarks = []) {
    if (!landmarks || landmarks.length < 21) return 0;

    const dedos = [
        { tip: 8, pip: 6 },
        { tip: 12, pip: 10 },
        { tip: 16, pip: 14 },
        { tip: 20, pip: 18 }
    ];

    let contador = 0;
    dedos.forEach(({ tip, pip }) => {
        if (landmarks[tip] && landmarks[pip] && landmarks[tip].y < landmarks[pip].y) {
            contador++;
        }
    });

    return contador;
}

function detectarGestoManual(landmarks = []) {
    const dedos = contarDedosEstendidos(landmarks);
    if (dedos === 3) return "Three";
    if (dedos === 4) return "Four";
    return null;
}

function obterPlayerPrincipal() {
    return document.getElementById("playerBrasflix");
}

function obterVideoIdDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
}

function atualizarCurtidaLocal(acao) {
    const videoId = obterVideoIdDaUrl();
    if (!videoId) return;

    const chave = `brasflix_video_${videoId}_${acao}`;
    const valorAtual = Number(localStorage.getItem(chave) || 0);
    localStorage.setItem(chave, valorAtual + 1);
}

function alternarChatbot() {
    const chatbotWidget = document.getElementById("chatbot-widget");
    if (chatbotWidget) {
        chatbotWidget.classList.toggle("aberto");
    }
}

async function registrarGestoAnalytics(gesto) {
    if (!auth?.currentUser) return;

    try {
        await addDoc(collection(db, "gestureAnalytics"), {
            userId: auth.currentUser.uid,
            gesto,
            pagina: window.location.pathname,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.warn("Erro ao registrar gesto no Firestore:", error);
    }
}

function traduzirGesto(gesto) {
    switch (gesto) {
        case "Thumb_Up":
            return "👍 Curtir vídeo";
        case "Thumb_Down":
            return "👎 Não gostei";
        case "Victory":
            return "✌️ Repetir vídeo";
        case "Open_Palm":
            return "✋ Pausar vídeo";
        case "Pointing_Up":
            return "☝️ Aumentar volume";
        case "Closed_Fist":
            return "✊ Diminuir volume";
        case "ILoveYou":
            return "🤟 (Eu te amo) Abrir/fechar chat";
        case "Heart":
            return "❤️ Coração com as mãos (abrir/fechar chat)";
        case "Double_Blink":
            return "😉 Duas piscadas (play/pause)";
        case "Head_Nod":
            return "🤖 Aceno de cabeça (abrir chat usuários)";
        case "Head_Shake":
            return "🙅 Balançar cabeça (fechar chat usuários)";
        case "Three":
            return "3 dedos (abrir chat usuários)";
        case "Four":
            return "4 dedos (fechar chat usuários)";
        default:
            return `Gesto detectado: ${gesto}`;
    }
}

function executarAcao(gesto) {
    const agora = Date.now();
    atualizarTextoGesto(traduzirGesto(gesto));
    registrarGestoAnalytics(gesto);

    if (!gestureEnabled) return;

    if (gesto === ultimoGesto && agora - ultimoTempoGesto < TEMPO_ENTRE_GESTOS) {
        return;
    }

    ultimoGesto = gesto;
    ultimoTempoGesto = agora;

    const player = obterPlayerPrincipal();

    switch (gesto) {
        case "Thumb_Up": {
            atualizarCurtidaLocal("curtida");
            const videoId = obterVideoIdDaUrl();
            if (videoId && window.BrasflixFirebase?.atualizarCurtidasVideo) {
                window.BrasflixFirebase.atualizarCurtidasVideo(videoId, "curtir").catch((err) => {
                    console.warn("Falha ao registrar curtida no Firestore:", err);
                });
            }
            if (player) {
                player.classList.add("curtido");
                player.classList.remove("nao-curtido");
            }
            break;
        }

        case "Thumb_Down": {
            atualizarCurtidaLocal("descurtida");
            const videoId2 = obterVideoIdDaUrl();
            if (videoId2 && window.BrasflixFirebase?.atualizarCurtidasVideo) {
                window.BrasflixFirebase.atualizarCurtidasVideo(videoId2, "descurtir").catch((err) => {
                    console.warn("Falha ao registrar descurtida no Firestore:", err);
                });
            }
            if (player) {
                player.classList.add("nao-curtido");
                player.classList.remove("curtido");
            }
            break;
        }

        case "Victory":
            if (player) {
                player.currentTime = 0;
                player.play().catch(() => {});
            }
            break;

        case "Open_Palm":
            if (player) {
                player.pause();
            }
            break;

        case "Pointing_Up":
            if (player) {
                player.volume = Math.min(1, player.volume + 0.1);
            }
            break;

        case "Closed_Fist":
            if (player) {
                player.volume = Math.max(0, player.volume - 0.1);
            }
            break;

        case "ILoveYou":
            alternarChatbot();
            break;

        case "Double_Blink":
            if (player) {
                if (player.paused) {
                    player.play().catch(() => {});
                } else {
                    player.pause();
                }
            }
            break;

        case "Head_Nod":
            {
                const uWidget = document.getElementById("user-chat-widget");
                if (uWidget) {
                    uWidget.classList.add("open");
                    const panel = document.getElementById("user-chat-panel");
                    if (panel) panel.setAttribute("aria-hidden", "false");
                }
            }
            break;

        case "Head_Shake":
            {
                const uWidget = document.getElementById("user-chat-widget");
                if (uWidget) {
                    uWidget.classList.remove("open");
                    const panel = document.getElementById("user-chat-panel");
                    if (panel) panel.setAttribute("aria-hidden", "true");
                }
            }
            break;

        case "Three":
            {
                const uWidget = document.getElementById("user-chat-widget");
                if (uWidget) {
                    uWidget.classList.add("open");
                    const panel = document.getElementById("user-chat-panel");
                    if (panel) panel.setAttribute("aria-hidden", "false");
                }
            }
            break;

        case "Four":
            {
                const uWidget = document.getElementById("user-chat-widget");
                if (uWidget) {
                    uWidget.classList.remove("open");
                    const panel = document.getElementById("user-chat-panel");
                    if (panel) panel.setAttribute("aria-hidden", "true");
                }
            }
            break;

        case "Heart":
            alternarChatbot();
            break;
    }
}

async function detectarGestos() {
    if (!recognizer || !video || video.readyState < 2) {
        animationId = requestAnimationFrame(detectarGestos);
        return;
    }

    if (!gestureEnabled && !tutorialAberto) {
        animationId = requestAnimationFrame(detectarGestos);
        return;
    }

    const resultado = recognizer.recognizeForVideo(video, Date.now());

    if (resultado.landmarks && resultado.landmarks.length > 0) {
        desenharLandmarks(resultado.landmarks[0]);
    } else {
        limparCanvasTutorial();
    }

    let gesto = null;

    if (resultado.gestures && resultado.gestures.length > 0 && resultado.gestures[0].length > 0) {
        gesto = resultado.gestures[0][0].categoryName;
    }

    if (!gesto && resultado.landmarks && resultado.landmarks.length > 0) {
        for (const landmarks of resultado.landmarks) {
            const manual = detectarGestoManual(landmarks);
            if (manual) {
                gesto = manual;
                break;
            }
        }
    }

    if (!gesto && resultado.gestures && resultado.gestures.length > 0 && resultado.gestures[0].length > 0) {
        const nome = resultado.gestures[0][0].categoryName;
        if (nome === "ILoveYou") {
            gesto = "Heart";
        } else {
            gesto = nome;
        }
    }

    if (gesto) {
        executarAcao(gesto);
    }

    animationId = requestAnimationFrame(detectarGestos);
}

async function garantirMotorAtivo() {
    await criarReconhecedor();
    await iniciarCameraGestos();

    if (!animationId) {
        detectarGestos();
    }
}

async function iniciarSistemaTutorial() {
    await garantirMotorAtivo();
}

async function ativarSistemaGestos() {
    try {
        gestureEnabled = true;
        salvarPreferenciaGestos(true);
        mostrarIndicador();
        minimizarWidgetGestos();
        atualizarTextoGesto("Gestos ativados");
        await garantirMotorAtivo();
    } catch (erro) {
        console.error("Erro ao ativar gestos:", erro);
        gestureEnabled = false;
        ocultarIndicador();
        atualizarTextoGesto("Erro ao ativar gestos");
        salvarPreferenciaGestos(false);
    }
}

function desativarSistemaGestos() {
    gestureEnabled = false;
    salvarPreferenciaGestos(false);
    ocultarIndicador();
    minimizarWidgetGestos();
    atualizarTextoGesto("Gestos desativados");

    if (!tutorialAberto) {
        pararSistemaGestos();
    }
}

function inicializarEventsGestos() {
    // Selecionar elementos do DOM
    widget = document.getElementById("gestosWidget");
    gestosMinimizar = document.getElementById("gestosMinimizar");
    gestosIndicador = document.getElementById("gestosIndicador");
    video = document.getElementById("webcamGestos");
    ativarGestos = document.getElementById("ativarGestos");
    abrirTutorialPainel = document.getElementById("abrirTutorialPainel");
    desativarGestosBtn = document.getElementById("desativarGestos");
    gestoDetectado = document.getElementById("gestoDetectado");
    tutorialVideo = document.getElementById("tutorialWebcamGestos");
    tutorialCanvas = document.getElementById("tutorialCanvasGestos");
    tutorialStatusGesto = document.getElementById("tutorialStatusGesto");
    modalTutorial = document.getElementById("modalTutorialGestos");
    fecharTutorialGestos = document.getElementById("fecharTutorialGestos");
    fecharTutorialOverlay = document.getElementById("fecharTutorialOverlay");

    // Adicionar listeners
    if (ativarGestos) {
        ativarGestos.addEventListener("change", async (event) => {
            if (event.target.checked) {
                await ativarSistemaGestos();
            } else {
                desativarSistemaGestos();
            }
        });
    }

    if (abrirTutorialPainel) {
        abrirTutorialPainel.addEventListener("click", abrirTutorial);
    }

    if (fecharTutorialGestos) {
        fecharTutorialGestos.addEventListener("click", fecharTutorial);
    }

    if (fecharTutorialOverlay) {
        fecharTutorialOverlay.addEventListener("click", fecharTutorial);
    }

    if (desativarGestosBtn) {
        desativarGestosBtn.addEventListener("click", desativarSistemaGestos);
    }

    if (gestosIndicador) {
        gestosIndicador.addEventListener("click", () => {
            if (gestureEnabled) {
                abrirWidgetGestos();
            }
        });
    }

    if (gestosMinimizar) {
        gestosMinimizar.addEventListener("click", minimizarWidgetGestos);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            fecharTutorial();
        }
    });
}

// Esperar DOM estar totalmente carregado
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarEventsGestos);
} else {
    inicializarEventsGestos();
}

window.addEventListener("load", async () => {
    const estavaAtivo = localStorage.getItem(STORAGE_GESTOS) === "true";

    if (estavaAtivo) {
        await ativarSistemaGestos();
    }
});
