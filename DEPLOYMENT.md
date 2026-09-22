# Deployment Guide - Clube do Ingresso Painel

## Status ✅
- [x] Supabase project criado: `clube-do-ingresso-production`
- [x] GitHub repository criado: `OCMATOS/clube-do-ingresso-painel`
- [x] Código enviado para GitHub
- [x] GitHub Secrets configurados (parcialmente)
- [ ] Cloudflare Pages deployment configurado
- [ ] Go live!

## Credenciais Obtidas

### Supabase
- **Project URL:** `https://mhcatzwgocplvqjqhyfp.supabase.co`
- **Project ID:** `mhcatzwgocplvqjqhyfp`
- **Publishable Key:** `sb_publishable_4Gc9PyzRnj2ZHNKF6WsZhQ_VXwmDgMJ`
- **Service Role Key:** _(salvo em GitHub Secrets - não adicionar ao repositório)_
- **Region:** South America (São Paulo) - sa-east-1

### GitHub Secrets (Configure em https://github.com/OCMATOS/clube-do-ingresso-painel/settings/secrets/actions)

✅ **Já adicionado:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`

⏳ **Ainda precisa adicionar:**
- `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_4Gc9PyzRnj2ZHNKF6WsZhQ_VXwmDgMJ`
- `CLOUDFLARE_ACCOUNT_ID` = (obter em https://dash.cloudflare.com)
- `CLOUDFLARE_API_TOKEN` = (criar em Cloudflare)

## Próximos Passos

### 1. Obter Cloudflare Account ID
1. Acesse https://dash.cloudflare.com
2. Vá para "Account Overview" ou "Settings"
3. Copie o Account ID (32 caracteres hexadecimais)

### 2. Criar Cloudflare API Token
1. Acesse https://dash.cloudflare.com/profile/api-tokens
2. Clique em "Create Token"
3. Use o template "Edit Cloudflare Workers" ou customize com:
   - **Permissions:**
     - Account → Cloudflare Pages → Edit
     - Account → Workers Scripts → Edit
   - **Account Resources:** Seu account
4. Copie o token

### 3. Adicionar Secrets ao GitHub
1. Vá para https://github.com/OCMATOS/clube-do-ingresso-painel/settings/secrets/actions
2. Clique em "New repository secret" para cada um:
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

### 4. Fazer Push para Dispara o Deploy
```bash
cd painel-temp
git commit --allow-empty -m "Trigger Cloudflare Pages deployment"
git push origin main
```

### 5. Acompanhar o Deploy
- GitHub Actions: https://github.com/OCMATOS/clube-do-ingresso-painel/actions
- Cloudflare Pages: https://dash.cloudflare.com/pages

## URLs Finais
- **Painel ao vivo:** `https://clube-do-ingresso-painel.pages.dev`
- **GitHub:** https://github.com/OCMATOS/clube-do-ingresso-painel
- **Supabase:** https://supabase.com/project/mhcatzwgocplvqjqhyfp

---

**Nota:** O GitHub Actions workflow está pronto em `.github/workflows/deploy.yml`
