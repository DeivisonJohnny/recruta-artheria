import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "POST") {
    try {
      const { jobId, candidateIds } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          userId: (session.user as any).id,
        },
      });

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const whereClause: any = { jobId };

      if (candidateIds && candidateIds.length > 0) {
        whereClause.id = { in: candidateIds };
      }

      const jobCandidates = await prisma.jobCandidate.findMany({
        where: whereClause,
        include: {
          profile: true,
        },
      });

      if (jobCandidates.length === 0) {
        return res.status(400).json({ message: "No candidates found for this job" });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const results: any[] = [];

      for (const candidate of jobCandidates) {
        const profile = candidate.profile;

        // Formatar experiência detalhada
        const experienceList = Array.isArray(profile.experience)
          ? (profile.experience as any[]).map((exp: any) => {
              const title = exp.title || exp.position || "";
              const company = exp.company_name || exp.company || "";
              const duration = exp.duration || "";
              const description = exp.description || "";
              return `- ${title} @ ${company} (${duration})${description ? `: ${description}` : ""}`;
            }).join("\n")
          : "Não informado";

        // Formatar educação
        const educationList = Array.isArray(profile.education)
          ? (profile.education as any[]).map((edu: any) => {
              const degree = edu.degree || edu.field_of_study || "";
              const school = edu.school || edu.institution || "";
              return `- ${degree} - ${school}`;
            }).join("\n")
          : "Não informado";

        // Formatar skills
        const skills = Array.isArray(profile.skills)
          ? (profile.skills as string[]).join(", ")
          : "Não informado";

        // Formatar certificações
        const certifications = Array.isArray(profile.certifications)
          ? (profile.certifications as any[]).map((cert: any) => cert.name || cert).join(", ")
          : "Não informado";

        const prompt = `# IDENTIDADE E CONTEXTO
Você é um Consultor Especialista em Análise de Candidatos para Tecnologia da Informação, com expertise em:
- Avaliação técnica aprofundada (linguagens, frameworks, arquiteturas, metodologias)
- Análise de perfil comportamental e competências interpessoais
- Assessment de senioridade e maturidade profissional
- Mapeamento de fit técnico-cultural entre candidato e vaga

# OBJETIVO
Realizar análise multidimensional e criteriosa do candidato em relação aos requisitos da vaga.

# DADOS DA VAGA
- **Título**: ${job.title}
- **Descrição**: ${job.description}
- **Requisitos Obrigatórios**: ${job.requirements.join("; ")}
- **Tecnologias**: ${job.technologies.join(", ")}
- **Nível de Experiência**: ${job.experienceLevel || "Não especificado"}
- **Tipo de Contrato**: ${job.employmentType || "Não especificado"}
- **Localização**: ${job.location || "Não especificado"}
- **Faixa Salarial**: ${job.salaryRange || "Não especificado"}

# DADOS DO CANDIDATO
- **Nome**: ${profile.fullName || "Não informado"}
- **Cargo Atual**: ${profile.headline || "Não informado"}
- **Localização**: ${profile.location || "Não informado"}
- **Sobre**: ${profile.about || "Não informado"}

**Experiência Profissional**:
${experienceList}

**Formação Acadêmica**:
${educationList}

**Skills/Competências**: ${skills}

**Certificações**: ${certifications}

# INSTRUÇÕES
Analise o candidato seguindo a metodologia abaixo e retorne APENAS um JSON válido (sem markdown, sem código, apenas o JSON puro).

## METODOLOGIA DE CÁLCULO - REQUISITOS OBRIGATÓRIOS
- Atende Plenamente = 1.0 ponto
- Atende Parcialmente = 0.5 ponto
- Não Atende = 0.0 ponto
- **Percentual = [(Atendidos Plenamente × 1.0) + (Atendidos Parcialmente × 0.5)] / Total de Requisitos**

## CRITÉRIOS DE CLASSIFICAÇÃO
- ≥85%: ALTAMENTE RECOMENDADO (A)
- 70-84%: RECOMENDADO (B)
- 50-69%: RECOMENDADO COM RESSALVAS (C)
- <50%: NÃO RECOMENDADO (D)

# ESTRUTURA DO JSON DE RESPOSTA:
{
  "matchScore": <número de 0 a 100 baseado no cálculo de requisitos>,

  "sumario_executivo": {
    "perfil_profissional": "<área de atuação e especialização>",
    "tempo_experiencia": "<tempo total de experiência relevante>",
    "principal_stack": "<principais tecnologias>",
    "percentual_requisitos": <número 0-100>,
    "classificacao": "<A | B | C | D>",
    "recomendacao_previa": "<ALTAMENTE RECOMENDADO | RECOMENDADO | RECOMENDADO COM RESSALVAS | NÃO RECOMENDADO>"
  },

  "perfil_profissional": {
    "trajetoria": {
      "tempo_total": "<X anos>",
      "principais_empresas": ["<empresa 1>", "<empresa 2>"],
      "evolucao_carreira": "<análise da progressão>",
      "estabilidade": "<média de permanência e comentários>"
    },
    "formacao": {
      "graduacao": "<curso, instituição>",
      "pos_graduacao": "<se aplicável>",
      "certificacoes_relevantes": ["<cert 1>", "<cert 2>"],
      "avaliacao": "<adequação da formação>"
    },
    "stack_tecnologico": [
      {
        "tecnologia": "<nome>",
        "nivel": "<Básico | Intermediário | Avançado | Expert>",
        "tempo_uso": "<X anos>",
        "evidencia": "<onde demonstrou>"
      }
    ]
  },

  "analise_requisitos": {
    "total_requisitos": <número>,
    "atendidos_plenamente": <número>,
    "atendidos_parcialmente": <número>,
    "nao_atendidos": <número>,
    "percentual_atendimento": <número 0-100>,
    "elegivel": <true | false>,
    "requisitos_detalhados": [
      {
        "requisito": "<nome do requisito>",
        "status": "<ATENDE PLENAMENTE | ATENDE PARCIALMENTE | NÃO ATENDE>",
        "peso": <1.0 | 0.5 | 0.0>,
        "nivel_exigido": "<nível da vaga>",
        "nivel_apresentado": "<nível do candidato>",
        "evidencias": ["<evidência 1>", "<evidência 2>"],
        "comentario": "<análise qualitativa>"
      }
    ]
  },

  "analise_tecnica": {
    "score": <0-100>,
    "tecnologias_dominadas": ["<tech que domina e é requisito>"],
    "tecnologias_faltantes": ["<tech requisitada que não possui>"],
    "profundidade_tecnica": "<análise da profundidade técnica>",
    "justificativa": "<explicação detalhada>"
  },

  "analise_experiencia": {
    "score": <0-100>,
    "anos_relevantes": "<X anos>",
    "cargos_relevantes": [
      {
        "cargo": "<título>",
        "empresa": "<empresa>",
        "relevancia": "<por que é relevante>"
      }
    ],
    "complexidade_projetos": "<análise da complexidade>",
    "justificativa": "<explicação detalhada>"
  },

  "analise_comportamental": {
    "trabalho_equipe": {
      "nivel": "<Alto | Médio | Baixo | Não Identificado>",
      "evidencias": ["<evidência>"]
    },
    "lideranca": {
      "nivel": "<Alto | Médio | Baixo | Não Identificado>",
      "evidencias": ["<evidência>"]
    },
    "autonomia": {
      "nivel": "<Alto | Médio | Baixo | Não Identificado>",
      "evidencias": ["<evidência>"]
    },
    "comunicacao": {
      "nivel": "<Alto | Médio | Baixo | Não Identificado>",
      "evidencias": ["<evidência>"]
    },
    "resolucao_problemas": {
      "nivel": "<Alto | Médio | Baixo | Não Identificado>",
      "evidencias": ["<evidência>"]
    }
  },

  "analise_cultural": {
    "score": <0-100>,
    "estilo_trabalho": "<Startups | Corporações | Consultorias | Produto>",
    "metodologias": ["<Scrum>", "<Kanban>"],
    "fit_cultural": "<Alto | Médio-Alto | Médio | Baixo>",
    "aspectos_positivos": ["<aspecto 1>"],
    "pontos_atencao": ["<ponto 1>"],
    "justificativa": "<análise do fit cultural>"
  },

  "senioridade": {
    "nivel_identificado": "<Júnior | Pleno | Sênior | Especialista | Líder Técnico>",
    "nivel_requerido": "<conforme vaga>",
    "compatibilidade": "<Compatível | Acima do Esperado | Abaixo do Esperado>",
    "indicadores": {
      "decisoes_estrategicas": <true | false>,
      "visao_arquitetura": <true | false>,
      "influencia_tecnica": <true | false>,
      "gestao_pessoas": <true | false>
    },
    "justificativa": "<análise da senioridade>"
  },

  "scorecard": {
    "requisitos_tecnicos_obrigatorios": { "peso": 40, "nota": <0-10>, "pontuacao": <calculado> },
    "requisitos_tecnicos_desejaveis": { "peso": 15, "nota": <0-10>, "pontuacao": <calculado> },
    "experiencia_senioridade": { "peso": 20, "nota": <0-10>, "pontuacao": <calculado> },
    "competencias_comportamentais": { "peso": 15, "nota": <0-10>, "pontuacao": <calculado> },
    "formacao_certificacoes": { "peso": 10, "nota": <0-10>, "pontuacao": <calculado> },
    "pontuacao_total": <soma das pontuações / 10>
  },

  "pontos_fortes": [
    {
      "titulo": "<título do ponto forte>",
      "descricao": "<como se manifesta>",
      "relevancia": "<por que é valioso para a vaga>"
    }
  ],

  "gaps_riscos": {
    "gaps_tecnicos": [
      {
        "area": "<tecnologia/requisito>",
        "impacto": "<descrição do impacto>",
        "criticidade": "<Alta | Média | Baixa>"
      }
    ],
    "gaps_experiencia": ["<gap de experiência>"],
    "red_flags": ["<alerta identificado>"],
    "riscos_contratacao": ["<risco potencial>"]
  },

  "perguntas_entrevista": [
    {
      "pergunta": "<pergunta sugerida>",
      "objetivo": "<o que validar com essa pergunta>",
      "tipo": "<Técnica | Comportamental | Situacional>"
    }
  ],

  "recomendacao_final": {
    "classificacao": "<A | B | C | D>",
    "titulo": "<ALTAMENTE RECOMENDADO | RECOMENDADO | RECOMENDADO COM RESSALVAS | NÃO RECOMENDADO>",
    "percentual_requisitos": <número>,
    "elegivel": <true | false>,
    "justificativa_executiva": "<parágrafo de 8-12 linhas sintetizando a análise>",
    "proximos_passos": [
      {
        "acao": "<ação recomendada>",
        "prioridade": "<Alta | Média | Baixa>",
        "observacao": "<detalhes>"
      }
    ],
    "viabilidade_desenvolvimento": {
      "aplicavel": <true | false>,
      "potencial": "<Alto | Médio | Baixo>",
      "tempo_rampup": "<estimativa>",
      "investimento": "<treinamentos necessários>"
    }
  }
}`;

        try {
          const result = await model.generateContent(prompt);
          const response = result.response;
          const text = response.text();

          let jsonText = text.trim();
          if (jsonText.startsWith("```json")) {
            jsonText = jsonText.slice(7);
          } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.slice(3);
          }
          if (jsonText.endsWith("```")) {
            jsonText = jsonText.slice(0, -3);
          }
          jsonText = jsonText.trim();

          const analysis = JSON.parse(jsonText);

          // Salvar análise completa no banco
          await prisma.jobCandidate.update({
            where: { id: candidate.id },
            data: {
              matchScore: analysis.matchScore,
              aiAnalysis: JSON.stringify(analysis),
              status: "reviewed",
            },
          });

          results.push({
            candidateId: candidate.id,
            profileId: profile.id,
            linkedinId: profile.linkedinId,
            fullName: profile.fullName || profile.linkedinId,
            photoUrl: profile.photoUrl,
            headline: profile.headline,
            matchScore: analysis.matchScore,
            analysis,
          });
        } catch (parseError) {
          console.error(`Error analyzing candidate ${profile.fullName}:`, parseError);
          results.push({
            candidateId: candidate.id,
            profileId: profile.id,
            linkedinId: profile.linkedinId,
            fullName: profile.fullName || profile.linkedinId,
            photoUrl: profile.photoUrl,
            headline: profile.headline,
            matchScore: 0,
            analysis: null,
            error: "Erro ao analisar candidato",
          });
        }
      }

      results.sort((a, b) => b.matchScore - a.matchScore);

      return res.status(200).json({
        message: `Análise concluída para ${results.length} candidato(s)`,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          technologies: job.technologies,
          experienceLevel: job.experienceLevel,
          location: job.location,
        },
        results,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
