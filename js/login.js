const botoesAbas = document.querySelectorAll(".aba-btn");
const conteudosAbas = document.querySelectorAll(".aba-conteudo");

botoesAbas.forEach((botao) => {
    botao.addEventListener("click", () => {
        const aba = botao.dataset.aba;

        botoesAbas.forEach((b) => b.classList.remove("ativo"));
        conteudosAbas.forEach((c) => c.classList.remove("ativo"));

        botao.classList.add("ativo");
        document.getElementById(`aba-${aba}`).classList.add("ativo");
    });
});

const fotoPerfil = document.getElementById("fotoPerfil");
const fotoPreview = document.querySelector(".foto-preview");

if (fotoPerfil) {
    fotoPerfil.addEventListener("change", (event) => {
        const arquivo = event.target.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = function(e) {
            fotoPreview.innerHTML = `<img src="${e.target.result}" alt="Foto do perfil">`;
        };
        leitor.readAsDataURL(arquivo);
    });
}

const campoCep = document.getElementById("cep");

if (campoCep) {
    campoCep.addEventListener("blur", async () => {
        const cep = campoCep.value.replace(/\D/g, "");

        if (cep.length !== 8) return;

        try {
            const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const dados = await resposta.json();

            if (dados.erro) return;

            document.getElementById("endereco").value = dados.logradouro || "";
            document.getElementById("bairro").value = dados.bairro || "";
            document.getElementById("cidade").value = dados.localidade || "";
            document.getElementById("estado").value = dados.uf || "";
        } catch (erro) {
            console.error("Erro ao buscar CEP:", erro);
        }
    });
}

const abrirRecuperar = document.getElementById("abrirRecuperar");
const recuperarBox = document.getElementById("recuperarBox");

if (abrirRecuperar && recuperarBox) {
    abrirRecuperar.addEventListener("click", () => {
        recuperarBox.classList.toggle("ativo");
    });
}

const abrirFaceLogin = document.getElementById("abrirFaceLogin");
const faceLoginBox = document.getElementById("faceLoginBox");
const videoLogin = document.getElementById("videoLogin");
let cameraAtiva = false;

if (abrirFaceLogin && faceLoginBox) {
    abrirFaceLogin.addEventListener("click", async () => {
        faceLoginBox.classList.toggle("ativo");

        if (faceLoginBox.classList.contains("ativo") && !cameraAtiva) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

                videoLogin.srcObject = stream;
                cameraAtiva = true;
            } catch (erro) {
                console.error("Erro ao acessar câmera:", erro);
            }
        }
    });
}

flatpickr("#data-nascimento", {
    locale: "pt",
    dateFormat: "d/m/Y",
    maxDate: "today",
    disableMobile: true
});
