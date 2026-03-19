# BRASFLIX — guia final de publicação

## 1) O que esta versão final assume
- **Sem Firebase Storage** no fluxo ativo.
- **Cloudinary** para avatar, thumbnail e vídeo.
- **Firebase Auth + Firestore** para identidade e dados.
- **Vercel** para front + rotas serverless em `api/`.

## 2) Variáveis na Vercel
Cadastre estas variáveis exatamente com estes nomes:

### Front-end
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` *(opcional se não usar Analytics)*
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

### Backend / Serverless
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `GEMINI_API_KEY` *(se usar Gemini)*
- `MISTRAL_API_KEY` *(se usar Mistral)*

## 3) Firebase Auth
Ative no Firebase Console:
- Email/senha
- Google

Depois adicione o domínio da Vercel em **Authorized domains** do Firebase Auth.

## 4) Firestore esperado
Coleções principais:
- `usuarios`
- `usuarios_publicos`
- `videos`
- `comentarios`
- `favoritos`
- `conversas`
- `mensagens`

Campos importantes:
- `usuarios/{uid}`: `uid`, `email`, `nome`, `role`, `avatar`, `faceLoginEnabled`
- `videos/{doc}`: `id`, `titulo`, `categoria`, `descricao`, `videoUrl`, `thumbnail`, `emAlta`, `topSemanal`, `views`, `likes`
- `comentarios/{doc}`: `videoId`, `userId`, `nomeAutor`, `texto`, `timestamp`

## 5) Como virar admin
1. Faça login uma vez para criar `usuarios/{uid}`.
2. No Firestore, altere `role` para `admin` no seu documento.
3. Faça logout e login.
4. Acesse `/admin/dashboard`.

## 6) Cloudinary
Preset sugerido:
- unsigned
- pasta base `brasflix`
- permitir imagens e vídeos

Fluxos usados no código:
- avatar: `brasflix/avatars`
- thumbs: `brasflix/thumbnails`
- vídeos: `brasflix/videos`

## 7) Índices
Se alguma consulta falhar por índice, crie pelo link que o próprio erro do Firestore mostrar no console.
Arquivo base incluso: `firestore.indexes.json`.

## 8) Regras
Use os arquivos:
- `firestore.rules`
- `storage.rules` *(somente modelo; Storage não é obrigatório nesta versão)*

## 9) Publicação na Vercel
- conecte o repositório GitHub
- framework preset: Vite
- build command: `npm run build`
- output directory: `dist`
- confirme que as variáveis estão em Production, Preview e Development quando fizer sentido

## 10) Pendências que ainda dependem de teste manual
- validar upload real de vídeo no Cloudinary com o preset da sua conta
- validar login Google no domínio final da Vercel
- validar login facial com câmera real e models carregando de `/models`
- validar índices necessários conforme o volume e as consultas do seu Firestore
