import { GestureRecognizer, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Variáveis que serão inicializadas quando DOM estiver pronto
let widget = null;
let gestosMinimizar = null;
let gestosIndicador = null;
let video = null;
let ativarGestos = null;
let tutorialGestos = null;
let abrirTutorialPainel = null;
let desativarGestosBtn = null;
let gestoDetectado = null;
let gestosStatusCard = null;
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

function atualizarStatusCard(texto) {
    if (gestosStatusCard) {
        gestosStatusCard.textContent = texto;
    }
}

function abrirTutorial() {
    console.log("📖 Abrindo tutorial de gestos...");
    tutorialAberto = true;

    // Remover a classe oculto PRIMEIRO, para garantir que o modal fique visível
    if (modalTutorial) {
        modalTutorial.classList.remove("oculto");
        console.log("✓ Modal visível");
    } else {
        console.warn("⚠️ modalTutorial não encontrado");
    }

    atualizarTextoGesto("Faça um gesto para testar");

    // Tentar inicializar sistema de tutorial, mas o modal já estará visível mesmo se falhar
    if (typeof iniciarSistemaTutorial === 'function') {
        iniciarSistemaTutorial().catch((erro) => {
            console.error("❌ Erro no tutorial:", erro);
            atualizarTextoGesto("Preparando câmera...");
        });
    } else {
        console.warn("⚠️ iniciarSistemaTutorial não está definida");
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
    if (recognizer) {
        console.log("✓ Reconhecedor já existe, reutilizando...");
        return recognizer;
    }

    try {
        console.log("📥 Baixando modelo MediaPipe...");
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        console.log("✓ FilesetResolver obtido");

        console.log("🔧 Configurando reconhecedor...");
        recognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        console.log("✓ Reconhecedor criado com sucesso!");
        return recognizer;
    } catch (erro) {
        console.error("❌ Erro ao criar reconhecedor:", erro);
        console.error("📋 Nome do erro:", erro.name);
        console.error("📋 Mensagem:", erro.message);
        throw erro;
    }
}

async function iniciarCameraGestos() {
    if (stream) {
        console.log("✓ Stream já existe, reutilizando...");
        if (tutorialVideo && tutorialVideo.srcObject !== stream) {
            tutorialVideo.srcObject = stream;
            tutorialVideo.play().catch(() => {});
        }
        return;
    }

    try {
        console.log("📷 Solicitando acesso à câmera...");
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        console.log("✓ Câmera obtida com sucesso!");

        if (video) {
            video.srcObject = stream;
            await video.play().catch(() => console.warn("⚠️ Não foi possível dar play no vídeo"));
        }

        if (tutorialVideo) {
            tutorialVideo.srcObject = stream;
            await tutorialVideo.play().catch(() => console.warn("⚠️ Não foi possível dar play no vídeo do tutorial"));
        }

        // Timeout para não travar indefinidamente
        let timeoutId = setTimeout(() => {
            console.warn("⚠️ Timeout aguardando metadados do vídeo");
        }, 5000);

        await new Promise((resolve) => {
            const alvo = tutorialVideo || video;

            if (!alvo) {
                clearTimeout(timeoutId);
                console.warn("⚠️ Nenhum elemento de vídeo encontrado");
                resolve();
                return;
            }

            if (alvo.readyState >= 1) {
                clearTimeout(timeoutId);
                if (tutorialCanvas) {
                    tutorialCanvas.width = alvo.videoWidth || 640;
                    tutorialCanvas.height = alvo.videoHeight || 480;
                }
                console.log("✓ Vídeo pronto");
                resolve();
                return;
            }

            alvo.onloadedmetadata = () => {
                clearTimeout(timeoutId);
                if (tutorialCanvas) {
                    tutorialCanvas.width = alvo.videoWidth || 640;
                    tutorialCanvas.height = alvo.videoHeight || 480;
                }
                console.log("✓ Metadados de vídeo carregados");
                resolve();
            };
        });
    } catch (erro) {
        console.error("❌ Erro ao acessar câmera:", erro);
        console.error("📋 Nome do erro:", erro.name);
        console.error("📋 Mensagem:", erro.message);
        
        // Dar mais contexto sobre o erro
        if (erro.name === "NotAllowedError") {
            console.error("🚫 Permissão de câmera NEGADA pelo usuário");
        } else if (erro.name === "NotFoundError") {
            console.error("🚫 Nenhuma câmera encontrada no dispositivo");
        } else if (erro.name === "NotReadableError") {
            console.error("🚫 Câmera não consegue ser acessada (pode estar em uso)");
        }
        
        throw erro;
    }
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

function dedoEstaEstendido(landmarks = [], tip, pip) {
    if (!landmarks[tip] || !landmarks[pip]) return false;

    const deltaY = landmarks[tip].y - landmarks[pip].y;
    const deltaX = landmarks[tip].x - landmarks[pip].x;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);
    const minDelta = 0.03;

    // Dedos apontando para cima (orientação vertical) ou para os lados (horizontal)
    if (absDeltaY > minDelta && deltaY < 0) {
        return true;
    }

    if (absDeltaX > minDelta && absDeltaX > absDeltaY) {
        return true;
    }

    return false;
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
        if (dedoEstaEstendido(landmarks, tip, pip)) {
            contador++;
        }
    });

    return contador;
}

