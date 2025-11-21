# LinkedIn Scraping com Sessão Persistente

Este projeto implementa um sistema de scraping do LinkedIn que **reutiliza a mesma sessão do navegador** entre múltiplas requisições, evitando logins repetidos.

## Como Funciona

### BrowserManager (Singleton Pattern)

O [BrowserManager](src/utils/browserManager.ts) é responsável por:

1. **Criar uma única instância do navegador** que é compartilhada entre todas as requisições
2. **Verificar se já está logado** antes de fazer login novamente
3. **Manter a sessão ativa** por até 30 minutos de inatividade
4. **Fechar automaticamente** após timeout de inatividade

### Fluxo de Execução

```
┌─────────────────────────────────────────────────────────┐
│  Primeira Requisição                                     │
│  ──────────────────────────────────────────────────────  │
│  1. BrowserManager cria novo navegador                   │
│  2. Faz login no LinkedIn                                │
│  3. Executa a pesquisa                                   │
│  4. Mantém navegador aberto                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Próximas Requisições (em até 30 minutos)               │
│  ──────────────────────────────────────────────────────  │
│  1. BrowserManager reutiliza navegador existente         │
│  2. Verifica se ainda está logado (pula login!)          │
│  3. Executa a pesquisa                                   │
│  4. Mantém navegador aberto                              │
└─────────────────────────────────────────────────────────┘
```

## Configuração

### 1. Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```bash
# LinkedIn Credentials
LINKEDIN_EMAIL="seu-email@exemplo.com"
LINKEDIN_PASSWORD="sua-senha-linkedin"
```

⚠️ **IMPORTANTE**: Use uma conta dedicada para scraping, não sua conta pessoal!

### 2. Instalação de Dependências

As dependências necessárias já devem estar instaladas:

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

## Uso

### Exemplo 1: API Endpoint

```typescript
// src/pages/api/linkedin/scrape.ts
import { LinkedInScraper } from "@/utils/linkedinUtil";

const scraper = new LinkedInScraper();
await scraper.initialize();

// Verifica se já está logado
const isLoggedIn = await scraper.isLoggedIn();

if (!isLoggedIn) {
  // Só faz login se necessário
  await scraper.login(email, password);
}

// Executa a pesquisa
const profiles = await scraper.searchProfiles({
  keyword: "React Developer",
  location: "São Paulo",
  maxResults: 10,
});

// ❌ NÃO FECHE O NAVEGADOR!
// scraper.close(); // Isso vai fechar para todas as requisições
```

### Exemplo 2: Teste Direto

```bash
# Teste a API
curl -X POST http://localhost:3000/api/linkedin/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Frontend Developer",
    "location": "Rio de Janeiro",
    "maxResults": 5
  }'
```

## Métodos Disponíveis

### LinkedInScraper

```typescript
// Inicializa o scraper (obtém navegador compartilhado)
await scraper.initialize();

// Faz login (verifica se já está logado primeiro)
await scraper.login(email, password);

// Verifica se está logado
const isLoggedIn = await scraper.isLoggedIn();

// Força novo login (útil se sessão expirar)
await scraper.forceRelogin(email, password);

// Busca perfis
const profiles = await scraper.searchProfiles({
  keyword: "DevOps Engineer",
  location: "Brasil",
  maxResults: 20,
});
```

### BrowserManager

```typescript
import BrowserManager from "@/utils/browserManager";

// Obter instância do navegador
const { browser, page } = await BrowserManager.getInstance();

// Obter apenas a página
const page = await BrowserManager.getPage();

// Fazer login
await BrowserManager.login(email, password);

// Verificar login
const isLoggedIn = await BrowserManager.isLoggedIn();

// Forçar novo login
await BrowserManager.forceRelogin(email, password);

// Fechar navegador manualmente (não recomendado durante operação normal)
await BrowserManager.close();
```

## Benefícios

✅ **Performance**: Login acontece apenas uma vez
✅ **Eficiência**: Reutiliza a mesma sessão do navegador
✅ **Automático**: Fecha navegador após 30 minutos de inatividade
✅ **Seguro**: Verifica se sessão ainda está válida antes de usar

## Considerações Importantes

### ⚠️ Limitações do LinkedIn

1. **Rate Limiting**: O LinkedIn pode bloquear requisições excessivas
2. **Captcha**: Pode solicitar verificação humana
3. **Termos de Uso**: Scraping pode violar os termos do LinkedIn
4. **Conta Dedicada**: Use sempre uma conta separada para scraping

### 🔒 Segurança

1. **Nunca commite credenciais** no código
2. **Use variáveis de ambiente** para credenciais
3. **Monitore logs** para detectar bloqueios
4. **Implemente rate limiting** nas suas requisições

### 🐛 Troubleshooting

**Navegador não abre:**
- Certifique-se que as dependências do Puppeteer estão instaladas
- Em produção, use `headless: true`

**Login falha:**
- Verifique as credenciais no `.env`
- LinkedIn pode exigir verificação de 2 fatores
- Tente fazer login manual no navegador que abre

**Sessão expira:**
- Use `scraper.forceRelogin()` para renovar
- Ajuste o timeout em `BrowserManager.TIMEOUT`

**Nenhum perfil encontrado:**
- LinkedIn mudou a estrutura HTML
- Verifique o arquivo `debug_linkedin_dump.html` gerado
- Atualize os seletores CSS no código

## Exemplo Completo

```typescript
import { LinkedInScraper } from "@/utils/linkedinUtil";
import BrowserManager from "@/utils/browserManager";

async function searchMultipleTimes() {
  const scraper = new LinkedInScraper();
  await scraper.initialize();

  // Primeira busca - faz login
  console.log("🔍 Primeira busca...");
  await scraper.login(
    process.env.LINKEDIN_EMAIL!,
    process.env.LINKEDIN_PASSWORD!
  );

  const results1 = await scraper.searchProfiles({
    keyword: "React Developer",
    maxResults: 5,
  });
  console.log(`✅ Encontrados ${results1.length} perfis`);

  // Segunda busca - reutiliza sessão (SEM LOGIN!)
  console.log("\n🔍 Segunda busca (sem login)...");
  const results2 = await scraper.searchProfiles({
    keyword: "Node.js Developer",
    maxResults: 5,
  });
  console.log(`✅ Encontrados ${results2.length} perfis`);

  // Terceira busca - reutiliza sessão (SEM LOGIN!)
  console.log("\n🔍 Terceira busca (sem login)...");
  const results3 = await scraper.searchProfiles({
    keyword: "DevOps Engineer",
    maxResults: 5,
  });
  console.log(`✅ Encontrados ${results3.length} perfis`);

  // Fechar navegador quando terminar TODAS as operações
  await BrowserManager.close();
}
```

## Estrutura de Arquivos

```
src/
├── utils/
│   ├── browserManager.ts      # Gerenciador singleton do navegador
│   └── linkedinUtil.ts         # Scraper do LinkedIn
├── pages/
│   └── api/
│       └── linkedin/
│           ├── scrape.ts       # Endpoint de scraping
│           └── search.ts       # Endpoint existente
└── types/
    └── linkedinScraperType.ts  # Tipos TypeScript
```

## Próximos Passos

- [ ] Implementar cache de resultados
- [ ] Adicionar retry automático em caso de falha
- [ ] Implementar fila de requisições para rate limiting
- [ ] Salvar cookies de sessão para persistir entre reinícios
- [ ] Adicionar métricas de performance
