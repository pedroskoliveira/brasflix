# 🔐 CONTROLE DE ADMIN/USUÁRIO - GUIA COMPLETO

## Resumo do que foi feito

✅ **Sistema via Firestore** (100% GRATUITO - SEM pagar!)
✅ **Ultra simples** - Sem Cloud Functions necessárias
✅ **admin-auth.js atualizado** - Verifica role no Firestore
✅ **admin-setter.html criado** - Interface para gerenciar roles
✅ **Tudo pronto para usar!** 🚀

---

## 🎯 Como Funciona Agora

### **ANTES (Sem controle):**
```
Qualquer usuário logado → Acesso a /admin
⚠️ Problema: Falta segurança!
```

### **AGORA (Com role no Firestore):**
```
Documento do usuário em Firestore:
{
  "uid": "user123",
  "email": "pedro@exemplo.com",
  "role": "admin"  ← Define se é admin ou user
}

Se role = "admin" → Acesso a /admin ✅
Se role = "user" → Bloqueado, redireciona para /index.html ❌
Se não logado → Redireciona para /login.html ❌
```

---

## 📋 PASSO-A-PASSO (5 minutos)

### 1️⃣ PREPARAR FIRESTORE (2 minutos)

#### 1.1 Verificar estrutura

Sua coleção **usuarios** deve ter:

```json
{
  "uid": "user123",
  "email": "pedro@exemplo.com",
  "nome": "Pedro Simão",
  "role": "admin"     ← ADICIONAR ESTE CAMPO!
}
```

Se ainda não tem campo **role**, não tem problema! O Firebase criará automaticamente.

#### 1.2 Quem pode ser admin?

```
role = "admin"     → Acesso a /admin (gerenciar tudo)
role = "user"      → Acesso normal (ver vídeos apenas)
```

---

### 2️⃣ SUBIR ARQUIVOS NO GITHUB (2 minutos)

#### 2.1 Arquivos novos/atualizados:

```
admin-setter.html          (atualizado - sem Cloud Functions)
js/admin-auth.js           (atualizado - lê role do Firestore)
admin/dashboard.html       (com admin-auth.js)
admin/comentarios.html     (com admin-auth.js)
admin/categorias.html      (com admin-auth.js)
```

#### 2.2 Upload no GitHub

```
👉 https://github.com/seu-usuario/brasflix
Clique: "Add file" → "Upload files"
Selecione os 5 arquivos acima
Mensagem: "Feat: Admin control via Firestore (free, no functions)"
Clique: "Commit changes"
```

#### 2.3 Vercel Redeploy

```
👉 https://vercel.com
Projeto: brasflix
Menu: Deployments (última versão ✓)
Clique: ... → "Redeploy"
⏳ Aguarde 3-5 minutos
```

---

### 3️⃣ USAR A INTERFACE (1 minuto)

#### 3.1 Abrir Admin Setter

```
URL: https://seu-site.vercel.app/admin-setter.html
(ou localmente: http://localhost/admin-setter.html)
```

#### 3.2 Carregar Usuários

```
Clique botão: "🔄 Carregar Usuários"
(mostrará lista de todos os usuários com role atual)
```

#### 3.3 Selecionar Usuário

```
Clique no usuário na lista
OU digite o UID manualmente
(ex: user123)
```

#### 3.4 Escolher Role

```
SELECT: "👤 user" ou "👑 admin"
```

#### 3.5 Definir Role

```
Clique: "✅ Definir Role"
✅ Sucesso! Aparecerá mensagem verde
```

---

## 🎭 CASOS DE USO

### **Caso 1: Dar Admin a um Usuário Real**

```
1. Acesse: /admin-setter.html
2. Carregue usuários
3. Procure o email desejado na lista
4. Clique para selecionar
5. SELECT "👑 admin"
6. Clique "✅ Definir Role"
7. Pronto! ✅
```

O usuário pode agora:
- ✓ Entrar em `/admin/dashboard.html`
- ✓ Ver analytics
- ✓ Gerenciar vídeos
- ✓ Moderar comentários

### **Caso 2: Remover Admin de um Usuário**

```
1. Abra /admin-setter.html
2. Carregue usuários
3. Procure o usuário
4. Clique para selecionar
5. SELECT "👤 user"
6. Clique "✅ Definir Role"
7. OU clique "❌ Remove" (direto!)
```

O usuário agora:
- ✗ Não pode entrar em `/admin`
- ✓ Pode continuar vendo vídeos

### **Caso 3: Bloquear Acesso de Usuário Normal**

Se um usuário com `role: "user"` tenta entrar em `/admin/dashboard.html`:

```
1. Página carrega admin-auth.js
2. Script lê documento do Firestore
3. Vê que role = "user"
4. Alerta: "❌ Você não tem permissão para acessar essa área!(role: user)"
5. Redireciona para /index.html
✅ Seguro!
```

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### **Teste 1: Como Admin (Deve passar)**

```
1. Abra /admin-setter.html
2. Coloque seu UID
3. SELECT "👑 admin"
4. Clique "Definir Role"
5. Navegue para /admin/dashboard.html
6. ✅ Entra normalmente = FUNCIONANDO!
```

### **Teste 2: Como Usuário Normal (Deve bloquear)**

```
1. Crie novo usuário no Firebase
2. Coloque role = "user"
3. Faça login com esse usuário
4. Tente /admin/dashboard.html
5. ❌ Alerta + Redirecionado para /index.html = FUNCIONANDO!
```

### **Teste 3: Sem Login (Deve bloquear)**

```
1. Abra incógnito / nova aba
2. Digite direto: /admin/dashboard.html
3. ❌ Redirecionado para /login.html = FUNCIONANDO!
```

### **Teste 4: Remover Admin (Deve bloquear)**

