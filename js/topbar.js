import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function currentPageKey() {
  const path = location.pathname;
  if (path.includes("/usuarios")) return "pessoas";
  if (path.includes("/perfil")) return "perfil";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/face")) return "face";
  if (path.includes("/video")) return "videos";
  return "";
}

function buildLink(href, label, key) {
  const ativo = currentPageKey() === key ? " ativo" : "";
  return `<a class="topbar-btn${ativo}" href="${href}">${label}</a>`;
}

async function renderTopbar(user) {
  if (document.querySelector(".brasflix-topbar") || location.pathname.endsWith("index.html") || location.pathname === "/" || location.pathname.endsWith("login.html")) return;
  document.body.classList.add("tem-topbar");
  let isAdmin = false;
  if (user) {
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      isAdmin = snap.exists() && (snap.data()?.role === "admin");
    } catch (error) {
      console.error("[Topbar] Erro ao ler role:", error);
    }
  }

  const adminButtons = isAdmin
    ? `${buildLink('/admin/dashboard.html','Admin','admin')} ${buildLink('/admin-setter.html','Admin Setter','admin-setter')} ${buildLink('/setup-admin.html','Setup Admin','setup-admin')}`
    : "";

  const topbar = document.createElement("div");
  topbar.className = "brasflix-topbar";
  topbar.innerHTML = `
    <div class="topbar-left">
      <a class="topbar-logo" href="/index.html"><span>BRAS</span>FLIX</a>
      ${buildLink('/video.html','Vídeos','videos')}
      ${buildLink('/usuarios.html','Pessoas','pessoas')}
      ${buildLink('/perfil.html','Perfil','perfil')}
      ${buildLink('/analytics.html','Analytics','analytics')}
      ${buildLink('/face.html','Face','face')}
      ${adminButtons}
    </div>
    <div class="topbar-right">
      <button class="topbar-btn sair" id="topbarLogoutBtn" type="button">Sair</button>
    </div>`;
  document.body.prepend(topbar);
  topbar.querySelector('#topbarLogoutBtn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('faceLoginUser');
      localStorage.removeItem('faceLoginEmail');
      location.href = '/login.html';
    } catch (error) {
      alert('Não foi possível sair agora.');
    }
  });
}

onAuthStateChanged(auth, (user) => renderTopbar(user));
