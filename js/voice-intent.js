(function () {
    function normalizar(texto = "") {
        return String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function obterContextoPagina() {
        const caminho = window.location.pathname.toLowerCase();

        if (caminho.includes("video")) return { pagina: "video" };
        if (caminho.includes("perfil")) return { pagina: "perfil" };
        if (caminho.includes("analytics")) return { pagina: "analytics" };
        if (caminho.includes("login")) return { pagina: "login" };
        if (caminho.includes("face")) return { pagina: "face" };

        return { pagina: "index" };
    }

    function acao(tipo, payload = {}) {
        return {
            tipo: "acao",
            acao: tipo,
            ...payload
        };
    }

    function chat(mensagem) {
        return {
            tipo: "chat",
            mensagem
        };
    }

    function classificar(textoOriginal = "") {
        const texto = normalizar(textoOriginal);

        if (!texto) {
            return acao("nenhuma");
        }

        if (texto.includes("abrir perfil")) {
            return acao("navegar", { destino: "perfil.html" });
        }

        if (texto.includes("abrir favoritos")) {
            return acao("navegar", { destino: "perfil.html#favoritos" });
        }

        if (texto.includes("abrir analytics")) {
            return acao("navegar", { destino: "analytics.html" });
        }

        if (texto.includes("abrir login")) {
            return acao("navegar", { destino: "login.html" });
        }

        if (texto.includes("abrir cadastro")) {
            return acao("navegar", { destino: "login.html#aba-cadastro" });
        }

        if (
            texto.includes("abrir home") ||
            texto.includes("abrir inicio") ||
            texto.includes("ir para home") ||
            texto.includes("ir para inicio") ||
            texto.includes("voltar para home")
        ) {
            return acao("navegar", { destino: "index.html" });
        }

        if (
            texto.includes("abrir chatbot") ||
            texto.includes("abrir chat") ||
            texto.includes("falar com pedria") ||
            texto.includes("falar com a pedria")
        ) {
            return acao("abrir_chatbot");
        }

        if (
            texto.includes("fechar chatbot") ||
            texto.includes("fechar chat")
        ) {
            return acao("fechar_chatbot");
        }

        if (
            texto.includes("pausar video") ||
            texto.includes("pausar")
        ) {
            return acao("player_pause");
        }

        if (
            texto.includes("reproduzir video") ||
            texto.includes("tocar video") ||
            texto.includes("continuar video") ||
            texto.includes("dar play")
        ) {
            return acao("player_play");
        }

        if (
            texto.includes("reiniciar video") ||
            texto.includes("repetir video") ||
            texto.includes("voltar video do comeco") ||
            texto.includes("voltar video do começo")
        ) {
            return acao("player_restart");
        }

        if (texto.includes("aumentar volume")) {
            return acao("player_volume_up");
        }

        if (texto.includes("diminuir volume")) {
            return acao("player_volume_down");
        }

        if (
            texto.includes("iniciar quiz") ||
            texto.includes("abrir quiz") ||
            texto.includes("quero fazer quiz") ||
            texto.includes("quero testar meus conhecimentos")
        ) {
            return acao("quiz_iniciar");
        }

        if (
            texto.includes("me explique esse video") ||
            texto.includes("me explique esse vídeo") ||
            texto.includes("do que fala esse video") ||
            texto.includes("do que fala esse vídeo")
        ) {
            return chat("Explique o conteúdo do vídeo atual.");
        }

        if (
            texto.includes("me ajude") ||
            texto.includes("ajuda") ||
            texto.includes("o que voce faz") ||
            texto.includes("o que você faz")
        ) {
            return chat(textoOriginal);
        }

        return chat(textoOriginal);
    }

    async function executarIntencao(intencao) {
        const player = document.getElementById("playerBrasflix");
        const chatbotWidget = document.getElementById("chatbot-widget");
        const chatbotInput = document.getElementById("chatbot-input");
        const chatbotForm = document.getElementById("chatbot-form");

        if (!intencao || !intencao.tipo) {
            return {
                ok: false,
                mensagem: "Não consegui interpretar o comando."
            };
        }

        if (intencao.tipo === "acao") {
            switch (intencao.acao) {
                case "nenhuma":
                    return {
                        ok: false,
                        mensagem: "Não consegui entender o comando."
                    };

                case "navegar":
                    if (intencao.destino) {
                        window.location.href = intencao.destino;
                        return {
                            ok: true,
                            mensagem: `Abrindo ${intencao.destino}.`
                        };
                    }
                    break;

                case "abrir_chatbot":
                    if (chatbotWidget) {
                        chatbotWidget.classList.add("aberto");
                        return {
                            ok: true,
                            mensagem: "Chatbot aberto."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "O chatbot não está disponível nesta página."
                    };

                case "fechar_chatbot":
                    if (chatbotWidget) {
                        chatbotWidget.classList.remove("aberto");
                        return {
                            ok: true,
                            mensagem: "Chatbot fechado."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "O chatbot não está disponível nesta página."
                    };

                case "player_pause":
                    if (player) {
                        player.pause();
                        return {
                            ok: true,
                            mensagem: "Vídeo pausado."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "Não encontrei o player nesta página."
                    };

                case "player_play":
                    if (player) {
                        player.play().catch(() => {});
                        return {
                            ok: true,
                            mensagem: "Tentando reproduzir o vídeo."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "Não encontrei o player nesta página."
                    };

                case "player_restart":
                    if (player) {
                        player.currentTime = 0;
                        player.play().catch(() => {});
                        return {
                            ok: true,
                            mensagem: "Vídeo reiniciado."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "Não encontrei o player nesta página."
                    };

                case "player_volume_up":
                    if (player) {
                        player.volume = Math.min(1, player.volume + 0.1);
                        return {
                            ok: true,
                            mensagem: "Volume aumentado."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "Não encontrei o player nesta página."
                    };

                case "player_volume_down":
                    if (player) {
                        player.volume = Math.max(0, player.volume - 0.1);
                        return {
                            ok: true,
                            mensagem: "Volume diminuído."
                        };
                    }
                    return {
                        ok: false,
                        mensagem: "Não encontrei o player nesta página."
                    };

                case "quiz_iniciar":
                    if (window.PedriaCore && typeof window.PedriaCore.gerarQuiz === "function") {
                        const videoId = obterContextoPagina()?.videoId || "";
                        const videoTitulo = document.getElementById("videoTitulo")?.textContent?.trim() || "";
                        const resultadoQuiz = await window.PedriaCore.gerarQuiz({
                            videoId,
                            videoTitulo,
                            contexto: obterContextoPagina()
                        });

                        if (resultadoQuiz.ok && Array.isArray(resultadoQuiz.perguntas) && resultadoQuiz.perguntas.length > 0) {
                            if (window.BrasflixQuiz && typeof window.BrasflixQuiz.iniciar === "function") {
                                window.BrasflixQuiz.estado.perguntas = resultadoQuiz.perguntas;
                                window.BrasflixQuiz.estado.iniciado = true;
                                window.BrasflixQuiz.perguntaAtual = 0;
                                window.BrasflixQuiz.reiniciarQuiz && window.BrasflixQuiz.reiniciarQuiz();
                            }
                            return {
                                ok: true,
                                mensagem: `Quiz gerado com IA (${resultadoQuiz.origem})!`,
                                abrirChat: true
                            };
                        }

                        return {
                            ok: false,
                            mensagem: `Não consegui gerar quiz com IA: ${resultadoQuiz.mensagem || 'sem retorno'}`
                        };
                    }

                    return {
                        ok: true,
                        mensagem: "O quiz ainda vai ser conectado à IA, mas a estrutura já está preparada."
                    };
            }
        }

        if (intencao.tipo === "chat") {
            if (!window.PedriaCore || typeof window.PedriaCore.responder !== "function") {
                return {
                    ok: false,
                    mensagem: "A PedrIA ainda não está disponível."
                };
            }

            const contexto = obterContextoPagina();
            const resultado = await window.PedriaCore.responder(intencao.mensagem, contexto);
            const resposta = resultado?.resposta || "Não consegui responder agora.";

            if (chatbotWidget) {
                chatbotWidget.classList.add("aberto");
            }

            if (chatbotInput && chatbotForm) {
                chatbotInput.value = intencao.mensagem;
            }

            return {
                ok: true,
                mensagem: resposta,
                abrirChat: true,
                mensagemOriginal: intencao.mensagem
            };
        }

        return {
            ok: false,
            mensagem: "Não consegui processar essa intenção."
        };
    }

    window.VoiceIntent = {
        normalizar,
        classificar,
        executarIntencao,
        obterContextoPagina
    };
})();