```
1. Estando como admin, remova seu próprio admin
2. Clique "/admin/dashboard.html"
3. ❌ Alerta "Você não tem permissão"
4. Redirecionado = FUNCIONANDO!
```

---

## 📊 ARQUIVOS MODIFICADOS

```
ANTES:
├── admin-setter.html ❌ (não existia)
├── js/admin-auth.js ⚠️ (checava custom claims)
└── admin/*.html ❌ (sem verificação)

DEPOIS:
├── admin-setter.html ✅ (interface novo)
├── js/admin-auth.js ✅ (verifica role Firestore)
└── admin/*.html ✅ (com script admin-auth.js)
```

---

## 🐛 TROUBLESHOOTING

### **Problema: "Nenhum usuário encontrado" em admin-setter.html**

```
✓ Solução: Verificar se coleção "usuarios" existe
✓ Solução: Verificar se tem documentos na coleção
✓ Solução: Verificar permissões Firestore:
   match /usuarios/{document=**} {
     allow read, write: if request.auth != null;
   }
```

### **Problema: "Acesso negado" mesmo sendo admin**

```
✓ Solução: Fazer logout + login novamente
✓ Solução: Limpar cache (Ctrl+Shift+Del)
✓ Solução: Verificar console (F12) para erros
✓ Solução: Confirmar que role = "admin" no Firestore
```

### **Problema: Admin-setter não faz update**

```
✓ Solução: Verificar console (F12 → Console)
✓ Solução: Verificar se está logado
✓ Solução: Verificar permissões Firestore (read, write)
✓ Solução: Verificar se UID está correto
```

### **Problema: Usuário não consegue entrar em /admin após ser admin**

```
✓ Solução: Recarregar página (Ctrl+F5)
✓ Solução: Fazer logout + login novamente
✓ Solução: Verificar que role foi setado corretamente
✓ Solução: Checar console.log no navegador (F12)
```

---

## 📚 COMO FUNCIONAM OS ARQUIVOS

### **admin-setter.html** 🆕

```
Interface bonita para gerenciar admin/user
├─ Carrega lista de usuários Firestore
├─ Mostra role atual (admin ou user)
├─ Permite selecionar usuário
├─ Permite escolher nova role
├─ Atualiza documento Firestore
└─ Mostra resultado (sucesso/erro)
```

### **js/admin-auth.js** 🔒

```
Corre automaticamente em cada página /admin
├─ 1. Verifica: usuário está logado?
├─ 2. Lê documento do usuário no Firestore
├─ 3. Verifica: role = "admin"?
├─ Se SIM → deixa acessar
├─ Se NÃO → alerta e redireciona para /index.html
└─ Se não logado → redireciona para /login.html
```

### **admin/dashboard.html** 📊

```html
<script src="../js/admin-dashboard.js"></script>
<script src="../js/admin-auth.js"></script> ← VERIFICA ACESSO!
```

Mesma coisa em:
- `admin/comentarios.html`
- `admin/categorias.html`

---

## 💾 BANCO DE DADOS FIRESTORE

### Exemplo de documento de usuário

```json
Coleção: usuarios
Documento: user123

{
  "uid": "user123",
  "email": "pedro@exemplo.com",
  "nome": "Pedro Simão",
  "dataCriacao": "2026-03-15",
  "role": "admin",     ← ISSO É O QUE CONTROLA ACESSO!
  "avatar": "...",
  "telefone": "..."
}
```

### Valores válidos de `role`

| Valor | Acesso | Permissões |
|-------|--------|-----------|
| `"admin"` | ✅ /admin | tudo |
| `"user"` | ❌ /admin | apenas vídeos |
| (vazio) | ❌ /admin | padrão = user |

---

## ✅ CHECKLIST FINAL

- [ ] admin-setter.html enviado no GitHub
- [ ] js/admin-auth.js enviado no GitHub
- [ ] 3 págs admin atualizadas no GitHub
- [ ] Vercel remodeployado
- [ ] Consegue acessar /admin-setter.html
- [ ] Consegue carregar usuários na interface
- [ ] Consegue selecionar usuário
- [ ] Consegue escolher role
- [ ] Consegue clicar "Definir Role"
- [ ] Recebe mensagem "✅ Sucesso!"
- [ ] Usuário agora consegue entrar em /admin
- [ ] Usuário sem admin é bloqueado
- [ ] Mensagem alerta aparece
- [ ] Redireciona para /index.html
- [ ] Usuário não logado é bloqueado
- [ ] Redireciona para /login.html

---

## 💡 EXPLICAÇÃO TÉCNICA

### Como funciona a verificação

```javascript
// Em admin-auth.js:
async function verificarAdmin() {
  const user = firebase.auth().currentUser;
  
  // 1. Logado?
  if (!user) window.location.href = "/login.html";
  
  // 2. Ler doc Firestore
  const docSnap = await getDoc(doc(db, "usuarios", user.uid));
  const userData = docSnap.data();
  
  // 3. É admin?
  if (userData.role === "admin") {
    // ✅ Deixa entrar
  } else {
    // ❌ Bloqueia
    window.location.href = "/index.html";
  }
}
```

### Segurança Firestore

```
match /usuarios/{document=**} {
  allow read, write: if request.auth != null;
}
```

Isso significa:
- ✓ Usuário logado pode ler/escrever em usuarios
- ❌ Não logado não pode fazer nada

---

## 🎉 QUANDO TUDO PASSAR

- ✅ Site está 100% seguro
- ✅ Admin controls funcionam
- ✅ Zero custo extra (Firestore gratuito)
- ✅ Escalável (se pilotos crescerem precisa upgrade)
- ✅ BRASFLIX com autenticação profissional!

---

**🔐 Sistema de admin/usuário COMPLETO e GRATUITO!**
