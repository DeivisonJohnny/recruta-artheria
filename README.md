# Recruta Artheria

Plataforma SaaS para recrutamento inteligente de candidatos via LinkedIn com análise por IA.

## 🚀 Tecnologias

- **Frontend**: Next.js 16 (Pages Router), React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: NextAuth.js
- **APIs Externas**:
  - ScrapingDog (para scraping de perfis do LinkedIn)
  - Google Gemini AI (para análise de candidatos)

## 📋 Funcionalidades

### Implementadas

1. **Autenticação**
   - Sistema de login e registro com email/senha
   - Sessões seguras com NextAuth.js
   - Proteção de rotas autenticadas

2. **Pesquisa de Candidatos**
   - Busca de perfis no LinkedIn por:
     - Profissão
     - Localização
     - Tecnologias
     - Palavras-chave
   - Resultados salvos no banco de dados
   - Histórico de pesquisas

3. **Detalhes de Perfil**
   - Integração com ScrapingDog API
   - Cache automático no banco de dados (economia de API)
   - Exibição completa de:
     - Informações básicas
     - Experiências profissionais
     - Educação
     - Habilidades
     - Certificações

4. **Gerenciamento de Vagas**
   - Criação de vagas
   - Listagem de vagas
   - Associação de candidatos a vagas

5. **Análise com IA (Setup)**
   - Biblioteca preparada para análise de candidatos com Gemini AI
   - Função para calcular score de compatibilidade
   - Geração de sugestões de requisitos

## 🔧 Configuração

### Pré-requisitos

- Node.js 20+
- PostgreSQL
- Conta ScrapingDog (para scraping do LinkedIn)
- Chave API do Google Gemini (opcional, para análise IA)

### Variáveis de Ambiente

O arquivo `.env` já está configurado com:

```env
# Database
DATABASE_URL="postgresql://postgres:devpcdigital@localhost:5432/recruta_artheria"

# Session
SESSION_SECRET="your-secret-key-change-this-in-production-minimum-32-characters-long"

# ScrapingDog API
SCRAPINGDOG_API_KEY="691e07e9ae2b1f511a20af8e"

# Gemini API (para análise de candidatos)
GEMINI_API_KEY="your-gemini-api-key-here"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**⚠️ IMPORTANTE**: Altere o `SESSION_SECRET` e `GEMINI_API_KEY` para valores reais.

### Instalação

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Criar tabelas no banco (já foi executado)
npx prisma db push

# Criar usuário admin (já foi executado)
npm run seed

# Executar em modo desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

### 👤 Credenciais do Admin

Após executar o seed, você pode fazer login com:
- **Email**: `admin@recrutaartheria.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

## 📁 Estrutura do Projeto

```
src/
├── components/
│   └── Layout.tsx              # Layout principal com sidebar
├── lib/
│   ├── prisma.ts               # Cliente Prisma
│   └── gemini.ts               # Funções do Gemini AI
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth].ts   # Configuração NextAuth
│   │   │   └── signup.ts          # Registro de usuários
│   │   ├── jobs/
│   │   │   └── index.ts           # CRUD de vagas
│   │   ├── linkedin/
│   │   │   ├── search.ts          # Busca de perfis
│   │   │   └── profile/[id].ts    # Detalhes do perfil
│   │   └── searches/
│   │       └── index.ts           # Histórico de pesquisas
│   ├── auth/
│   │   ├── signin.tsx             # Página de login
│   │   └── signup.tsx             # Página de registro
│   ├── candidates/
│   │   ├── search.tsx             # Buscar candidatos
│   │   └── [linkedinId].tsx       # Detalhes do candidato
│   ├── jobs/
│   │   ├── index.tsx              # Lista de vagas
│   │   └── create.tsx             # Criar vaga
│   ├── dashboard.tsx              # Dashboard principal
│   ├── searches.tsx               # Histórico de pesquisas
│   └── index.tsx                  # Página inicial (redirect)
└── styles/
    └── globals.css                # Estilos globais
```

## 🗃️ Modelos do Banco de Dados

### User
Usuários da plataforma

### LinkedInProfile
Perfis do LinkedIn (com cache)

### Search
Pesquisas realizadas pelos usuários

### SearchResult
Resultados de cada pesquisa

### Job
Vagas criadas pelos usuários

### JobCandidate
Candidatos associados a vagas (com análise IA)

## 🔐 Segurança

- Senhas criptografadas com bcrypt
- Sessões JWT seguras
- Proteção de rotas via middleware
- Validação de dados no backend

## 🎨 Design

Interface minimalista e intuitiva com:
- Sidebar de navegação
- Cards informativos
- Cores neutras e profissionais
- Feedback visual em todas as ações

## 🚧 Próximos Passos

1. **Implementar busca real no LinkedIn**
   - Atualmente usa dados mockados
   - Integrar com API oficial ou scraping autorizado

2. **Completar integração com Gemini AI**
   - Endpoint de análise de candidatos
   - Interface para visualizar análises
   - Ranking automático de candidatos

3. **Dashboard com estatísticas**
   - Gráficos de uso
   - Métricas de conversão
   - Candidatos mais relevantes

4. **Recursos adicionais**
   - Exportação de resultados (PDF, CSV)
   - Notificações por email
   - Sistema de notas e comentários
   - Compartilhamento de vagas

## 📝 Notas Importantes

### Sobre o ScrapingDog

A API do ScrapingDog permite fazer scraping do LinkedIn de forma legal e estruturada. Certifique-se de:
- Ter uma conta ativa no ScrapingDog
- Respeitar os limites de requisições do seu plano
- Verificar a documentação em: https://docs.scrapingdog.com/

### Sobre a Busca no LinkedIn

A implementação atual usa resultados mockados para demonstração. Para produção, você precisará:
1. Usar a API oficial do LinkedIn (requer aprovação)
2. Usar uma ferramenta de scraping autorizada
3. Implementar sua própria solução de coleta de dados

### Cache de Perfis

O sistema implementa cache automático de perfis do LinkedIn no banco de dados. Isso:
- Economiza chamadas à API do ScrapingDog
- Melhora a performance
- Reduz custos operacionais
- Mantém dados atualizados conforme necessário

## 📄 Licença

Este é um projeto privado. Todos os direitos reservados.
