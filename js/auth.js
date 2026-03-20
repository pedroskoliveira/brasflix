import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ids = {
  formCadastro: document.getElementById("form-cadastro"),
  formLogin: document.getElementById("form-login"),
  btnGoogle: document.getElementById("btnGoogle"),
  btnFace: document.getElementById("irParaFace"),
  btnAbrirRecuperar: document.getElementById("abrirRecuperar"),
  recuperarBox: document.getElementById("recuperarBox"),
  btnRecuperarEmail: document.getElementById("btnRecuperarEmail"),
  btnRecuperarTelefone: document.getElementById("btnRecuperarTelefone"),
  inputFotoPerfil: document.getElementById("fotoPerfil"),
  fotoPreview: document.querySelector(".foto-preview")
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function prepararSessao() {
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch (error) {
    console.error("[Auth] Não foi possível ajustar persistência de sessão:", error);
  }
}

function valor(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function arquivo(id) {
  return document.getElementById(id)?.files?.[0] || null;
}

function alertar(texto) {
  window.alert(texto);
}

function alternarAbas() {
  document.querySelectorAll(".aba-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      const aba = botao.dataset.aba;
      document.querySelectorAll(".aba-btn").forEach((item) => item.classList.remove("ativo"));
      document.querySelectorAll(".aba-conteudo").forEach((item) => item.classList.remove("ativo"));
      botao.classList.add("ativo");
      document.getElementById(`aba-${aba}`)?.classList.add("ativo");
    });
  });
}

function renderizarPreviewPadrao() {
  if (!ids.fotoPreview) return;
  ids.fotoPreview.classList.remove("tem-imagem");
  ids.fotoPreview.innerHTML = "<span>Adicionar foto</span>";
}

function configurarPreviewFoto() {
  if (!ids.inputFotoPerfil || !ids.fotoPreview) return;

  renderizarPreviewPadrao();

  ids.inputFotoPerfil.addEventListener("change", () => {
    const file = ids.inputFotoPerfil.files?.[0];

    if (!file) {
      renderizarPreviewPadrao();
      return;
    }

    try {
      validarImagem(file, 2);
    } catch (error) {
      alertar(error.message);
      ids.inputFotoPerfil.value = "";
      renderizarPreviewPadrao();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      ids.fotoPreview.classList.add("tem-imagem");
      ids.fotoPreview.innerHTML = `<img src="${reader.result}" alt="Prévia da foto de perfil">`;
    };
    reader.readAsDataURL(file);
  });
}

function validarImagem(file, limiteMB = 2) {
  if (!file) return true;
  const limiteBytes = limiteMB * 1024 * 1024;

  if (!file.type.startsWith("image/")) {
    throw new Error("A foto de perfil precisa ser uma imagem.");
  }

  if (file.size > limiteBytes) {
    throw new Error(`A foto de perfil deve ter no máximo ${limiteMB} MB.`);
  }

  return true;
}

async function uploadImagemCloudinary(file, pasta = "brasflix/avatars") {
  if (!file) {
    return { url: "", publicId: "" };
  }

  validarImagem(file, 2);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary não configurado. Verifique as variáveis na Vercel.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", pasta);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Erro ao enviar imagem.");
  }

  return {
    url: data.secure_url || "",
    publicId: data.public_id || ""
  };
}

