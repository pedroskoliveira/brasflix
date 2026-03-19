# RELATÓRIO FINAL V4 — BRASFLIX

## Feito nesta versão
- consolidação estrutural mantida
- fluxo ativo sem `getStorage()` no front
- `admin-sync-claims` agora recebe token do usuário
- `setup-admin.html` refeito para fluxo sem terminal
- `.env.example` adicionado
- guia final de publicação adicionado
- `vercel.json` atualizado com `cleanUrls` e `buildCommand`

## Decisão arquitetural desta entrega
- mídia: Cloudinary
- autenticação: Firebase Auth
- dados: Firestore
- serverless: Vercel `api/`
- sem dependência funcional de Firebase Storage na versão ativa

## O que revisar manualmente depois do deploy
- preset do Cloudinary
- Authorized domains do Firebase Auth
- regras do Firestore
- índices criados pelo console quando alguma query exigir
- contas admin com `role: admin`
