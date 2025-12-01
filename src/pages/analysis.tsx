import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { toast } from "sonner";
import {
  Brain,
  Briefcase,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  FileText,
  Eye,
} from "lucide-react";

interface LinkedInProfile {
  id: string;
  linkedinId: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  photoUrl: string | null;
}

interface JobCandidate {
  id: string;
  candidateId: string;
  aiAnalysis: string | null;
  matchScore: number | null;
  status: string;
  candidate: LinkedInProfile;
}

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location: string | null;
  technologies: string[];
  experienceLevel: string | null;
  isActive: boolean;
  candidates: JobCandidate[];
}

interface AnalysisResult {
  candidateId: string;
  profileId: string;
  linkedinId: string;
  fullName: string;
  photoUrl: string | null;
  headline: string | null;
  matchScore: number;
  analysis: {
    sumario_executivo?: {
      classificacao: string;
      recomendacao_previa: string;
      percentual_requisitos: number;
    };
    analise_requisitos?: {
      elegivel: boolean;
      atendidos_plenamente: number;
      atendidos_parcialmente: number;
      nao_atendidos: number;
    };
    pontos_fortes?: Array<{ titulo: string }>;
    gaps_riscos?: {
      gaps_tecnicos: Array<{ area: string; criticidade: string }>;
    };
    recomendacao_final?: {
      titulo: string;
      classificacao: string;
    };
  };
}

