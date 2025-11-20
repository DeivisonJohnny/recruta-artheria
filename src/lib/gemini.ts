import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar o cliente do Gemini AI
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function analyzeCandidate(
  candidateProfile: any,
  jobDescription: string,
  jobRequirements: string[]
): Promise<{ analysis: string; score: number }> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
Você é um especialista em recrutamento e seleção de candidatos.

Analise o perfil do candidato abaixo em relação à vaga fornecida e forneça:
1. Uma análise detalhada da compatibilidade do candidato com a vaga
2. Pontos fortes do candidato para esta posição
3. Possíveis gaps ou áreas de desenvolvimento
4. Uma pontuação de compatibilidade de 0 a 100

**PERFIL DO CANDIDATO:**
Nome: ${candidateProfile.fullName || 'Não informado'}
Headline: ${candidateProfile.headline || 'Não informado'}
Localização: ${candidateProfile.location || 'Não informado'}
Sobre: ${candidateProfile.about || 'Não informado'}
Experiências: ${JSON.stringify(candidateProfile.experience || [])}
Educação: ${JSON.stringify(candidateProfile.education || [])}
Habilidades: ${JSON.stringify(candidateProfile.skills || [])}

**DESCRIÇÃO DA VAGA:**
${jobDescription}

**REQUISITOS DA VAGA:**
${jobRequirements.join('\n')}

Forneça sua análise em formato estruturado, começando com a pontuação.
Formato: SCORE: [número] seguido da análise detalhada.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extrair o score da resposta
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    // Remover a linha do score da análise
    const analysis = text.replace(/SCORE:\s*\d+/i, '').trim();

    return {
      analysis,
      score: Math.min(100, Math.max(0, score)), // Garantir que está entre 0 e 100
    };
  } catch (error) {
    console.error('Gemini AI error:', error);
    throw new Error('Failed to analyze candidate with Gemini AI');
  }
}

export async function generateJobSuggestions(
  jobTitle: string,
  technologies: string[]
): Promise<string[]> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
Você é um especialista em recrutamento de tecnologia.

Para uma vaga de ${jobTitle} que requer as seguintes tecnologias: ${technologies.join(', ')},
liste 10 requisitos importantes que deveriam ser considerados na descrição da vaga.

Forneça a resposta como uma lista simples, um requisito por linha, sem numeração ou marcadores.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Dividir em linhas e limpar
    const suggestions = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^\d+\./) && !line.match(/^[-*]/))
      .slice(0, 10);

    return suggestions;
  } catch (error) {
    console.error('Gemini AI error:', error);
    return [];
  }
}
