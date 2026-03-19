# ⚡ ADMIN CONTROL VIA FIRESTORE - QUICK START

## Em 3 Minutos ⏱️ (SEM PAGAR!)

### 1. Upload GitHub (2 min)

```
5 arquivos:
✓ admin-setter.html (novo)
✓ js/admin-auth.js (atualizado)
✓ admin/dashboard.html
✓ admin/comentarios.html
✓ admin/categorias.html

Mensagem: "Feat: Admin control via Firestore (free)"
```

### 2. Vercel Redeploy (1 min)

```
https://vercel.com → brasflix → Deployments → Redeploy
```

---

## Usar: `/admin-setter.html`

```
URL: https://seu-site.vercel.app/admin-setter.html

1. 🔄 Carregar Usuários
2. 👤 Clicar usuario
3. 👑 Selecionar "admin"
4. ✅ Clicar "Definir Role"

✅ Sucesso! Usuário agora é admin!
```

---

## ✅ Testando

| Teste | Esperado | Status |
|-------|----------|--------|
| Admin entra `/admin/...` | ✅ Entra | |
| Usuário (role=user) entra `/admin/...` | ❌ Bloqueado | |
| Não logado entra `/admin/...` | ❌ Para login | |

---

## 🔗 Links Rápidos

- GitHub: https://github.com/seu-usuario/brasflix
- Vercel: https://vercel.com/seu-usuario/brasflix
- Admin Setter: https://seu-site.vercel.app/admin-setter.html
- Firestore: https://console.firebase.google.com/project/brasflix-3e0c4/firestore

---

## 📝 Como Funciona

```
Usuário tem documento no Firestore:
{
  "uid": "user123",
  "email": "pedro@exemplo.com",
  "role": "admin"    ← Isso controla acesso!
}

role = "admin"  → Acesso total
role = "user"   → Bloqueado do /admin
```

---

**🎯 Admin control 100% GRÁTIS (via Firestore, sem Cloud Functions)!**