function maoAbertaInvertida(landmarks = []) {
    if (!landmarks || landmarks.length < 21) return false;

    const thumbsRight = landmarks[4] && landmarks[3] && landmarks[4].x > landmarks[3].x;
    const thumbsLeft = landmarks[4] && landmarks[3] && landmarks[4].x < landmarks[3].x;

    const indexRight = landmarks[8] && landmarks[6] && landmarks[8].x > landmarks[6].x;
    const indexLeft = landmarks[8] && landmarks[6] && landmarks[8].x < landmarks[6].x;

    const middleRight = landmarks[12] && landmarks[10] && landmarks[12].x > landmarks[10].x;
    const middleLeft = landmarks[12] && landmarks[10] && landmarks[12].x < landmarks[10].x;

    const ringRight = landmarks[16] && landmarks[14] && landmarks[16].x > landmarks[14].x;
    const ringLeft = landmarks[16] && landmarks[14] && landmarks[16].x < landmarks[14].x;

    const pinkyRight = landmarks[20] && landmarks[18] && landmarks[20].x > landmarks[18].x;
    const pinkyLeft = landmarks[20] && landmarks[18] && landmarks[20].x < landmarks[18].x;

    return (
        (thumbsRight && indexRight && middleRight && ringRight && pinkyRight) ||
        (thumbsLeft && indexLeft && middleLeft && ringLeft && pinkyLeft)
    );
}

function detectarGestoManual(landmarks = []) {
    if (maoAbertaInvertida(landmarks)) return "Open_Palm";

    const dedos = contarDedosEstendidos(landmarks);

    if (dedos === 5) return "Open_Palm";
    if (dedos === 3) return "Three";
    if (dedos === 4) return "Four";

    return null;
}

function obterPlayerPrincipal() {
    return document.getElementById("playerBrasflix");
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
            return "👎 Descurtir vídeo";
        case "Open_Palm":
            return "✋ Pausar/Reproduzir vídeo";
        case "Closed_Fist":
            return "✊ Abrir/Fechar chat usuários";
        case "ILoveYou":
            return "🤟 Abrir/Fechar chatbot";
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
        case "Thumb_Up":
            if (player) {
                player.dataset.curtido = "true";
                player.classList.add("curtido");
                player.classList.remove("nao-curtido");
                const mensagem = document.getElementById("gestoDetectado");
                if (mensagem) mensagem.textContent = "👍 Vídeo curtido";
            }
            break;

        case "Thumb_Down":
            if (player) {
                player.dataset.curtido = "false";
                player.classList.remove("curtido");
                player.classList.add("nao-curtido");
                const mensagem = document.getElementById("gestoDetectado");
                if (mensagem) mensagem.textContent = "👎 Vídeo não curtido";
            }
            break;

        case "Open_Palm":
            if (player) {
                if (player.paused) {
                    player.play().catch(() => {});
                } else {
                    player.pause();
                }
            }
            break;

        case "Closed_Fist":
            {
                const uWidget = document.getElementById("user-chat-widget");
                if (uWidget) {
                    if (uWidget.classList.contains("open")) {
                        uWidget.classList.remove("open");
                        const panel = document.getElementById("user-chat-panel");
                        if (panel) panel.setAttribute("aria-hidden", "true");
                    } else {
                        uWidget.classList.add("open");
                        const panel = document.getElementById("user-chat-panel");
                        if (panel) panel.setAttribute("aria-hidden", "false");
                    }
                }
            }
            break;

        case "ILoveYou":
            alternarChatbot();
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
        const melhor = resultado.gestures[0][0];
        if (melhor && melhor.score >= 0.6) {
            gesto = melhor.categoryName;
        }
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

    if (gesto) {
        executarAcao(gesto);
    }

    animationId = requestAnimationFrame(detectarGestos);
}

