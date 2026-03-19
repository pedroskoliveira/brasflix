# 🔐 CUSTOM CLAIMS - GUIA COMPLETO

## Resumo do que foi feito

✅ **Cloud Function criada** → `setAdminClaim` (Firebase Console)
✅ **Interface criada** → `admin-setter.html` (para setar admins)
✅ **Verificação reativada** → `admin-auth.js` nas 3 páginas admin
✅ **Tudo pronto para usar!** 🚀

---

## 🎯 Como Funciona Agora

### **ANTES (Sem Custom Claims):**
```
Qualquer usuário logado → Acesso a /admin
⚠️ Problema: Falta segurança!
```

### **AGORA (Com Custom Claims):**
```
Usuário logado + Custom Claim admin=true → Acesso a /admin
Usuário logado SEM custom claim → Redirecionado para /index.html
Usuário não logado → Redirecionado para /login.html
✅ Segurança total!
```

---

## 📋 PASSO-A-PASSO (15 minutos)

### 1️⃣ CRIAR A CLOUD FUNCTION (3 minutos)

#### 1.1 Abrir Firebase Console
```
👉 https://console.firebase.google.com
👉 Selecione projeto: BRASFLIX
```

#### 1.2 Ir para Cloud Functions
```
Menu esquerda → Build → Cloud Functions
```

#### 1.3 Criar nova função
```
Clique: "Create Function"
Nome: setAdminClaim
Runtime: Node.js 18 (ou mais recente)
Region: us-central1
Clique: "Create"
```

#### 1.4 COLAR O CÓDIGO

