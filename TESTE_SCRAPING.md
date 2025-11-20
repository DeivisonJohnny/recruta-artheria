# Como Testar o Scraping Real do LinkedIn

## ✅ Implementação Concluída

A busca real no LinkedIn via ScrapingDog API foi implementada com sucesso!

## 🔧 Configuração

### 1. Verifique a Chave API

No arquivo `.env`, certifique-se que a chave está configurada:

```env
SCRAPINGDOG_API_KEY="691e07e9ae2b1f511a20af8e"
```

### 2. Execute a Aplicação

```bash
npm run dev
```

## 🧪 Testando a Busca

### Passo 1: Faça Login

1. Acesse `http://localhost:3000`
2. Faça login com:
   - **Email**: `admin@recrutaartheria.com`
   - **Senha**: `admin123`

### Passo 2: Acesse a Busca

1. No dashboard, clique em **"Pesquisar Candidatos"**
2. Ou acesse diretamente: `http://localhost:3000/candidates/search`

### Passo 3: Faça uma Busca

Preencha o formulário:
- **Título**: `Desenvolvedores React em BH`
- **Profissão**: `Desenvolvedor`
- **Localização**: `Belo Horizonte`
- **Tecnologias**: `React, Node.js, TypeScript`
- **Palavras-chave**: `Senior, Full Stack`

Clique em **"Pesquisar"**

### Passo 4: Verifique os Logs

No terminal onde está rodando `npm run dev`, você verá:

```
🔍 Buscando perfis no LinkedIn: Desenvolvedor Belo Horizonte React Node.js TypeScript Senior Full Stack
📡 Chamando ScrapingDog API...
✅ Resposta recebida da API
✅ 15 perfis encontrados!
```

Ou, se houver fallback:

```
⚠️ Nenhum perfil encontrado, usando resultados mock
```

## 📊 Como Funciona

### Endpoint Utilizado

```
https://api.scrapingdog.com/linkedin/?api_key=KEY&type=search&linkId=QUERY
```

### Fluxo de Dados

1. **Construção da Query**: Combina profissão + local + tecnologias
2. **Chamada à API**: Envia para ScrapingDog LinkedIn Search
3. **Processamento da Resposta**: Extrai perfis do JSON retornado
4. **Fallback Inteligente**: Se falhar, usa dados mockados
5. **Salvamento no Banco**: Perfis são salvos para cache

### Estrutura da Resposta Esperada

A API pode retornar em vários formatos:

```json
{
  "results": [
    {
      "linkedinId": "joao-silva",
      "name": "João Silva",
      "headline": "Desenvolvedor Full Stack",
      "url": "https://www.linkedin.com/in/joao-silva"
    }
  ]
}
```

Ou diretamente um array:

```json
[
  {
    "id": "maria-santos",
    "fullName": "Maria Santos",
    "title": "Senior Developer",
    "link": "https://www.linkedin.com/in/maria-santos"
  }
]
```

## 🔍 Verificando se Está Funcionando

### Resultados Reais vs Mock

**Dados Mockados (fallback)**:
- Sempre 5-10 resultados
- Nomes sempre iguais: `joao-silva-dev`, `maria-santos-tech`, etc.
- Sem variação entre buscas

**Dados Reais (API)**:
- Quantidade variável (1-25 perfis)
- Nomes reais extraídos do LinkedIn
- Resultados diferentes para cada busca
- Logs específicos no terminal

### Logs de Sucesso

```
🔍 Buscando perfis no LinkedIn: [sua query]
📡 Chamando ScrapingDog API...
✅ Resposta recebida da API
✅ [número] perfis encontrados!
```

### Logs de Fallback

```
❌ ScrapingDog API key not configured
```
ou
```
❌ ScrapingDog API error: 402 Payment Required
```
ou
```
⚠️ Nenhum perfil encontrado, usando resultados mock
```

## 🐛 Resolução de Problemas

### Problema 1: Sempre Retorna Dados Mockados

**Possíveis causas**:
1. Chave API inválida ou expirada
2. Sem créditos no ScrapingDog
3. Endpoint da API mudou
4. Resposta da API em formato inesperado

**Solução**:
1. Verifique a chave API no `.env`
2. Acesse https://www.scrapingdog.com/dashboard
3. Verifique créditos disponíveis
4. Veja os logs detalhados no terminal

### Problema 2: Erro 402 Payment Required

**Causa**: Sem créditos no plano ScrapingDog

**Solução**:
1. Faça upgrade do plano
2. Ou aguarde reset mensal de créditos

### Problema 3: Tempo de Resposta Alto

**Normal**: 5-15 segundos por busca (scraping é lento)

**Se > 30 segundos**:
1. Verifique sua conexão
2. Teste novamente em horário diferente
3. LinkedIn pode estar bloqueando o ScrapingDog

### Problema 4: Perfis Duplicados

**Causa**: Mesmos usuários aparecem em várias buscas

**Isso é esperado**: O sistema remove duplicatas dentro da mesma busca

## 📈 Monitoramento de Uso

### Ver Créditos Restantes

Acesse: https://www.scrapingdog.com/dashboard

### Custos Típicos

- **Busca no LinkedIn**: ~3-5 créditos
- **Perfil detalhado**: ~2-3 créditos
- **Plano gratuito**: 1.000 créditos/mês
- **Estimativa**: ~150-250 buscas/mês

## 🎯 Próximos Passos

### Melhorias Futuras

1. **Cache de Buscas**
   - Salvar resultados de buscas idênticas
   - Economizar créditos da API

2. **Parser Mais Robusto**
   - Extrair mais dados (foto, localização)
   - Melhor tratamento de erros

3. **Rate Limiting**
   - Limitar buscas por usuário
   - Prevenir abuso da API

4. **Busca Assíncrona**
   - Processar buscas em background
   - Notificar quando terminar

## ⚠️ Avisos Importantes

1. **Respeite os Termos de Serviço**
   - Do LinkedIn
   - Do ScrapingDog
   - Leis de privacidade (LGPD/GDPR)

2. **Use com Moderação**
   - Scraping consome créditos
   - Não faça buscas desnecessárias
   - Implemente cache

3. **Não Abuse**
   - Rate limiting é necessário
   - Muito uso pode levar a bloqueio
   - Considere planos pagos para alto volume

## 📝 Exemplo de Busca Completa

```bash
# Terminal - Logs do servidor
🔍 Buscando perfis no LinkedIn: Desenvolvedor React Belo Horizonte
📡 Chamando ScrapingDog API...
✅ Resposta recebida da API
✅ 18 perfis encontrados!
```

```json
// Resposta para o frontend
{
  "searchId": "clx...",
  "results": [
    {
      "linkedinId": "carlos-ferreira-dev",
      "linkedinUrl": "https://www.linkedin.com/in/carlos-ferreira-dev"
    },
    {
      "linkedinId": "ana-silva-tech",
      "linkedinUrl": "https://www.linkedin.com/in/ana-silva-tech"
    }
    // ... até 25 perfis
  ]
}
```

## ✅ Checklist de Teste

- [ ] Chave API configurada no `.env`
- [ ] Aplicação rodando (`npm run dev`)
- [ ] Login funcionando
- [ ] Formulário de busca preenchido
- [ ] Busca executada
- [ ] Logs aparecem no terminal
- [ ] Resultados retornam na interface
- [ ] Perfis diferentes dos mockados
- [ ] Resultados salvos no banco
- [ ] Cache funcionando (segunda busca mais rápida)

Se todos os itens estiverem ✅, o scraping real está funcionando perfeitamente! 🎉