export default function AnalysisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchJobs();
    }
  }, [session]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recrutaia/jobs");
      const data = await response.json();

      if (response.ok) {
        const jobsWithCandidates = data.jobs.filter(
          (job: Job) => job.candidates && job.candidates.length > 0
        );
        setJobs(jobsWithCandidates);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      try {
        const response = await fetch(`/api/recrutaia/jobs/${jobId}`);
        const data = await response.json();
        if (response.ok) {
          setSelectedJob(data.job);
          setSelectedCandidates(new Set());
          setResults([]);
        }
      } catch (error) {
        console.error("Error fetching job details:", error);
        setSelectedJob(job);
      }
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const selectAllCandidates = () => {
    if (!selectedJob) return;
    if (selectedCandidates.size === selectedJob.candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(selectedJob.candidates.map((c) => c.id)));
    }
  };

  const runAnalysis = async () => {
    if (!selectedJob) {
      toast.error("Selecione uma vaga");
      return;
    }

    const candidatesToAnalyze = selectedCandidates.size > 0
      ? Array.from(selectedCandidates)
      : selectedJob.candidates.map((c) => c.id);

    if (candidatesToAnalyze.length === 0) {
      toast.error("Nenhum candidato para analisar");
      return;
    }

    setAnalyzing(true);
    setResults([]);

    try {
      const response = await fetch("/api/recrutaia/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          candidateIds: candidatesToAnalyze,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setExpandedResults(new Set(data.results.map((r: AnalysisResult) => r.candidateId)));
        toast.success(data.message);
        handleSelectJob(selectedJob.id);
      } else {
        toast.error(data.message || "Erro ao realizar análise");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erro ao realizar análise");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleResultExpanded = (candidateId: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
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

  const getClassificacaoBadge = (classificacao: string) => {
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análise IA</h1>
              <p className="text-sm text-gray-600">
                Análise profissional de candidatos com Gemini AI
              </p>
            </div>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Nenhuma vaga com candidatos
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Você precisa ter vagas com candidatos vinculados para usar a análise IA.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
            >
              <Briefcase className="w-4 h-4" />
              Ir para Vagas
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Selection Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    Selecione uma Vaga
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleSelectJob(job.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedJob?.id === job.id
                          ? "bg-purple-50 border-l-4 border-purple-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              {job.candidates.length} candidato(s)
                            </span>
                            {job.isActive ? (
                              <span className="text-xs text-emerald-600">Ativa</span>
                            ) : (
                              <span className="text-xs text-gray-400">Inativa</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidates & Analysis Panel */}
            <div className="lg:col-span-2">
              {!selectedJob ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                  <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1.5">
                    Selecione uma vaga
                  </h3>
                  <p className="text-sm text-gray-500">
                    Escolha uma vaga para visualizar e analisar os candidatos
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Job Info */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedJob.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {selectedJob.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedJob.technologies.slice(0, 5).map((tech, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectJob(selectedJob.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Candidates Selection */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Candidatos ({selectedJob.candidates.length})
                      </h3>
                      <button
                        onClick={selectAllCandidates}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        {selectedCandidates.size === selectedJob.candidates.length
                          ? "Desmarcar todos"
                          : "Selecionar todos"}
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                      {selectedJob.candidates.map((candidate) => {
                        const hasAnalysis = candidate.aiAnalysis !== null;
                        let analysisData = null;
                        if (hasAnalysis) {
                          try {
                            analysisData = JSON.parse(candidate.aiAnalysis!);
                          } catch {}
                        }

                        return (
                          <div
                            key={candidate.id}
                            onClick={() => toggleCandidateSelection(candidate.id)}
                            className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedCandidates.has(candidate.id) ? "bg-purple-50" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCandidates.has(candidate.id)}
                              onChange={() => {}}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            {candidate.candidate.photoUrl ? (
                              <img
                                src={candidate.candidate.photoUrl}
                                alt={candidate.candidate.fullName || ""}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {candidate.candidate.fullName || candidate.candidate.linkedinId}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {candidate.candidate.headline || "Sem título"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {candidate.matchScore !== null && (
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full border ${getScoreColor(
                                    candidate.matchScore
                                  )}`}
                                >
                                  {candidate.matchScore}%
                                </span>
                              )}
                              {analysisData?.sumario_executivo?.classificacao && (
                                <span
                                  className={`px-2 py-1 text-xs font-bold rounded-full ${getClassificacaoColor(
                                    analysisData.sumario_executivo.classificacao
                                  )} text-white`}
                                >
                                  {analysisData.sumario_executivo.classificacao}
                                </span>
                              )}
                              {hasAnalysis && (
                                <Link
                                  href={`/analysis/${candidate.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg"
                                  title="Ver análise detalhada"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={runAnalysis}
                        disabled={analyzing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analisando com Gemini...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            Analisar{" "}
                            {selectedCandidates.size > 0
                              ? `${selectedCandidates.size} selecionado(s)`
                              : "Todos"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {results.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          Resultados da Análise
                        </h3>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {results.map((result, index) => {
                          const classificacao = result.analysis?.sumario_executivo?.classificacao || "?";
                          const recomendacao = result.analysis?.recomendacao_final?.titulo || "";
                          const elegivel = result.analysis?.analise_requisitos?.elegivel;

                          return (
                            <div key={result.candidateId} className="p-4">
                              <div
                                onClick={() => toggleResultExpanded(result.candidateId)}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-full ${getClassificacaoColor(
                                      classificacao
                                    )} flex items-center justify-center text-white font-bold`}
                                  >
                                    {classificacao}
                                  </div>
                                  {result.photoUrl ? (
                                    <img
                                      src={result.photoUrl}
                                      alt={result.fullName}
                                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                      <Users className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      #{index + 1} {result.fullName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full border ${getClassificacaoBadge(
                                          classificacao
                                        )}`}
                                      >
                                        {recomendacao}
                                      </span>
                                      {elegivel !== undefined && (
                                        <span
                                          className={`text-xs ${
                                            elegivel ? "text-emerald-600" : "text-red-600"
                                          }`}
                                        >
                                          {elegivel ? "✓ Elegível" : "✗ Não elegível"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-3 py-1.5 text-lg font-bold rounded-lg border ${getScoreColor(
                                      result.matchScore
                                    )}`}
                                  >
                                    {result.matchScore}%
                                  </span>
                                  {expandedResults.has(result.candidateId) ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>

                              {expandedResults.has(result.candidateId) && result.analysis && (
                                <div className="mt-4 space-y-3">
                                  {/* Requisitos */}
                                  {result.analysis.analise_requisitos && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-emerald-600">
                                          {result.analysis.analise_requisitos.atendidos_plenamente}
                                        </p>
                                        <p className="text-xs text-emerald-600">Atende</p>
                                      </div>
                                      <div className="bg-yellow-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-yellow-600">
                                          {result.analysis.analise_requisitos.atendidos_parcialmente}
                                        </p>
                                        <p className="text-xs text-yellow-600">Parcial</p>
                                      </div>
                                      <div className="bg-red-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-red-600">
                                          {result.analysis.analise_requisitos.nao_atendidos}
                                        </p>
                                        <p className="text-xs text-red-600">Não Atende</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Pontos Fortes */}
                                  {result.analysis.pontos_fortes && result.analysis.pontos_fortes.length > 0 && (
                                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                      <h4 className="text-xs font-semibold text-emerald-800 mb-1.5 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Pontos Fortes
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        {result.analysis.pontos_fortes.slice(0, 3).map((pf, i) => (
                                          <span
                                            key={i}
                                            className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded"
                                          >
                                            {pf.titulo}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Gaps */}
                                  {result.analysis.gaps_riscos?.gaps_tecnicos &&
                                    result.analysis.gaps_riscos.gaps_tecnicos.length > 0 && (
                                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                        <h4 className="text-xs font-semibold text-red-800 mb-1.5 flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          Gaps Técnicos
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                          {result.analysis.gaps_riscos.gaps_tecnicos.slice(0, 3).map((gap, i) => (
                                            <span
                                              key={i}
                                              className={`text-xs px-2 py-0.5 rounded ${
                                                gap.criticidade === "Alta"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-yellow-100 text-yellow-700"
                                              }`}
                                            >
                                              {gap.area}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  {/* Actions */}
                                  <div className="flex items-center justify-between pt-2">
                                    <Link
                                      href={`/analysis/${result.candidateId}`}
                                      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                                    >
                                      <FileText className="w-4 h-4" />
                                      Ver relatório completo
                                    </Link>
                                    <a
                                      href={`https://linkedin.com/in/${result.linkedinId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      LinkedIn <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
