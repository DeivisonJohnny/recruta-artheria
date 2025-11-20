# Scraping do LinkedIn com ScrapingDog

## 📋 Visão Geral

A aplicação agora implementa scraping real de busca no LinkedIn usando a API do ScrapingDog. O sistema possui fallback automático para resultados mockados caso a API não esteja disponível ou configurada.

## 🔧 Como Funciona

### 1. Busca de Perfis

A busca funciona em três etapas:

1. **Construção da Query**
   - Combina profissão, localização, tecnologias e palavras-chave
   - Cria URL de busca do LinkedIn (`/search/results/people/`)

2. **Scraping com ScrapingDog**
   - Envia a URL para a API do ScrapingDog
   - Usa `dynamic=true` para carregar JavaScript
   - Recebe HTML completo da página de resultados

3. **Extração de Perfis**
   - Usa regex para encontrar links de perfis (`/in/username`)
   - Remove duplicatas
   - Retorna até 20 perfis únicos

### 2. Fallback Automático

O sistema possui fallback em múltiplos níveis:

- ❌ **Chave API não configurada** → Resultados mockados
- ❌ **Erro na requisição** → Resultados mockados
- ❌ **Nenhum perfil encontrado** → Resultados mockados
- ✅ **Sucesso** → Perfis reais do LinkedIn

## 🚀 Configuração

### Pré-requisitos

1. Conta ativa no ScrapingDog
2. Chave API válida
3. Créditos suficientes no plano

### Variáveis de Ambiente

No arquivo `.env`:

```env
SCRAPINGDOG_API_KEY="sua-chave-api-aqui"
```

### Custo por Pesquisa

- **Scraping dinâmico**: ~2-5 créditos por pesquisa
- **Plano gratuito**: 1.000 créditos/mês
- **Estimativa**: ~200-500 pesquisas/mês no plano gratuito

## 📊 Limitações

### Do LinkedIn

- LinkedIn pode bloquear IPs com muitas requisições
- A estrutura do HTML pode mudar (requer manutenção)
- Alguns perfis podem estar protegidos

### Do ScrapingDog

- Limite de requisições por minuto (depende do plano)
- Taxa de sucesso pode variar (70-90%)
- Tempo de resposta: 5-15 segundos por busca

### Da Implementação Atual

- Extração básica (apenas linkedinId e URL)
- Não captura nome completo ou headline na busca
- Limite de 20 resultados por pesquisa
- Regex pode não capturar todos os perfis

## 🔄 Fluxo Completo

```
Usuário faz busca
    ↓
Constrói query (profissão + local + tech)
    ↓
Envia para ScrapingDog API
    ↓
ScrapingDog faz scraping do LinkedIn
    ↓
Retorna HTML da página de resultados
    ↓
Extrai URLs de perfis com regex
    ↓
Salva perfis no banco (cache mínimo)
    ↓
Retorna resultados para o usuário
    ↓
Quando usuário clica em "Ver Detalhes"
    ↓
Busca perfil completo com ScrapingDog Profile API
    ↓
Salva dados completos no banco (cache)
```

## 🛠️ Melhorias Futuras

### 1. Parser de HTML Robusto
Usar biblioteca como `cheerio` ou `jsdom`:

```bash
npm install cheerio
```

```typescript
import * as cheerio from 'cheerio';

function extractProfilesFromHTML(html: string) {
  const $ = cheerio.load(html);
  const profiles = [];

  $('.entity-result__title-text a').each((i, elem) => {
    const url = $(elem).attr('href');
    const name = $(elem).text().trim();
    // ... extrair mais dados
  });

  return profiles;
}
```

### 2. Rate Limiting
Implementar controle de taxa de requisições:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 requisições por minuto
});
```

### 3. Fila de Processamento
Usar Redis + Bull para processar buscas em background:

```typescript
import Queue from 'bull';

const searchQueue = new Queue('linkedin-search');

searchQueue.process(async (job) => {
  return await searchLinkedInProfiles(job.data.query);
});
```

### 4. Cache de Buscas
Cachear resultados de buscas idênticas:

```typescript
const cacheKey = `search:${profession}:${location}:${tech}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// ... fazer busca
await redis.setex(cacheKey, 3600, JSON.stringify(results));
```

### 5. Retry Logic
Tentar novamente em caso de falha:

```typescript
async function searchWithRetry(query: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await searchLinkedInProfiles(query);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Backoff exponencial
    }
  }
}
```

## 🔐 Considerações de Segurança

1. **Não exponha a chave API** no frontend
2. **Rate limiting** para prevenir abuso
3. **Validação de input** para prevenir injection
4. **Logs de uso** para monitorar custos
5. **HTTPS obrigatório** em produção

## 📝 Logs e Monitoramento

O sistema já loga eventos importantes:

```
✅ ScrapingDog API key configurada
⚠️  Nenhum perfil encontrado, usando mock
❌ Erro na busca: [detalhes do erro]
```

Recomendações:
- Usar serviço de logging (Datadog, LogRocket)
- Alertas para taxa de erro > 50%
- Dashboard de uso e custos

## 🧪 Testando

Para testar o scraping real:

1. Configure a chave API no `.env`
2. Execute a aplicação: `npm run dev`
3. Faça uma busca na interface
4. Verifique os logs no terminal
5. Confira se retornou perfis reais ou mock

## 📞 Suporte

- **ScrapingDog Docs**: https://docs.scrapingdog.com/
- **LinkedIn Robots.txt**: https://www.linkedin.com/robots.txt
- **Termos de Uso**: Respeite sempre os termos do LinkedIn

## ⚖️ Conformidade Legal

**IMPORTANTE**:
- Web scraping pode violar termos de serviço
- Verifique legalidade na sua jurisdição
- Use apenas para fins legítimos
- Respeite privacidade dos usuários
- Considere usar API oficial do LinkedIn (requer aprovação)