async function garantirMotorAtivo() {
    console.log("🎬 Garantindo que o motor de gestos está ativo...");
    await criarReconhecedor();
    await iniciarCameraGestos();

    if (!animationId) {
        console.log("▶️ Iniciando loop de detecção...");
        detectarGestos();
    } else {
        console.log("✓ Loop de detecção já está rodando");
    }
}

async function iniciarSistemaTutorial() {
    try {
        console.log("📚 Iniciando sistema de tutorial...");
        await garantirMotorAtivo();
        console.log("✓ Tutorial pronto!");
    } catch (erro) {
        console.error("❌ Erro ao iniciar tutorial:", erro);
        console.error("📋 Detalhes:", erro.message);
        throw erro;
    }
}

async function ativarSistemaGestos() {
    try {
        console.log("🔄 Tentando ativar sistema de gestos...");
        
        gestureEnabled = true;
        salvarPreferenciaGestos(true);
        
        if (gestosIndicador) mostrarIndicador();
        if (widget) minimizarWidgetGestos();
        if (gestosStatusCard) atualizarStatusCard("Gestos ativos em segundo plano.");
        if (gestoDetectado) atualizarTextoGesto("Gestos ativados");

        console.log("✓ Status atualizado. Inicializando módulo de reconhecimento...");
        await garantirMotorAtivo();
        console.log("✓ Gestos ativados com sucesso!");
        
    } catch (erro) {
        console.error("❌ Erro ao ativar gestos:", erro);
        console.error("📋 Detalhes:", erro.message, erro.name);
        gestureEnabled = false;
        salvarPreferenciaGestos(false);
        
        if (gestosIndicador) ocultarIndicador();
        if (gestosStatusCard) atualizarStatusCard("Erro: " + (erro.message || "Não foi possível ativar"));
        if (gestoDetectado) atualizarTextoGesto("Erro ao ativar gestos");

        if (ativarGestos) {
            ativarGestos.checked = false;
        }
    }
}

function desativarSistemaGestos() {
    gestureEnabled = false;
    salvarPreferenciaGestos(false);
    ocultarIndicador();
    minimizarWidgetGestos();
    atualizarStatusCard("Gestos desativados no momento.");
    atualizarTextoGesto("Gestos desativados");

    if (ativarGestos) {
        ativarGestos.checked = false;
    }

    if (!tutorialAberto) {
        pararSistemaGestos();
    }
}

