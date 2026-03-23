import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function currentPageKey() {
  const path = location.pathname.toLowerCase();

  if (path.includes("/admin/dashboard")) return "admin-dashboard";
  if (path.includes("/admin/videos")) return "admin-videos";
  if (path.includes("/admin/categorias")) return "admin-categorias";
  if (path.includes("/admin/comentarios")) return "admin-comentarios";
  if (path.includes("/admin/analytics")) return "admin-analytics";
  if (path.includes("/admin-setter")) return "admin-setter";
  if (path.includes("/setup-admin")) return "setup-admin";

  if (path.includes("/usuarios")) return "pessoas";
  if (path.includes("/perfil")) return "perfil";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/face")) return "face";
  if (path.includes("/video")) return "videos";
  return "home";
}

function assetPath(relativePath = "") {
  return new URL(`../${relativePath.replace(/^\//, "")}`, import.meta.url).href;
}

function pagePath(relativePath = "") {
  const path = location.pathname.toLowerCase();
  const prefix = path.includes("/admin/") ? "../" : "";
  return `${prefix}${relativePath.replace(/^\//, "")}`;
}

function buildLink(href, label, key, extraClass = "") {
  const ativo = currentPageKey() === key ? " ativo" : "";
  const extra = extraClass ? ` ${extraClass}` : "";
  return `<a class="topbar-btn${ativo}${extra}" href="${pagePath(href)}">${label}</a>`;
}

function createTopbarShell() {
  const topbar = document.createElement("div");
  topbar.className = "brasflix-topbar";
  topbar.innerHTML = `
    <div class="topbar-main">
      <div class="topbar-left" id="topbarLeft"></div>
      <div class="topbar-right" id="topbarRight"></div>
      <button class="topbar-menu-toggle" id="topbarMenuToggle" type="button" aria-label="Abrir menu">☰</button>
    </div>
    <div class="topbar-mobile-panel" id="topbarMobilePanel"></div>
  `;
  return topbar;
}

function logoMarkup(extraClass = "") {
  return `
    <a class="topbar-logo${extraClass ? ` ${extraClass}` : ""}" href="${pagePath("index.html")}" aria-label="Ir para a página inicial da BRASFLIX">
      <img src="${assetPath("imagens/logo.png")}" alt="BRASFLIX">
    </a>
  `;
}

function montarLinks(userName = "", isAdmin = false) {
  const publicLinks = [
    buildLink("index.html", "Início", "home"),
    buildLink("video.html", "Vídeos", "videos"),
    buildLink("usuarios.html", "Pessoas", "pessoas"),
    buildLink("perfil.html", "Perfil", "perfil"),
    buildLink("analytics.html", "Analytics", "analytics"),
    buildLink("face.html", "Face", "face")
  ];

  const adminLinks = isAdmin
    ? [
        buildLink("admin/dashboard.html", "Admin", "admin-dashboard", "topbar-admin"),
        buildLink("admin/videos.html", "Postar vídeos", "admin-videos", "topbar-admin"),
        buildLink("admin/categorias.html", "Categorias", "admin-categorias", "topbar-admin"),
        buildLink("admin/comentarios.html", "Comentários", "admin-comentarios", "topbar-admin"),
        buildLink("admin/analytics.html", "Analytics Admin", "admin-analytics", "topbar-admin")
      ]
    : [];

  const allLinks = [...publicLinks, ...adminLinks];

  return {
    desktopLeft: `
      ${logoMarkup()}
      <div class="topbar-links">${allLinks.join("")}</div>
    `,
    desktopRight: `
      <div class="topbar-user">${userName ? `Olá, ${userName}` : ""}</div>
      <button class="topbar-btn sair" id="topbarLogoutBtn" type="button">Sair</button>
    `,
    mobilePanel: `
      <div class="topbar-mobile-links">
        ${logoMarkup("mobile")}
        ${allLinks.join("")}
        <div class="topbar-mobile-user">${userName ? `Olá, ${userName}` : ""}</div>
        <button class="topbar-btn sair" id="topbarLogoutBtnMobile" type="button">Sair</button>
      </div>
    `
  };
}

async function buscarDadosUsuario(user) {
  if (!user) {
    return { nome: "", isAdmin: false };
  }

  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const dados = snap.exists() ? snap.data() || {} : {};

    return {
      nome: dados.nome || user.displayName || user.email || "Usuário",
      isAdmin: dados.role === "admin"
    };
  } catch (error) {
    console.error("[Topbar] Erro ao ler usuário:", error);
    return {
      nome: user.displayName || user.email || "Usuário",
      isAdmin: false
    };
  }
}

function bindTopbarEvents(topbar) {
  const logoutDesktop = topbar.querySelector("#topbarLogoutBtn");
  const logoutMobile = topbar.querySelector("#topbarLogoutBtnMobile");
  const menuToggle = topbar.querySelector("#topbarMenuToggle");
  const mobilePanel = topbar.querySelector("#topbarMobilePanel");

  async function fazerLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("faceLoginUser");
      localStorage.removeItem("faceLoginEmail");
      location.href = pagePath("login.html");
    } catch (error) {
      console.error("[Topbar] Erro ao sair:", error);
      alert("Não foi possível sair agora.");
    }
  }

  logoutDesktop?.addEventListener("click", fazerLogout);
  logoutMobile?.addEventListener("click", fazerLogout);

  menuToggle?.addEventListener("click", () => {
    mobilePanel?.classList.toggle("aberto");
  });

  mobilePanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobilePanel.classList.remove("aberto"));
  });
}

async function renderTopbar(user) {
  const path = location.pathname.toLowerCase();

  if (
    document.querySelector(".brasflix-topbar") ||
    path.endsWith("login.html") ||
    path === "/login" ||
    path === "/login.html" ||
    currentPageKey() === "home"
  ) {
    return;
  }

  const { nome, isAdmin } = await buscarDadosUsuario(user);

  document.body.classList.add("tem-topbar");

  const topbar = createTopbarShell();
  const { desktopLeft, desktopRight, mobilePanel } = montarLinks(nome, isAdmin);

  topbar.querySelector("#topbarLeft").innerHTML = desktopLeft;
  topbar.querySelector("#topbarRight").innerHTML = desktopRight;
  topbar.querySelector("#topbarMobilePanel").innerHTML = mobilePanel;

  document.body.prepend(topbar);
  bindTopbarEvents(topbar);
}

onAuthStateChanged(auth, (user) => {
  renderTopbar(user);
});
