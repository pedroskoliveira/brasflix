(function () {
    const PedriaCore = {
        config: {
            usarIA: true,
            providerPreferencial: "mistral", // "mistral" | "gemini"
            usarFallbackLocal: true
        },

        configurar({
            usarIA = false,
            providerPreferencial = "gemini",
            usarFallbackLocal = true
        } = {}) {
            this.config.usarIA = Boolean(usarIA);
            this.config.providerPreferencial = providerPreferencial || "gemini";
            this.config.usarFallbackLocal = Boolean(usarFallbackLocal);
        },

        async responder(mensagem, contexto = {}) {
            const textoOriginal = (mensagem || "").trim();
            const texto = normalizar(textoOriginal);

            if (!texto) {
                return {
                    origem: "local",
                    resposta: "Não recebi nenhuma mensagem para responder."
                };
            }

            const respostaLocal = tentarRespostaLocal(texto, contexto);
            if (respostaLocal) {
                return {
                    origem: "local",
                    resposta: respostaLocal
                };
            }

            const respostaBancoLocal = tentarRespostaBancoLocal(texto, contexto);
            if (respostaBancoLocal) {
                return {
                    origem: "banco-local",
                    resposta: respostaBancoLocal
                };
            }

            if (this.config.usarIA) {
                const respostaIA = await tentarRespostaComIA({
                    mensagemOriginal: textoOriginal,
                    contexto,
                    providerPreferencial: this.config.providerPreferencial
                });

                if (respostaIA.ok) {
                    return {
                        origem: respostaIA.origem,
                        resposta: respostaIA.resposta
                    };
                }
            }

            if (this.config.usarFallbackLocal) {
                return {
                    origem: "fallback",
                    resposta: respostaFallback(textoOriginal, contexto)
                };
            }

            return {
                origem: "indisponivel",
                resposta: "A PedrIA ainda não conseguiu responder isso neste momento."
            };
        },

        async gerarQuiz({ videoId = "", videoTitulo = "", contexto = {} } = {}) {
            const contextoCompleto = {
                ...contexto,
                videoId,
                videoTitulo,
                objetivo: "gerar_quiz"
            };

            if (this.config.usarIA) {
                const prompt = `
Crie 5 perguntas de múltipla escolha sobre o vídeo.
Cada pergunta deve ter:
- id
- enunciado
- alternativas (array com 4 itens)
- correta (índice da alternativa correta)

Responda apenas em JSON válido.
                `.trim();

                const resultado = await tentarJsonComIA({
                    prompt,
                    contexto: contextoCompleto,
                    providerPreferencial: this.config.providerPreferencial
                });

                if (resultado.ok && Array.isArray(resultado.dados?.perguntas)) {
                    return {
                        ok: true,
                        origem: resultado.origem,
                        perguntas: resultado.dados.perguntas
                    };
                }
            }

            return {
                ok: false,
                origem: "local",
                perguntas: [],
                mensagem: "A geração de quiz com IA ainda não está disponível."
            };
        }
    };

    function normalizar(texto = "") {
        return String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function obterNomePagina(contexto = {}) {
        return contexto?.pagina || "desconhecida";
    }

    const bancoVideoSimulado = [
    { id: "video1", titulo: "Como criar um app com JavaScript", categoria: "Tecnologia" },
    { id: "video2", titulo: "Introdução à IA e Machine Learning", categoria: "Educação" }
];

function buscarVideoPorId(id) {
    if (!id) return null;
    return bancoVideoSimulado.find((item) => item.id === id) || null;
}

function tentarRespostaBancoLocal(texto, contexto = {}) {
    const videoId = contexto?.videoId;

    if (texto.includes("qual o titulo do video") || texto.includes("título do vídeo")) {
        const video = buscarVideoPorId(videoId);
        if (video) return `O título deste vídeo é "${video.titulo}".`;
        return "Ainda não tenho o título do vídeo nesta base local.";
    }

    if (texto.includes("de que fala") || texto.includes("sobre o video") || texto.includes("sobre o vídeo")) {
        const video = buscarVideoPorId(videoId);
        if (video) return `Este vídeo trata de ${video.categoria} e tecnologia. Aqui vai ser descrição em breve.`;
        return "Preciso do videoId para explicar sobre o conteúdo.";
    }

    if (texto.includes("gerar quiz") || texto.includes("quiz")) {
        return null; // passa para ação de quiz ou IA
    }

    return null;
}

function respostaFallback(mensagem, contexto = {}) {
        const pagina = obterNomePagina(contexto);

        if (pagina === "video") {
            return `Entendi sua mensagem: "${mensagem}". Em breve vou usar IA para explicar melhor o vídeo, responder perguntas sobre o conteúdo e gerar quiz automático.`;
        }

        if (pagina === "analytics") {
            return `Entendi sua mensagem: "${mensagem}". Em breve vou interpretar métricas, tendências e comportamento com apoio de IA.`;
        }

        if (pagina === "favoritos") {
            return `Entendi sua mensagem: "${mensagem}". Em breve vou usar IA para organizar seus favoritos e sugerir conteúdos parecidos.`;
        }

        if (pagina === "perfil") {
            return `Entendi sua mensagem: "${mensagem}". Em breve vou explicar seu perfil, histórico, categorias e recursos inteligentes com IA.`;
        }

        return `Entendi sua mensagem: "${mensagem}". Ainda estou em preparação para usar Mistral e Gemini de forma completa na BRASFLIX.`;
    }

    function tentarRespostaLocal(texto, contexto = {}) {
        const pagina = obterNomePagina(contexto);

        if (
            texto.includes("oi") ||
            texto.includes("ola") ||
            texto.includes("olá") ||
            texto.includes("bom dia") ||
            texto.includes("boa tarde") ||
            texto.includes("boa noite")
        ) {
            return "Oi! Eu sou a PedrIA da BRASFLIX. Posso te ajudar com navegação, vídeos, favoritos, analytics e, em breve, com IA mais avançada também.";
        }

        if (texto.includes("quem e voce") || texto.includes("quem é voce") || texto.includes("quem é você")) {
            return "Eu sou a PedrIA, a assistente da BRASFLIX. Minha função é ajudar você na navegação da plataforma e, mais pra frente, responder com inteligência artificial real.";
        }

        if (texto.includes("o que voce faz") || texto.includes("o que você faz")) {
            return "Eu ajudo você a navegar pela BRASFLIX, entender páginas, abrir áreas da plataforma e, futuramente, vou responder com IA sobre vídeos, quiz, analytics e recomendações.";
        }

        if (texto.includes("abrir perfil")) {
            window.location.href = "perfil.html";
            return "Abrindo seu perfil.";
        }

        if (texto.includes("abrir favoritos")) {
            window.location.href = "perfil.html#favoritos";
            return "Abrindo a área de favoritos no perfil.";
        }

        if (texto.includes("abrir analytics")) {
            window.location.href = "analytics.html";
            return "Abrindo analytics.";
        }

        if (
            texto.includes("abrir home") ||
            texto.includes("voltar para home") ||
            texto.includes("ir para home") ||
            texto.includes("ir para inicio") ||
            texto.includes("abrir inicio")
        ) {
            window.location.href = "index.html";
            return "Abrindo a página inicial.";
        }

        if (texto.includes("abrir login")) {
            window.location.href = "login.html";
            return "Abrindo login.";
        }

        if (texto.includes("abrir cadastro")) {
            window.location.href = "login.html#aba-cadastro";
            return "Abrindo a aba de cadastro.";
        }

        if (texto.includes("abrir reconhecimento facial") || texto.includes("abrir facial")) {
            window.location.href = "face.html";
            return "Abrindo reconhecimento facial.";
        }

        if (texto.includes("ajuda")) {
            return "Você pode me pedir para abrir perfil, favoritos, analytics, login, cadastro ou a home. Os favoritos ficam dentro do perfil, e o cadastro fica na própria tela de login.";
        }

        if (pagina === "index") {
            return respostaPaginaInicial(texto);
        }

        if (pagina === "video") {
            return respostaPaginaVideo(texto, contexto);
        }

        if (pagina === "perfil") {
            return respostaPaginaPerfil(texto);
        }

        if (pagina === "favoritos") {
            return respostaPaginaFavoritos(texto);
        }

        if (pagina === "analytics") {
            return respostaPaginaAnalytics(texto);
        }

        return null;
    }

    function respostaPaginaInicial(texto) {
        if (texto.includes("o que e brasflix") || texto.includes("o que é brasflix")) {
            return "A BRASFLIX é sua plataforma de streaming com foco em vídeos, tecnologia, interação inteligente, analytics, voz, gestos e, futuramente, recursos avançados de IA.";
        }

        if (texto.includes("o que tem aqui") || texto.includes("que conteudos tem aqui") || texto.includes("que conteúdos tem aqui")) {
            return "Na home da BRASFLIX você verá conteúdos em destaque, top vídeos, top semanal, em alta e categorias como tecnologia.";
        }

        return null;
    }

    function respostaPaginaVideo(texto) {
        const player = document.getElementById("playerBrasflix");

        if (texto.includes("pausar video") || texto.includes("pausar")) {
            if (player) {
                player.pause();
                return "Vídeo pausado.";
            }
            return "Não encontrei o player nesta página.";
        }

        if (
            texto.includes("reproduzir video") ||
            texto.includes("continuar video") ||
            texto.includes("dar play") ||
            texto.includes("tocar video")
        ) {
            if (player) {
                player.play().catch(() => {});
                return "Tentando reproduzir o vídeo.";
            }
            return "Não encontrei o player nesta página.";
        }

        if (texto.includes("reiniciar video") || texto.includes("repetir video")) {
            if (player) {
                player.currentTime = 0;
                player.play().catch(() => {});
                return "Vídeo reiniciado.";
            }
            return "Não encontrei o player nesta página.";
        }

        if (texto.includes("aumentar volume")) {
            if (player) {
                player.volume = Math.min(1, player.volume + 0.1);
                return "Volume aumentado.";
            }
            return "Não encontrei o player nesta página.";
        }

        if (texto.includes("diminuir volume")) {
            if (player) {
                player.volume = Math.max(0, player.volume - 0.1);
                return "Volume diminuído.";
            }
            return "Não encontrei o player nesta página.";
        }

        if (texto.includes("quiz")) {
            return "O módulo de quiz já está preparado estruturalmente e depois será conectado à IA.";
        }

        if (texto.includes("comentarios") || texto.includes("comentários")) {
            return "Nesta área você poderá comentar e interagir com outros usuários quando a integração real estiver pronta.";
        }

        if (texto.includes("recomendacoes") || texto.includes("recomendações")) {
            return "As recomendações relacionadas ainda serão ligadas aos dados reais da plataforma e depois à IA.";
        }

        if (texto.includes("analytics do video") || texto.includes("analytics do vídeo")) {
            return "Aqui você verá visualizações, curtidas, favoritos e retenção média do vídeo. Depois isso será alimentado por dados reais.";
        }

        if (texto.includes("analise emocional") || texto.includes("análise emocional")) {
            return "A análise emocional já está preparada estruturalmente. Depois vamos ligar os modelos de expressão facial e salvar isso nos analytics.";
        }

        return null;
    }

    function respostaPaginaPerfil(texto) {
        if (texto.includes("gestos")) {
            return "No perfil você controla a ativação do sistema de gestos da BRASFLIX. Quando ativado aqui, ele pode funcionar nas outras páginas também.";
        }

        if (texto.includes("historico") || texto.includes("histórico")) {
            return "Seu histórico real ainda será conectado ao Firebase, mas a estrutura da página já está pronta para receber esses dados.";
        }

        if (texto.includes("favoritos")) {
            return "O perfil também vai mostrar favoritos recentes assim que conectarmos os dados reais.";
        }

        if (texto.includes("analytics")) {
            return "O perfil mostrará resumo de consumo, categorias preferidas e mapa de uso com dados reais futuramente.";
        }

        return null;
    }

    function respostaPaginaFavoritos(texto) {
        if (texto.includes("favoritos") || texto.includes("minha lista")) {
            return "Aqui ficarão os vídeos favoritados pelo usuário. Quando o Firebase entrar, essa área será preenchida automaticamente.";
        }

        if (texto.includes("vazio")) {
            return "Sua lista ainda está vazia porque os favoritos reais ainda não foram conectados.";
        }

        return null;
    }

    function respostaPaginaAnalytics(texto) {
        if (texto.includes("analytics") || texto.includes("metricas") || texto.includes("métricas")) {
            return "Aqui você verá tendências, top semanal, mais assistidos e mapa do usuário. Depois isso será preenchido com dados reais e recursos de IA.";
        }

        if (texto.includes("mais assistidos")) {
            return "O ranking de mais assistidos já está estruturado, mas ainda será conectado aos dados reais da plataforma.";
        }

        if (texto.includes("top semanal")) {
            return "O top semanal já tem espaço preparado e depois será calculado a partir das métricas reais.";
        }

        return null;
    }

    async function tentarRespostaComIA({
        mensagemOriginal = "",
        contexto = {},
        providerPreferencial = "gemini"
    } = {}) {
        const providers = providerPreferencial === "mistral"
            ? ["mistral", "gemini"]
            : ["gemini", "mistral"];

        for (const provider of providers) {
            const resultado = await chamarProviderTexto({
                provider,
                mensagemOriginal,
                contexto
            });

            if (resultado.ok) {
                return {
                    ok: true,
                    origem: provider,
                    resposta: resultado.texto
                };
            }
        }

        return {
            ok: false,
            origem: "nenhum",
            resposta: ""
        };
    }

    async function tentarJsonComIA({
        prompt = "",
        contexto = {},
        providerPreferencial = "gemini"
    } = {}) {
        const providers = providerPreferencial === "mistral"
            ? ["mistral", "gemini"]
            : ["gemini", "mistral"];

        for (const provider of providers) {
            const resultado = await chamarProviderJson({
                provider,
                prompt,
                contexto
            });

            if (resultado.ok) {
                return {
                    ok: true,
                    origem: provider,
                    dados: resultado.dados
                };
            }
        }

        return {
            ok: false,
            origem: "nenhum",
            dados: null
        };
    }

    async function chamarProviderTexto({
        provider = "gemini",
        mensagemOriginal = "",
        contexto = {}
    } = {}) {
        const systemInstruction = construirInstrucaoSistema(contexto);

        if (provider === "gemini" && window.GeminiClient) {
            return await window.GeminiClient.gerarTexto({
                prompt: mensagemOriginal,
                systemInstruction,
                contexto
            });
        }

        if (provider === "mistral" && window.MistralClient) {
            return await window.MistralClient.gerarTexto({
                prompt: mensagemOriginal,
                systemInstruction,
                contexto
            });
        }

        return {
            ok: false,
            texto: "",
            erro: `Provider ${provider} não está disponível.`
        };
    }

    async function chamarProviderJson({
        provider = "gemini",
        prompt = "",
        contexto = {}
    } = {}) {
        const systemInstruction = `
Você é a PedrIA da BRASFLIX.
Responda de forma estruturada, útil e em português do Brasil.
Quando solicitado, devolva apenas JSON válido.
        `.trim();

        if (provider === "gemini" && window.GeminiClient) {
            return await window.GeminiClient.gerarJson({
                prompt,
                systemInstruction,
                contexto
            });
        }

        if (provider === "mistral" && window.MistralClient) {
            return await window.MistralClient.gerarJson({
                prompt,
                systemInstruction,
                contexto
            });
        }

        return {
            ok: false,
            dados: null,
            erro: `Provider ${provider} não está disponível.`
        };
    }

    function construirInstrucaoSistema(contexto = {}) {
        const pagina = obterNomePagina(contexto);

        return `
Você é a PedrIA da BRASFLIX.
Fale sempre em português do Brasil.
Seja útil, objetiva e amigável.
Considere o contexto da página atual: ${pagina}.
A BRASFLIX é uma plataforma de streaming com foco em vídeos, tecnologia, analytics, gestos, voz, quiz com IA e análise emocional.
Se a informação ainda não estiver conectada a dados reais, deixe isso claro sem inventar.
        `.trim();
    }

    window.PedriaCore = PedriaCore;
})();