async function garantirDocumentoUsuario(usuario, dados = {}) {
  const userRef = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(userRef);
  const existente = snap.exists() ? snap.data() || {} : {};

  const base = {
    usuarioId: usuario.uid,
    uid: usuario.uid,
    nome: dados.nome || existente.nome || usuario.displayName || "Usuário",
    email: dados.email || existente.email || usuario.email || "",
    telefone: dados.telefone || existente.telefone || usuario.phoneNumber || "",
    cpf: dados.cpf || existente.cpf || "",
    dataNascimento: dados.dataNascimento || existente.dataNascimento || "",
    cep: dados.cep || existente.cep || "",
    endereco: dados.endereco || existente.endereco || "",
    bairro: dados.bairro || existente.bairro || "",
    cidade: dados.cidade || existente.cidade || "",
    estado: dados.estado || existente.estado || "",
    numero: dados.numero || existente.numero || "",
    avatar: dados.avatar || existente.avatar || usuario.photoURL || "",
    avatarPublicId: dados.avatarPublicId || existente.avatarPublicId || "",
    username: dados.username || existente.username || "",
    bio: dados.bio || existente.bio || "",
    seguidores: Array.isArray(existente.seguidores) ? existente.seguidores : [],
    seguindo: Array.isArray(existente.seguindo) ? existente.seguindo : [],
    categoriasFavoritas: Array.isArray(dados.categoriasFavoritas) ? dados.categoriasFavoritas : (Array.isArray(existente.categoriasFavoritas) ? existente.categoriasFavoritas : []),
    mostrarPerfilPublico: typeof dados.mostrarPerfilPublico === "boolean" ? dados.mostrarPerfilPublico : (existente.mostrarPerfilPublico ?? true),
    tipoLogin: dados.tipoLogin || existente.tipoLogin || "email",
    role: existente.role || "user",
    perfilCompleto:
      typeof dados.perfilCompleto === "boolean"
        ? dados.perfilCompleto
        : (existente.perfilCompleto ?? false),
    onboardingStatus: dados.onboardingStatus || existente.onboardingStatus || "pending_face",
    faceLoginEnabled: existente.faceLoginEnabled ?? false,
    atualizadoEm: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...base,
      criadoEm: serverTimestamp()
    });
  } else {
    await updateDoc(userRef, base);
  }

  await setDoc(
    doc(db, "usuarios_publicos", usuario.uid),
    {
      uid: usuario.uid,
      nome: base.nome,
      username: base.username || "",
      bio: base.bio || "",
      avatar: base.avatar,
      categoriasFavoritas: base.categoriasFavoritas || [],
      mostrarPerfilPublico: base.mostrarPerfilPublico ?? true,
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
}

function senhaForte(senha = "") {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(senha);
}

async function cadastrarComEmail(event) {
  event.preventDefault();

  const nome = valor("nome-completo");
  const email = valor("cadastro-email");
  const senha = valor("senha-cadastro");
  const confirmar = valor("confirmar-senha");

  if (!nome || !email || !senha) {
    return alertar("Preencha nome, e-mail e senha.");
  }

  if (!senhaForte(senha)) {
    return alertar("A senha deve ter 8+ caracteres, com maiúscula, minúscula, número e caractere especial.");
  }

  if (senha !== confirmar) {
    return alertar("As senhas não coincidem.");
  }

  try {
    await prepararSessao();
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const usuario = cred.user;

    const avatarUpload = await uploadImagemCloudinary(arquivo("fotoPerfil"), "brasflix/avatars");

    await garantirDocumentoUsuario(usuario, {
      nome,
      email,
      telefone: valor("telefone"),
      username: valor("username") || nome.toLowerCase().replace(/[^a-z0-9]+/g, ""),
      bio: valor("bio"),
      categoriasFavoritas: valor("categorias-favoritas").split(",").map((item) => item.trim()).filter(Boolean),
      cpf: valor("cpf"),
      dataNascimento: valor("data-nascimento"),
      cep: valor("cep"),
      endereco: valor("endereco"),
      bairro: valor("bairro"),
      cidade: valor("cidade"),
      estado: valor("estado"),
      numero: valor("numero"),
      avatar: avatarUpload.url,
      avatarPublicId: avatarUpload.publicId,
      tipoLogin: "email",
      perfilCompleto: true,
      onboardingStatus: "pending_face"
    });

    window.location.href = "face.html?mode=enroll";
  } catch (error) {
    console.error("[Auth] Erro no cadastro:", error);
    alertar(`Erro no cadastro: ${error.message}`);
  }
}

async function loginComEmail(event) {
  event.preventDefault();
  const email = valor("login-email");
  const senha = valor("login-senha");

  if (!email || !senha) {
    return alertar("Preencha e-mail e senha.");
  }

  try {
    await prepararSessao();
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    await redirecionarPorEstado(cred.user);
  } catch (error) {
    console.error("[Auth] Erro no login:", error);
    alertar(`Erro no login: ${error.message}`);
  }
}

async function loginGoogle() {
  try {
    await prepararSessao();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userRef = doc(db, "usuarios", cred.user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await garantirDocumentoUsuario(cred.user, {
        tipoLogin: "google",
        perfilCompleto: true,
        onboardingStatus: "pending_face",
        nome: cred.user.displayName || "Usuário Google",
        email: cred.user.email || "",
        avatar: cred.user.photoURL || ""
      });
    } else {
      await garantirDocumentoUsuario(cred.user, {
        tipoLogin: "google"
      });
    }

    await redirecionarPorEstado(cred.user);
  } catch (error) {
    console.error("[Auth] Erro no Google Login:", error);
    alertar(`Erro ao entrar com Google: ${error.message}`);
  }
}

async function recuperarPorEmail() {
  const email = valor("rec-email") || valor("login-email") || valor("cadastro-email");

  if (!email) {
    return alertar("Informe um e-mail para recuperação.");
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alertar("E-mail de recuperação enviado com sucesso.");
  } catch (error) {
    console.error("[Auth] Erro na recuperação:", error);
    alertar(`Erro na recuperação: ${error.message}`);
  }
}

function recuperarPorTelefone() {
  alertar(
    "A recuperação por telefone ainda não foi implementada com Firebase Phone Auth. Por enquanto, use a recuperação por e-mail."
  );
}

async function redirecionarPorEstado(usuario) {
  const snap = await getDoc(doc(db, "usuarios", usuario.uid));
  const dados = snap.exists() ? snap.data() || {} : {};

  if (dados.role === "admin") {
    window.location.href = "admin/dashboard.html";
    return;
  }

  if (!dados.faceLoginEnabled || dados.onboardingStatus === "pending_face") {
    window.location.href = "face.html?mode=enroll";
    return;
  }

  window.location.href = "index.html";
}

function bindEventos() {
  alternarAbas();
  configurarPreviewFoto();

  ids.formCadastro?.addEventListener("submit", cadastrarComEmail);
  ids.formLogin?.addEventListener("submit", loginComEmail);
  ids.btnGoogle?.addEventListener("click", loginGoogle);
  ids.btnFace?.addEventListener("click", () => {
    window.location.href = "face.html?mode=login";
  });
  ids.btnAbrirRecuperar?.addEventListener("click", () => ids.recuperarBox?.classList.toggle("ativo"));
  ids.btnRecuperarEmail?.addEventListener("click", recuperarPorEmail);
  ids.btnRecuperarTelefone?.addEventListener("click", recuperarPorTelefone);
}

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario || !window.location.pathname.endsWith("login.html")) return;
});

document.addEventListener("DOMContentLoaded", bindEventos);

