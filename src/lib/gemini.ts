import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

export async function analyzeCandidate(
  candidateProfile: any,
  jobDescription: string,
  jobRequirements: string[]
): Promise<{ analysis: string; score: number }> {
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
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text || '';

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
  const prompt = `
Você é um especialista em recrutamento de tecnologia.

Para uma vaga de ${jobTitle} que requer as seguintes tecnologias: ${technologies.join(', ')},
liste 10 requisitos importantes que deveriam ser considerados na descrição da vaga.

Forneça a resposta como uma lista simples, um requisito por linha, sem numeração ou marcadores.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text || '';

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

export interface ExtractedResumeData {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    technologies?: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
  }>;
  skills?: string[];
  languages?: Array<{
    language: string;
    proficiency?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

export async function extractResumeData(
  resumeContent: string,
  contentType: 'text' | 'pdf' = 'text'
): Promise<ExtractedResumeData> {
  const prompt = `
Você é um especialista em análise de currículos. Extraia e estruture as informações do currículo fornecido abaixo em formato JSON.

CRÍTICO:
- Retorne APENAS um objeto JSON válido, sem texto adicional antes ou depois
- O campo "fullName" é OBRIGATÓRIO e deve conter o nome completo do candidato
- Não deixe o campo "fullName" como null ou vazio
- Se não encontrar um nome explícito, procure no início do documento

Estrutura esperada do JSON:
{
  "fullName": "Nome completo do candidato (OBRIGATÓRIO - não pode ser null)",
  "email": "email@exemplo.com ou null",
  "phone": "telefone ou null",
  "location": "cidade, estado/país ou null",
  "summary": "resumo profissional ou objetivo ou null",
  "experience": [
    {
      "title": "cargo",
      "company": "empresa",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY ou null para atual",
      "current": false,
      "description": "descrição das responsabilidades",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "degree": "grau",
      "institution": "instituição",
      "field": "área de estudo",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY",
      "current": false
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "languages": [
    {
      "language": "idioma",
      "proficiency": "nível"
    }
  ],
  "certifications": [
    {
      "name": "nome da certificação",
      "issuer": "emissor",
      "date": "MM/YYYY"
    }
  ],
  "projects": [
    {
      "name": "nome do projeto",
      "description": "descrição",
      "technologies": ["tech1", "tech2"],
      "url": "url se disponível"
    }
  ],
  "linkedinUrl": "url do linkedin se disponível ou null",
  "portfolioUrl": "url do portfolio se disponível ou null",
  "githubUrl": "url do github se disponível ou null"
}

REGRAS IMPORTANTES:
1. O campo "fullName" NUNCA pode ser null ou vazio - procure o nome no topo do currículo
2. Se uma informação não estiver disponível, use null (exceto fullName)
3. Arrays vazios devem ser []
4. Extraia todas as tecnologias, frameworks e ferramentas mencionadas
5. Normalize as datas para o formato MM/YYYY quando possível
6. Identifique experiências atuais (current: true quando endDate for null ou "atual")
7. Retorne APENAS o JSON válido, SEM markdown code blocks, SEM explicações
8. Garanta que o JSON seja válido e possa ser parseado

Retorne agora o JSON com todas as informações extraídas, começando com { e terminando com }:`;

  try {
    let response;

    if (contentType === 'pdf') {
      // Para PDFs, enviar o arquivo diretamente para o Gemini
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: resumeContent, // base64
            },
          },
        ],
      });
    } else {
      // Para texto, incluir no prompt
      const fullPrompt = `${prompt}\n\nCURRÍCULO:\n${resumeContent}`;
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });
    }

    let text = (response.text || '').trim();

    console.log('=== Gemini Response (raw) ===');
    console.log(text);
    console.log('=== End of Gemini Response ===');

    // Remover markdown code blocks se houver
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse do JSON
    let extractedData: ExtractedResumeData;

    try {
      extractedData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Text that failed to parse:', text.substring(0, 500));
      throw new Error('Failed to parse JSON response from Gemini AI');
    }

    // Validação e normalização dos dados
    if (!extractedData.fullName || extractedData.fullName.trim() === '') {
      console.error('Extracted data:', JSON.stringify(extractedData, null, 2));

      // Tentar extrair nome do texto original como fallback (apenas para arquivos de texto)
      if (contentType === 'text') {
        const namePatterns = [
          /nome:\s*([^\n]+)/i,
          /name:\s*([^\n]+)/i,
          /candidato:\s*([^\n]+)/i,
          /^([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][a-zàáâãäåçèéêëìíîïñòóôõöùúûüý]+(?:\s+[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][a-zàáâãäåçèéêëìíîïñòóôõöùúûüý]+)+)/m
        ];

        let foundName: string | null = null;
        for (const pattern of namePatterns) {
          const match = resumeContent.match(pattern);
          if (match && match[1]) {
            foundName = match[1].trim();
            break;
          }
        }

        if (foundName) {
          console.log('Found name using fallback pattern:', foundName);
          extractedData.fullName = foundName;
        } else {
          throw new Error('Nome completo não encontrado no currículo. Verifique se o arquivo contém um nome válido.');
        }
      } else {
        // Para PDFs, não temos como fazer fallback, então só lançamos o erro
        throw new Error('Nome completo não encontrado no currículo PDF. Verifique se o arquivo contém um nome válido e legível.');
      }
    }

    // Garantir que arrays obrigatórios existam
    extractedData.experience = extractedData.experience || [];
    extractedData.education = extractedData.education || [];
    extractedData.skills = extractedData.skills || [];
    extractedData.languages = extractedData.languages || [];
    extractedData.certifications = extractedData.certifications || [];
    extractedData.projects = extractedData.projects || [];

    return extractedData;
  } catch (error) {
    console.error('Gemini AI error:', error);

    if (error instanceof Error && error.message.includes('Nome completo não encontrado')) {
      throw error;
    }

    throw new Error('Failed to extract resume data with Gemini AI: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