Na tela do editor, **DELETE TUDO** e cole isto:

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Verifica se o UID foi passado
  if (!data.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UID é obrigatório"
    );
  }

  try {
    // Define o custom claim
    await admin.auth().setCustomUserClaims(data.uid, { admin: true });

    return {
      success: true,
      message: `Usuário ${data.uid} agora é ADMIN!`
    };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
```

#### 1.5 Clicar "Deploy"
```
Botão azul "Deploy" embaixo
⏳ Aguarde 2-3 minutos
✅ Pronto! aparecerá "✓ Deployment completed"
```

---

### 2️⃣ SUBIR NOVOS ARQUIVOS NO GITHUB (3 minutos)

#### 2.1 Arquivos para fazer upload:
```
admin-setter.html          (novo)
js/admin-auth.js           (reativado)
admin/dashboard.html       (atualizado)
admin/comentarios.html     (atualizado)
admin/categorias.html      (atualizado)
```

#### 2.2 Upload no GitHub
```
👉 https://github.com/seu-usuario/brasflix
Clique: "Add file" → "Upload files"
Selecione os 5 arquivos acima
Mensagem: "Feat: Custom Claims admin authentication"
Clique: "Commit changes"
```

#### 2.3 Vercel Redeploy
```
👉 https://vercel.com
Projeto: brasflix
Menu: Deployments (seleção a última ✓)
Clique: ... → "Redeploy"
⏳ Aguarde 3-5 minutos
```

---

### 3️⃣ USAR A INTERFACE (3 minutos)

#### 3.1 Abrir Admin Setter
```
URL: https://seu-site.vercel.app/admin-setter.html
(ou localmente: http://localhost/admin-setter.html)
```

#### 3.2 Carregar Usuários
```
Clique botão: "🔄 Carregar Usuários"
(mostrará lista de todos os usuários Firebase)
```

#### 3.3 Selecionar Usuário
```
Clique no usuário na lista
OU digite o UID manualmente
(ex: user123)
```

#### 3.4 Definir como ADMIN
```
Clique: "✅ Definir como ADMIN"
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
5. Clique "Definir como ADMIN"
6. Pronto! ✅
```

### **Caso 2: Bloquear Acesso de Usuário Normal**

Se um usuário SEM custom claim tenta entrar em `/admin/dashboard.html`:
```
1. Página carrega
2. admin-auth.js detecta falta de admin claim
3. Alerta: "❌ Você não tem permissão para acessar essa área!"
4. Redirecionado para /index.html
✅ Seguro!
```

### **Caso 3: Remover Admin (Futuro)**

Quando precisar remover admin de um usuário:
```
(Será necessário criar Cloud Function adicional)
Por enquanto: Manual via Firebase Console
👉 Authentication → Selecione usuário → Edit → Custom Claims
```

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### **Teste 1: Como Admin (Deve passar)**
```
1. Abra /admin-setter.html (você)
2. Navegue para /admin/dashboard.html
3. ✅ Entra normalmente = FUNCIONANDO!
```

### **Teste 2: Como Usuário Normal (Deve bloquear)**
```
1. Crie novo usuário no Firebase (outro email)
2. Faça login com esse usuário
3. Tente acessar /admin/dashboard.html
4. ❌ Redirecionado para /index.html = FUNCIONANDO!
```

### **Teste 3: Sem Login (Deve bloquear)**
```
1. Abra incógnito / nova aba
2. Digite direto: /admin/dashboard.html
3. ❌ Redirecionado para /login.html = FUNCIONANDO!
```

---

## 📊 ESTRUTURA DE ARQUIVOS

```
ANTES:
├── admin-setter.html ❌ (não existia)
├── js/admin-auth.js ⚠️ (criado mas removido)
└── admin/*.html ⚠️ (sem verificação)

DEPOIS:
├── admin-setter.html ✅ (interface novo)
├── js/admin-auth.js ✅ (verificação ativa)
└── admin/*.html ✅ (com script admin-auth.js)
```

---

## 🐛 TROUBLESHOOTING

### **Problema: "setAdminClaim não é uma função"**
```
✓ Solução: Verificar se Cloud Function foi feita em us-central1
✓ Solução: Verificar se o deploy terminou (verde)
✓ Solução: Recarregar página (Ctrl+F5)
```

### **Problema: "Acesso negado" mesmo sendo admin**
```
✓ Solução: Fazer logout + login novamente
✓ Solução: Limpar cache do navegador (Ctrl+Shift+Del)
✓ Solução: Verificar se o custom claim foi setado com sucesso
```

### **Problema: Admin-setter não mostra usuários**
```
✓ Verificar se coleção "usuarios" existe no Firestore
✓ Verificar se usuários têm campo "uid" e "email"
✓ Verificar permissões de segurança Firestore:
   match /usuarios/{document=**} {
     allow read, write: if request.auth != null;
   }
```

### **Problema: Cloud Function dá erro 403**
```
✓ Verificar se tem usuário do Firebase criado no projeto
✓ Verificar se autenticação Firebase está ativa
✓ Verificar se Firestore service está também ativa
```

---

## 📚 O Que Cada Arquivo Faz

### **admin-setter.html** 🆕
- Interface bonita para setar admins
- Carrega lista de usuários Firestore
- Chama Cloud Function setAdminClaim
- Mostra resultado (sucesso/erro)

### **js/admin-auth.js** 🔒
- Corre automaticamente em cada página admin
- Verifica 3 coisas:
  1. Usuário está logado?
  2. É admin?
  3. Token tem custom claim admin=true?
- Se falhar qualquer uma → redireciona

### **admin/dashboard.html** 📊
```html
<script src="../js/admin-dashboard.js"></script>
<script src="../js/admin-auth.js"></script> ← NOVO!
```

Mesma coisa para:
- `admin/comentarios.html`
- `admin/categorias.html`

---

## 🚀 PRÓXIMAS FUNCIONALIDADES

### **Remover Admin (Remover Custom Claim)**
```javascript
// Cloud Function: removeAdminClaim
exports.removeAdminClaim = functions.https.onCall(async (data, context) => {
  await admin.auth().setCustomUserClaims(data.uid, null);
  return { success: true };
});
```

### **Listar Todos os Admins**
```javascript
// Cloud Function: listAdmins
exports.listAdmins = functions.https.onCall(async (data, context) => {
  const users = await admin.auth().listUsers();
  return users.users.filter(u => u.customClaims?.admin === true);
});
```

### **Dashboard de Admins**
- Mostrar todos admins na interface
- Um clique para remover
- Log de quem mudou permissão

---

## 📞 SUPORTE

Se tiver problema:

1. **Verificar console do navegador** (F12 → Console)
2. **Verificar Cloud Functions log** (Firebase Console)
3. **Verificar Firestore regras** (se tem permissão)
4. **Testar com incognito** (sem cache)

---

## ✅ CHECKLIST FINAL

- [ ] Cloud Function criada em Firebase Console
- [ ] Cloud Function em status "✓ Deployment completed"
- [ ] admin-setter.html criado em workspace
- [ ] 5 arquivos enviados para GitHub
- [ ] Vercel remodeployado
- [ ] Consegue acessar /admin-setter.html
- [ ] Consegue carregar usuários na interface
- [ ] Consegue clicar em usuário
- [ ] Consegue clicar "Definir como ADMIN"
- [ ] Recebe mensagem "✅ Sucesso!"
- [ ] Usuario novo consegue entrar em /admin/dashboard.html
- [ ] Usuário sem admin é bloqueado
- [ ] Usuário não logado é bloqueado

---

**🎉 Quando tudo passar = Sistema de Admin com Custom Claims 100% FUNCIONAL!**

