# Scraping com Puppeteer no LinkedIn

## 🎯 Implementação

A busca no LinkedIn agora usa **Puppeteer** diretamente, enquanto os detalhes dos perfis continuam usando **ScrapingDog API**.

### Por que essa abordagem?

- **Busca com Puppeteer**: Mais controle, sem custos de API, pode simular usuário real
- **Detalhes com ScrapingDog**: Mais rápido, estruturado, menos propenso a bloqueios

## 🚀 Como Funciona

### 1. Busca de Perfis (Puppeteer)

```javascript
// Fluxo simplificado
1. Abre navegador headless com Puppeteer
2. Configura stealth plugin (anti-detecção)
3. Navega para URL de busca do LinkedIn
4. Aguarda carregamento da página
5. Extrai dados dos cards de perfil
6. Retorna lista de perfis
7. Fecha navegador
```

### 2. Detalhes do Perfil (ScrapingDog)

```javascript
// Quando o usuário clica em "Ver Detalhes"
1. Verifica se perfil existe no cache (banco)
2. Se não existe, chama ScrapingDog API
3. Salva dados completos no banco
4. Retorna para o usuário
```

## 🔧 Configuração do Puppeteer

### Plugins Utilizados

- **puppeteer-extra**: Versão extendida com suporte a plugins
- **puppeteer-extra-plugin-stealth**: Evita detecção de bots

### Configurações do Navegador

```javascript
{
  headless: true,              // Sem interface gráfica
  args: [
    '--no-sandbox',            // Necessário para ambientes containerizados
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Evita problemas de memória
    '--disable-gpu',           // Desabilita GPU
    '--window-size=1920x1080'  // Tamanho da janela
  ]
}
```

### User Agent

Simula um Chrome real no Windows:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

## 📊 Seletores CSS Utilizados

O Puppeteer tenta múltiplos seletores para encontrar os perfis:

```css
/* Tentativas em ordem */
1. .entity-result
2. .reusable-search__result-container
3. [data-chameleon-result-urn]
4. .search-result
5. .artdeco-entity-lockup
```

### Extração de Dados

Para cada perfil encontrado:

```javascript
// Link do perfil
a[href*="/in/"]

// Nome
.entity-result__title-text
.artdeco-entity-lockup__title
[data-anonymize="person-name"]

// Headline (cargo)
.entity-result__primary-subtitle
.artdeco-entity-lockup__subtitle
[data-anonymize="job-title"]
```

## ⚡ Performance

### Tempo de Execução

- **Abertura do navegador**: ~2-3 segundos
- **Navegação para LinkedIn**: ~3-5 segundos
- **Extração de dados**: ~1-2 segundos
- **Total**: ~6-10 segundos por busca

### Otimizações

1. **Headless Mode**: Mais rápido sem interface gráfica
2. **networkidle2**: Aguarda rede estabilizar
3. **Timeout de 30s**: Evita travamentos
4. **Stealth Plugin**: Reduz chance de captcha

## 🛡️ Anti-Detecção

### Técnicas Implementadas

1. **Stealth Plugin**
   - Remove sinais de automação
   - Mascara propriedades do navegador
   - Simula comportamento humano

2. **User Agent Real**
   - Chrome atual no Windows
   - Headers consistentes

3. **Viewport Realista**
   - Resolução 1920x1080
   - Simula desktop real

### Limitações

- LinkedIn pode detectar após muitas requisições
- IP pode ser bloqueado temporariamente
- Captcha pode aparecer
- Necessário respeitar rate limiting

## ⚠️ Problemas Comuns

### 1. LinkedIn Bloqueia Acesso

**Sintoma**: Página de login ou captcha aparece

**Soluções**:
- Adicionar delays entre requisições
- Usar proxy rotativo
- Implementar sistema de contas alternadas
- Aguardar antes de tentar novamente

### 2. Seletores Não Encontram Perfis

**Sintoma**: Retorna 0 perfis, cai no fallback

**Causas**:
- LinkedIn mudou a estrutura HTML
- Página carregou diferente
- Anti-bot bloqueou conteúdo

**Solução**:
- Tirar screenshot para debug
- Atualizar seletores CSS
- Aumentar tempo de espera

### 3. Navegador Não Abre

**Sintoma**: Erro ao inicializar Puppeteer

**Causas**:
- Chromium não instalado
- Falta de permissões
- Memória insuficiente

**Solução**:
```bash
# Instalar dependências do sistema (Linux)
sudo apt-get install -y \
  chromium-browser \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0
```

### 4. Timeout

**Sintoma**: Erro após 30 segundos