function inicializarEventsGestos() {
    console.log("🔧 Inicializando eventos de gestos...");
    
    // Selecionar elementos do DOM
    widget = document.getElementById("gestosWidget");
    gestosMinimizar = document.getElementById("gestosMinimizar");
    gestosIndicador = document.getElementById("gestosIndicador");
    video = document.getElementById("webcamGestos");
    ativarGestos = document.getElementById("ativarGestos");
    tutorialGestos = document.getElementById("tutorialGestos");
    abrirTutorialPainel = document.getElementById("abrirTutorialPainel");
    desativarGestosBtn = document.getElementById("desativarGestos");
    gestoDetectado = document.getElementById("gestoDetectado");
    gestosStatusCard = document.getElementById("gestosStatusCard");
    tutorialVideo = document.getElementById("tutorialWebcamGestos");
    tutorialCanvas = document.getElementById("tutorialCanvasGestos");
    tutorialStatusGesto = document.getElementById("tutorialStatusGesto");
    modalTutorial = document.getElementById("modalTutorialGestos");
    fecharTutorialGestos = document.getElementById("fecharTutorialGestos");
    fecharTutorialOverlay = document.getElementById("fecharTutorialOverlay");

    console.log("✓ Elementos selecionados:");
    console.log("  - ativarGestos:", !!ativarGestos);
    console.log("  - tutorialGestos:", !!tutorialGestos);
    console.log("  - modalTutorial:", !!modalTutorial);
    console.log("  - video:", !!video);
    console.log("  - gestoDetectado:", !!gestoDetectado);

    // Adicionar listeners
    if (ativarGestos) {
        ativarGestos.addEventListener("change", async (event) => {
            console.log("☑️ Checkbox de gestos alterado:", event.target.checked);
            if (event.target.checked) {
                await ativarSistemaGestos();
            } else {
                desativarSistemaGestos();
            }
        });
        console.log("✓ Listener de ativarGestos adicionado");
    }

    if (tutorialGestos) {
        tutorialGestos.addEventListener("click", abrirTutorial);
        console.log("✓ Listener de tutorialGestos adicionado");
    }

    if (abrirTutorialPainel) {
        abrirTutorialPainel.addEventListener("click", abrirTutorial);
        console.log("✓ Listener de abrirTutorialPainel adicionado");
    }

    if (fecharTutorialGestos) {
        fecharTutorialGestos.addEventListener("click", fecharTutorial);
        console.log("✓ Listener de fecharTutorialGestos adicionado");
    }

    if (fecharTutorialOverlay) {
        fecharTutorialOverlay.addEventListener("click", fecharTutorial);
        console.log("✓ Listener de fecharTutorialOverlay adicionado");
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
    
    console.log("✓ Todos os listeners de gestos foram adicionados");
}

// Esperar DOM estar totalmente carregado
console.log("📡 Módulo gestos.js carregado. DOM readyState:", document.readyState);

if (document.readyState === "loading") {
    console.log("⏳ DOM ainda carregando, aguardando DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", () => {
        console.log("✅ DOMContentLoaded disparado!");
        inicializarEventsGestos();
    });
} else {
    console.log("✅ DOM já está pronto, inicializando agora...");
    inicializarEventsGestos();
}

// ===== FUNÇÃO DE DIAGNÓSTICO =====
window.diagnosticoGestos = async function() {
    console.log("\n🔍 === DIAGNÓSTICO DE GESTOS === 🔍\n");
    
    console.log("1️⃣  Verificando elementos DOM:");
    console.log("   - ativarGestos:", !!ativarGestos, ativarGestos?.id);
    console.log("   - tutorialGestos:", !!tutorialGestos, tutorialGestos?.id);
    console.log("   - video:", !!video, video?.id);
    console.log("   - tutorialVideo:", !!tutorialVideo, tutorialVideo?.id);
    console.log("   - tutorialCanvas:", !!tutorialCanvas, tutorialCanvas?.id);
    
    console.log("\n2️⃣  Verificando variáveis globais:");
    console.log("   - gestureEnabled:", gestureEnabled);
    console.log("   - recognizer:", !!recognizer);
    console.log("   - stream:", !!stream);
    console.log("   - animationId:", animationId);
    
    console.log("\n3️⃣  Verificando disponibilidade de câmera:");
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log("   - Câmeras encontradas:", videoDevices.length);
        videoDevices.forEach((d, i) => console.log(`     ${i+1}. ${d.label || 'Câmera sem nome'}`));
    } catch (err) {
        console.error("   - Erro ao enumerar dispositivos:", err.message);
    }
    
    console.log("\n4️⃣  Testando acesso à câmera:");
    try {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        console.log("   ✅ Câmera acessível!");
        testStream.getTracks().forEach(t => t.stop());
    } catch (err) {
        console.error("   ❌ Erro ao acessar câmera:", err.name, "-", err.message);
    }
    
    console.log("\n5️⃣  Testando MediaPipe:");
    try {
        console.log("   - Baixando FilesetResolver...");
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        console.log("   ✅ FilesetResolver obtido!");
    } catch (err) {
        console.error("   ❌ Erro ao carregar MediaPipe:", err.message);
    }
    
    console.log("\n✅ Diagnóstico concluído! Verifique os erros acima.\n");
};

console.log("💡 Dica: Execute 'diagnosticoGestos()' no console para verificar problemas");


window.addEventListener("load", async () => {
    const estavaAtivo = localStorage.getItem(STORAGE_GESTOS) === "true";

    if (estavaAtivo && ativarGestos) {
        ativarGestos.checked = true;
        await ativarSistemaGestos();
    }
});
