import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import {
  Brain,
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Code,
  Users,
  Target,
  TrendingUp,
  Shield,
  MessageSquare,
  Lightbulb,
  Clock,
  Award,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
} from "lucide-react";

interface Analysis {
  matchScore: number;
  sumario_executivo: {
    perfil_profissional: string;
    tempo_experiencia: string;
    principal_stack: string;
    percentual_requisitos: number;
    classificacao: string;
    recomendacao_previa: string;
  };
  perfil_profissional: {
    trajetoria: {
      tempo_total: string;
      principais_empresas: string[];
      evolucao_carreira: string;
      estabilidade: string;
    };
    formacao: {
      graduacao: string;
      pos_graduacao: string;
      certificacoes_relevantes: string[];
      avaliacao: string;
    };
    stack_tecnologico: Array<{
      tecnologia: string;
      nivel: string;
      tempo_uso: string;
      evidencia: string;
    }>;
  };
  analise_requisitos: {
    total_requisitos: number;
    atendidos_plenamente: number;
    atendidos_parcialmente: number;
    nao_atendidos: number;
    percentual_atendimento: number;
    elegivel: boolean;
    requisitos_detalhados: Array<{
      requisito: string;
      status: string;
      peso: number;
      nivel_exigido: string;
      nivel_apresentado: string;
      evidencias: string[];
      comentario: string;
    }>;
  };
  analise_tecnica: {
    score: number;
    tecnologias_dominadas: string[];
    tecnologias_faltantes: string[];
    profundidade_tecnica: string;
    justificativa: string;
  };
  analise_experiencia: {
    score: number;
    anos_relevantes: string;
    cargos_relevantes: Array<{
      cargo: string;
      empresa: string;
      relevancia: string;
    }>;
    complexidade_projetos: string;
    justificativa: string;
  };
  analise_comportamental: {
    trabalho_equipe: { nivel: string; evidencias: string[] };
    lideranca: { nivel: string; evidencias: string[] };
    autonomia: { nivel: string; evidencias: string[] };
    comunicacao: { nivel: string; evidencias: string[] };
    resolucao_problemas: { nivel: string; evidencias: string[] };
  };
  analise_cultural: {
    score: number;
    estilo_trabalho: string;
    metodologias: string[];
    fit_cultural: string;
    aspectos_positivos: string[];
    pontos_atencao: string[];
    justificativa: string;
  };
  senioridade: {
    nivel_identificado: string;
    nivel_requerido: string;
    compatibilidade: string;
    indicadores: {
      decisoes_estrategicas: boolean;
      visao_arquitetura: boolean;
      influencia_tecnica: boolean;
      gestao_pessoas: boolean;
    };
    justificativa: string;
  };
  scorecard: {
    requisitos_tecnicos_obrigatorios: { peso: number; nota: number; pontuacao: number };
    requisitos_tecnicos_desejaveis: { peso: number; nota: number; pontuacao: number };
    experiencia_senioridade: { peso: number; nota: number; pontuacao: number };
    competencias_comportamentais: { peso: number; nota: number; pontuacao: number };
    formacao_certificacoes: { peso: number; nota: number; pontuacao: number };
    pontuacao_total: number;
  };
  pontos_fortes: Array<{
    titulo: string;
    descricao: string;
    relevancia: string;
  }>;
  gaps_riscos: {
    gaps_tecnicos: Array<{
      area: string;
      impacto: string;
      criticidade: string;
    }>;
    gaps_experiencia: string[];
    red_flags: string[];
    riscos_contratacao: string[];
  };
  perguntas_entrevista: Array<{
    pergunta: string;
    objetivo: string;
    tipo: string;
  }>;
  recomendacao_final: {
    classificacao: string;
    titulo: string;
    percentual_requisitos: number;
    elegivel: boolean;
    justificativa_executiva: string;
    proximos_passos: Array<{
      acao: string;
      prioridade: string;
      observacao: string;
    }>;
    viabilidade_desenvolvimento: {
      aplicavel: boolean;
      potencial: string;
      tempo_rampup: string;
      investimento: string;
    };
  };
}