**Causas**:
- LinkedIn lento
- Conexão instável
- Bloqueio

**Solução**:
- Aumentar timeout
- Verificar conexão
- Tentar em horário diferente

## 🐛 Debug

### Modo Visual (Headful)

Para ver o que está acontecendo:

```typescript
const browser = await puppeteer.default.launch({
  headless: false, // ← Mudar para false
  // ... resto das opções
});
```

### Screenshots

Adicionar antes de extrair dados:

```typescript
await page.screenshot({ path: 'debug.png' });
```

### Logs Detalhados

```typescript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', error => console.log('PAGE ERROR:', error));
```

## 📈 Monitoramento

### Logs Importantes

```bash
# Sucesso
🔍 Iniciando busca no LinkedIn com Puppeteer: [query]
🚀 Abrindo navegador...
🌐 Acessando LinkedIn: [url]
⏳ Aguardando carregamento da página...
✅ 15 perfis únicos encontrados!

# Fallback
⚠️ Nenhum perfil encontrado com Puppeteer, usando resultados mock

# Erro
❌ Erro ao acessar LinkedIn: [erro]
❌ Erro ao inicializar Puppeteer: [erro]
```

### Métricas a Monitorar

- Taxa de sucesso vs fallback
- Tempo médio de execução
- Número de perfis encontrados
- Erros e timeouts

## 🔐 Segurança e Legalidade

### ⚠️ Avisos Importantes

1. **Termos de Serviço**
   - Scraping viola os termos do LinkedIn
   - Use por sua conta e risco
   - Considere consequências legais

2. **LGPD/GDPR**
   - Dados pessoais requerem consentimento
   - Implementar políticas de privacidade
   - Permitir exclusão de dados

3. **Rate Limiting**
   - Não abuse: máximo 10-20 buscas/hora
   - Implemente cooldown entre buscas
   - Monitore bloqueios

### Alternativas Legais

1. **LinkedIn API Oficial**
   - Requer aprovação
   - Limitações de uso
   - Pago

2. **Parcerias**
   - LinkedIn Recruiter
   - LinkedIn Talent Solutions

## 🚀 Melhorias Futuras

### 1. Sistema de Filas

```typescript
import Queue from 'bull';

const searchQueue = new Queue('linkedin-search');

// Processar em background
searchQueue.process(async (job) => {
  return await searchLinkedInProfiles(job.data.query);
});
```

### 2. Pool de Navegadores

Reutilizar instâncias:

```typescript
class BrowserPool {
  private browsers: Browser[] = [];

  async getBrowser() {
    if (this.browsers.length === 0) {
      return await this.createBrowser();
    }
    return this.browsers.pop();
  }
}
```

### 3. Proxy Rotativo

Evitar bloqueios:

```typescript
const proxies = ['proxy1', 'proxy2', 'proxy3'];
const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];

await puppeteer.launch({
  args: [`--proxy-server=${randomProxy}`]
});
```

### 4. Login Automático

Para mais resultados:

```typescript
await page.goto('https://linkedin.com/login');
await page.type('#username', email);
await page.type('#password', password);
await page.click('[type="submit"]');
await page.waitForNavigation();
```

### 5. Infinite Scroll

Capturar mais perfis:

```typescript
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 100;
    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      totalHeight += distance;

      if (totalHeight >= document.body.scrollHeight) {
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
});
```

## 📝 Exemplo Completo

```typescript
// Busca: Puppeteer (grátis, lento)
const profiles = await searchLinkedInProfiles('Desenvolvedor React');
// Retorna: [{ linkedinId, linkedinUrl, fullName?, headline? }]

// Detalhes: ScrapingDog (pago, rápido, estruturado)
const details = await getProfileDetails('john-doe');
// Retorna: { experiências, educação, skills, etc }
```

## ✅ Checklist de Produção

- [ ] Rate limiting implementado (max 10 req/hora)
- [ ] Sistema de filas para processar em background
- [ ] Logs e monitoramento configurados
- [ ] Tratamento de erros robusto
- [ ] Fallback para dados mockados
- [ ] Cache de buscas recentes
- [ ] Documentação de privacidade
- [ ] Termos de uso claros
- [ ] Aviso de uso de scraping
- [ ] Proxy rotativo (opcional)
- [ ] Pool de navegadores (opcional)

## 🎯 Resultado

Agora você tem:
- ✅ Busca real no LinkedIn (sem custos de API)
- ✅ Detalhes estruturados via ScrapingDog
- ✅ Fallback automático para mock
- ✅ Anti-detecção básica
- ✅ Logs detalhados

**Teste agora fazendo uma busca na interface!** 🚀