interface JobCandidate {
  id: string;
  matchScore: number | null;
  aiAnalysis: string | null;
  status: string;
  profile: {
    id: string;
    linkedinId: string;
    fullName: string | null;
    headline: string | null;
    location: string | null;
    photoUrl: string | null;
  };
  job: {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    technologies: string[];
    experienceLevel: string | null;
    location: string | null;
  };
}

export default function AnalysisDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { candidateId } = router.query;

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<JobCandidate | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["sumario", "requisitos", "recomendacao"])
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && candidateId) {
      fetchCandidateAnalysis();
    }
  }, [session, candidateId]);

  const fetchCandidateAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recrutaia/analysis/${candidateId}`);
      if (response.ok) {
        const data = await response.json();
        setCandidate(data.candidate);
        if (data.candidate.aiAnalysis) {
          setAnalysis(JSON.parse(data.candidate.aiAnalysis));
        }
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getClassificacaoColor = (classificacao: string) => {
    switch (classificacao) {
      case "A":
        return "bg-emerald-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getClassificacaoTextColor = (classificacao: string) => {
    switch (classificacao) {
      case "A":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "B":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "C":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "D":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "ATENDE PLENAMENTE") {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    } else if (status === "ATENDE PARCIALMENTE") {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "Alto":
        return "text-emerald-700 bg-emerald-50";
      case "Médio":
        return "text-yellow-700 bg-yellow-50";
      case "Baixo":
        return "text-red-700 bg-red-50";
      default:
        return "text-gray-700 bg-gray-50";
    }
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
  }: {
    title: string;
    icon: any;
    section: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-purple-600" />
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {expandedSections.has(section) ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando análise...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session || !candidate || !analysis) {
    return (
      <Layout>
        <div className="text-center py-10">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Análise não encontrada</h3>
          <p className="text-sm text-gray-500 mt-1">
            Este candidato ainda não foi analisado ou a análise não está disponível.
          </p>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 mt-4 text-purple-600 hover:text-purple-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Análise IA
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Análise IA
          </Link>

          {/* Candidate Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {candidate.profile.photoUrl ? (
                <img
                  src={candidate.profile.photoUrl}
                  alt={candidate.profile.fullName || ""}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {candidate.profile.fullName || candidate.profile.linkedinId}
                    </h1>
                    <p className="text-gray-600 mt-0.5">{candidate.profile.headline}</p>
                    {candidate.profile.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {candidate.profile.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold ${getClassificacaoColor(
                        analysis.sumario_executivo?.classificacao || "?"
                      )}`}
                    >
                      <span className="text-2xl">{analysis.matchScore}%</span>
                      <span className="text-sm opacity-90">
                        Classe {analysis.sumario_executivo?.classificacao || "?"}
                      </span>
                    </div>
                    {analysis.sumario_executivo?.recomendacao_previa && (
                      <p
                        className={`mt-2 text-sm font-medium px-3 py-1 rounded-full border ${getClassificacaoTextColor(
                          analysis.sumario_executivo?.classificacao || "?"
                        )}`}
                      >
                        {analysis.sumario_executivo.recomendacao_previa}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    Vaga: <span className="font-medium">{candidate.job.title}</span>
                  </span>
                  <a
                    href={`https://linkedin.com/in/${candidate.profile.linkedinId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                  >
                    LinkedIn <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sumário Executivo */}
        {analysis.sumario_executivo && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Sumário Executivo" icon={FileText} section="sumario" />
            {expandedSections.has("sumario") && (
              <div className="p-5 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Perfil</p>
                    <p className="text-sm font-medium text-gray-900">
                      {analysis.sumario_executivo.perfil_profissional || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Experiência</p>
                    <p className="text-sm font-medium text-gray-900">
                      {analysis.sumario_executivo.tempo_experiencia || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Stack Principal</p>
                    <p className="text-sm font-medium text-gray-900">
                      {analysis.sumario_executivo.principal_stack || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Requisitos Atendidos</p>
                    <p className="text-sm font-medium text-gray-900">
                      {analysis.sumario_executivo.percentual_requisitos || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scorecard */}
        {analysis.scorecard && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Scorecard de Avaliação" icon={BarChart3} section="scorecard" />
            {expandedSections.has("scorecard") && (
              <div className="p-5 border-t border-gray-100">
                <div className="space-y-3">
                  {[
                    { label: "Requisitos Técnicos Obrigatórios", data: analysis.scorecard.requisitos_tecnicos_obrigatorios },
                    { label: "Requisitos Técnicos Desejáveis", data: analysis.scorecard.requisitos_tecnicos_desejaveis },
                    { label: "Experiência e Senioridade", data: analysis.scorecard.experiencia_senioridade },
                    { label: "Competências Comportamentais", data: analysis.scorecard.competencias_comportamentais },
                    { label: "Formação e Certificações", data: analysis.scorecard.formacao_certificacoes },
                  ].filter(item => item.data).map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className="w-48 text-sm text-gray-700">{item.label}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${((item.data?.nota || 0) / 10) * 100}%` }}
                        />
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-medium text-gray-900">{item.data?.nota || 0}/10</span>
                      </div>
                      <div className="w-12 text-right text-xs text-gray-500">{item.data?.peso || 0}%</div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Pontuação Total</span>
                    <span className="text-xl font-bold text-purple-600">
                      {(analysis.scorecard.pontuacao_total || 0).toFixed(1)}/10
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Análise de Requisitos */}
        {analysis.analise_requisitos && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Análise de Requisitos" icon={Target} section="requisitos" />
            {expandedSections.has("requisitos") && (
              <div className="p-5 border-t border-gray-100">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.analise_requisitos.total_requisitos || 0}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {analysis.analise_requisitos.atendidos_plenamente || 0}
                    </p>
                    <p className="text-xs text-emerald-600">Atende</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {analysis.analise_requisitos.atendidos_parcialmente || 0}
                    </p>
                    <p className="text-xs text-yellow-600">Parcial</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {analysis.analise_requisitos.nao_atendidos || 0}
                    </p>
                    <p className="text-xs text-red-600">Não Atende</p>
                  </div>
                </div>

                {analysis.analise_requisitos.requisitos_detalhados && (
                  <div className="space-y-2">
                    {analysis.analise_requisitos.requisitos_detalhados.map((req, index) => (
                      <div
                        key={index}
                        className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(req.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">{req.requisito}</h4>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  req.status === "ATENDE PLENAMENTE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : req.status === "ATENDE PARCIALMENTE"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{req.comentario}</p>
                            {req.evidencias && req.evidencias.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {req.evidencias.map((ev, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                  >
                                    {ev}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Análise Técnica */}
        {analysis.analise_tecnica && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Análise Técnica" icon={Code} section="tecnica" />
            {expandedSections.has("tecnica") && (
              <div className="p-5 border-t border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-purple-600">
                      {analysis.analise_tecnica.score || 0}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{analysis.analise_tecnica.profundidade_tecnica || ""}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Tecnologias Dominadas
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis.analise_tecnica.tecnologias_dominadas || []).map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      Tecnologias Faltantes
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis.analise_tecnica.tecnologias_faltantes || []).map((tech, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4">{analysis.analise_tecnica.justificativa || ""}</p>
              </div>
            )}
          </div>
        )}

        {/* Análise Comportamental */}
        {analysis.analise_comportamental && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Análise Comportamental" icon={Users} section="comportamental" />
            {expandedSections.has("comportamental") && (
              <div className="p-5 border-t border-gray-100">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Trabalho em Equipe", data: analysis.analise_comportamental.trabalho_equipe },
                    { label: "Liderança", data: analysis.analise_comportamental.lideranca },
                    { label: "Autonomia", data: analysis.analise_comportamental.autonomia },
                    { label: "Comunicação", data: analysis.analise_comportamental.comunicacao },
                    { label: "Resolução de Problemas", data: analysis.analise_comportamental.resolucao_problemas },
                  ].filter(item => item.data).map((item) => (
                    <div key={item.label} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getNivelColor(item.data?.nivel || "")}`}
                        >
                          {item.data?.nivel || "N/A"}
                        </span>
                      </div>
                      {item.data?.evidencias && item.data.evidencias.length > 0 && (
                        <p className="text-xs text-gray-500">{item.data.evidencias[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Senioridade */}
        {analysis.senioridade && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Análise de Senioridade" icon={TrendingUp} section="senioridade" />
            {expandedSections.has("senioridade") && (
              <div className="p-5 border-t border-gray-100">
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Identificado</p>
                    <p className="text-lg font-bold text-purple-600">
                      {analysis.senioridade.nivel_identificado || "N/A"}
                    </p>
                  </div>
                  <div className="text-2xl text-gray-300">→</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Requerido</p>
                    <p className="text-lg font-bold text-gray-700">
                      {analysis.senioridade.nivel_requerido || "N/A"}
                    </p>
                  </div>
                  <div
                    className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                      analysis.senioridade.compatibilidade === "Compatível"
                        ? "bg-emerald-100 text-emerald-700"
                        : analysis.senioridade.compatibilidade === "Acima do Esperado"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {analysis.senioridade.compatibilidade || "N/A"}
                  </div>
                </div>

                {analysis.senioridade.indicadores && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div
                      className={`text-center p-3 rounded-lg ${
                        analysis.senioridade.indicadores.decisoes_estrategicas
                          ? "bg-emerald-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 mx-auto mb-1 ${
                          analysis.senioridade.indicadores.decisoes_estrategicas
                            ? "text-emerald-500"
                            : "text-gray-300"
                        }`}
                      />
                      <p className="text-xs text-gray-600">Decisões Estratégicas</p>
                    </div>
                    <div
                      className={`text-center p-3 rounded-lg ${
                        analysis.senioridade.indicadores.visao_arquitetura ? "bg-emerald-50" : "bg-gray-50"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 mx-auto mb-1 ${
                          analysis.senioridade.indicadores.visao_arquitetura
                            ? "text-emerald-500"
                            : "text-gray-300"
                        }`}
                      />
                      <p className="text-xs text-gray-600">Visão de Arquitetura</p>
                    </div>
                    <div
                      className={`text-center p-3 rounded-lg ${
                        analysis.senioridade.indicadores.influencia_tecnica ? "bg-emerald-50" : "bg-gray-50"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 mx-auto mb-1 ${
                          analysis.senioridade.indicadores.influencia_tecnica
                            ? "text-emerald-500"
                            : "text-gray-300"
                        }`}
                      />
                      <p className="text-xs text-gray-600">Influência Técnica</p>
                    </div>
                    <div
                      className={`text-center p-3 rounded-lg ${
                        analysis.senioridade.indicadores.gestao_pessoas ? "bg-emerald-50" : "bg-gray-50"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 mx-auto mb-1 ${
                          analysis.senioridade.indicadores.gestao_pessoas
                            ? "text-emerald-500"
                            : "text-gray-300"
                        }`}
                      />
                      <p className="text-xs text-gray-600">Gestão de Pessoas</p>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">{analysis.senioridade.justificativa || ""}</p>
              </div>
            )}
          </div>
        )}

        {/* Pontos Fortes */}
        {analysis.pontos_fortes && analysis.pontos_fortes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Pontos Fortes" icon={Award} section="fortes" />
            {expandedSections.has("fortes") && (
              <div className="p-5 border-t border-gray-100">
                <div className="space-y-3">
                  {analysis.pontos_fortes.map((ponto, index) => (
                    <div key={index} className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                      <h4 className="text-sm font-semibold text-emerald-800">{ponto.titulo || ""}</h4>
                      <p className="text-sm text-emerald-700 mt-1">{ponto.descricao || ""}</p>
                      <p className="text-xs text-emerald-600 mt-2 italic">
                        Relevância: {ponto.relevancia || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gaps e Riscos */}
        {analysis.gaps_riscos && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Gaps, Riscos e Alertas" icon={Shield} section="riscos" />
            {expandedSections.has("riscos") && (
              <div className="p-5 border-t border-gray-100">
                {analysis.gaps_riscos.gaps_tecnicos && analysis.gaps_riscos.gaps_tecnicos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Gaps Técnicos</h4>
                    <div className="space-y-2">
                      {analysis.gaps_riscos.gaps_tecnicos.map((gap, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            gap.criticidade === "Alta"
                              ? "bg-red-50 border-red-200"
                              : gap.criticidade === "Média"
                              ? "bg-yellow-50 border-yellow-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{gap.area || ""}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                gap.criticidade === "Alta"
                                  ? "bg-red-100 text-red-700"
                                  : gap.criticidade === "Média"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {gap.criticidade || "N/A"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{gap.impacto || ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.gaps_riscos.red_flags && analysis.gaps_riscos.red_flags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Red Flags
                    </h4>
                    <ul className="space-y-1">
                      {analysis.gaps_riscos.red_flags.map((flag, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.gaps_riscos.riscos_contratacao && analysis.gaps_riscos.riscos_contratacao.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Riscos de Contratação</h4>
                    <ul className="space-y-1">
                      {analysis.gaps_riscos.riscos_contratacao.map((risco, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                          {risco}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Perguntas para Entrevista */}
        {analysis.perguntas_entrevista && analysis.perguntas_entrevista.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Perguntas Sugeridas para Entrevista" icon={MessageSquare} section="perguntas" />
            {expandedSections.has("perguntas") && (
              <div className="p-5 border-t border-gray-100">
                <div className="space-y-3">
                  {analysis.perguntas_entrevista.map((pergunta, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pergunta.pergunta || ""}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                pergunta.tipo === "Técnica"
                                  ? "bg-blue-100 text-blue-700"
                                  : pergunta.tipo === "Comportamental"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {pergunta.tipo || "N/A"}
                            </span>
                            <span className="text-xs text-gray-500">{pergunta.objetivo || ""}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recomendação Final */}
        {analysis.recomendacao_final && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
            <SectionHeader title="Recomendação Final" icon={Lightbulb} section="recomendacao" />
            {expandedSections.has("recomendacao") && (
              <div className="p-5 border-t border-gray-100">
                <div
                  className={`p-4 rounded-lg mb-4 ${getClassificacaoTextColor(
                    analysis.recomendacao_final.classificacao || ""
                  )} border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">{analysis.recomendacao_final.titulo || "N/A"}</span>
                    <span className="text-2xl font-bold">
                      {analysis.recomendacao_final.percentual_requisitos || 0}%
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      analysis.recomendacao_final.elegivel ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {analysis.recomendacao_final.elegivel
                      ? "✓ Elegível para continuidade no processo"
                      : "✗ Não elegível - abaixo do critério mínimo de 50%"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Justificativa Executiva</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {analysis.recomendacao_final.justificativa_executiva || ""}
                  </p>
                </div>

                {analysis.recomendacao_final.proximos_passos && analysis.recomendacao_final.proximos_passos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Próximos Passos Recomendados</h4>
                    <div className="space-y-2">
                      {analysis.recomendacao_final.proximos_passos.map((passo, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                        >
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              passo.prioridade === "Alta"
                                ? "bg-red-100 text-red-700"
                                : passo.prioridade === "Média"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {passo.prioridade || "N/A"}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{passo.acao || ""}</p>
                            {passo.observacao && (
                              <p className="text-xs text-gray-500 mt-0.5">{passo.observacao}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.recomendacao_final.viabilidade_desenvolvimento?.aplicavel && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                      Viabilidade de Desenvolvimento
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-blue-600">Potencial</p>
                        <p className="text-sm font-medium text-blue-800">
                          {analysis.recomendacao_final.viabilidade_desenvolvimento.potencial || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Tempo de Ramp-up</p>
                        <p className="text-sm font-medium text-blue-800">
                          {analysis.recomendacao_final.viabilidade_desenvolvimento.tempo_rampup || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Investimento</p>
                        <p className="text-sm font-medium text-blue-800">
                          {analysis.recomendacao_final.viabilidade_desenvolvimento.investimento || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
