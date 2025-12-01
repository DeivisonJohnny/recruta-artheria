import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  MapPin,
  Code,
  Users,
  ArrowLeft,
  ExternalLink,
  UserCircle2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Eye,
  Search,
  Building2,
  DollarSign,
  GraduationCap,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Database,
  Filter,
  CheckSquare,
  Square,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LinkedInProfile {
  id: string;
  linkedinId: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  photoUrl: string | null;
  about: string | null;
  experience?: any[];
  skills?: string[];
  createdAt: string;
}

// Check if profile has detailed data (scraped)
const hasDetailedData = (profile: LinkedInProfile) => {
  return (
    (profile.experience && profile.experience.length > 0) ||
    (profile.skills && profile.skills.length > 0)
  );
};

interface JobCandidate {
  id: string;
  candidateId: string;
  aiAnalysis: string | null;
  matchScore: number | null;
  status: string;
  notes: string | null;
  candidate: LinkedInProfile;
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location: string | null;
  technologies: string[];
  experienceLevel: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  candidates: JobCandidate[];
}

// Component to highlight matching text
function HighlightText({
  text,
  searchTerms,
}: {
  text: string;
  searchTerms: string[];
}) {
  if (!text || searchTerms.length === 0) {
    return <>{text}</>;
  }

  const pattern = searchTerms
    .filter((term) => term.length > 1)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  if (!pattern) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = searchTerms.some(
          (term) => part.toLowerCase() === term.toLowerCase()
        );
        return isMatch ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

export default function JobDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updating, setUpdating] = useState(false);

  // Database search states
  const [dbLoading, setDbLoading] = useState(false);
  const [dbResults, setDbResults] = useState<LinkedInProfile[]>([]);
  const [dbFilters, setDbFilters] = useState({
    query: "",
    skills: "",
    location: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [linkingToJob, setLinkingToJob] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAddCandidates, setShowAddCandidates] = useState(false);

  // Search terms for highlighting
  const searchTerms = useMemo(() => {
    const terms: string[] = [];
    if (dbFilters.query) {
      terms.push(...dbFilters.query.split(/\s+/).filter((t) => t.length > 1));
    }
    if (dbFilters.skills) {
      terms.push(
        ...dbFilters.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    if (dbFilters.location) {
      terms.push(dbFilters.location.trim());
    }
    return terms.filter((t) => t.length > 1);
  }, [dbFilters]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      fetchJob();
    }
  }, [session, id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recrutaia/jobs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else if (response.status === 404) {
        toast.error("Vaga não encontrada");
        router.push("/jobs");
      } else {
        toast.error("Erro ao carregar vaga");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Erro ao carregar vaga");
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async () => {
    if (!job) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/recrutaia/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !job.isActive }),
      });

      if (response.ok) {
        setJob({ ...job, isActive: !job.isActive });
        toast.success(job.isActive ? "Vaga desativada" : "Vaga ativada");
      } else {
        toast.error("Erro ao atualizar status");
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(false);
    }
  };

  const deleteJob = async () => {
    if (!confirm("Tem certeza que deseja excluir esta vaga?")) return;

    try {
      const response = await fetch(`/api/recrutaia/jobs/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Vaga excluída com sucesso");
        router.push("/jobs");
      } else {
        toast.error("Erro ao excluir vaga");
      }
    } catch (error) {
      toast.error("Erro ao excluir vaga");
    }
  };

  // Database Search
  const handleDatabaseSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbLoading(true);
    setDbResults([]);
    setSelectedIds(new Set());

    try {
      const response = await fetch("/api/recrutaia/candidates/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: dbFilters.query,
          skills: dbFilters.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          location: dbFilters.location,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Filter out candidates already linked to this job
        const linkedIds = new Set(
          job?.candidates.map((c) => c.candidate.id) || []
        );
        const filteredResults = data.candidates.filter(
          (c: LinkedInProfile) => !linkedIds.has(c.id)
        );
        setDbResults(filteredResults);
        toast.success(
          `Encontrados ${filteredResults.length} candidatos disponíveis!`
        );
      } else {
        toast.error(data.message || "Erro ao realizar pesquisa");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar pesquisa");
    } finally {
      setDbLoading(false);
    }
  };

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === dbResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dbResults.map((r) => r.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const linkCandidatesToJob = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um candidato");
      return;
    }

    setLinkingToJob(true);

    try {
      const response = await fetch(`/api/recrutaia/jobs/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        clearSelection();
        setDbResults([]);
        setShowAddCandidates(false);
        fetchJob();
      } else {
        toast.error(data.message || "Erro ao vincular candidatos");
      }
    } catch (error) {
      toast.error("Erro ao vincular candidatos");
    } finally {
      setLinkingToJob(false);
    }
  };

  const filteredCandidates =
    job?.candidates.filter((candidate) => {
      const matchesSearch =
        (candidate.candidate.fullName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (candidate.candidate.headline?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (candidate.candidate.location?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        );

      const matchesStatus =
        statusFilter === "all" || candidate.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full border border-yellow-200">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case "reviewed":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
            <Eye className="w-3 h-3" />
            Revisado
          </span>
        );
      case "contacted":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Contactado
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  const getMatchScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-blue-100 text-blue-700";
    if (score >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando vaga...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session || !job) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para vagas
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {job.title}
                      </h1>
                      {job.isActive ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                          <XCircle className="w-3 h-3" />
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Criada em{" "}
                      {new Date(job.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{job.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.location && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                  )}
                  {job.experienceLevel && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {job.experienceLevel}
                    </span>
                  )}
                  {job.employmentType && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-lg border border-indigo-200">
                      <Building2 className="w-3.5 h-3.5" />
                      {job.employmentType}
                    </span>
                  )}
                  {job.salaryRange && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salaryRange}
                    </span>
                  )}
                </div>

                {job.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg border border-purple-200"
                      >
                        <Code className="w-3 h-3" />
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {job.requirements.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Requisitos
                    </h3>
                    <ul className="space-y-1.5">
                      {job.requirements.map((req, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 lg:ml-4">
                <button
                  onClick={toggleJobStatus}
                  disabled={updating}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    job.isActive
                      ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  {job.isActive ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      Ativar
                    </>
                  )}
                </button>
                <button
                  onClick={deleteJob}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
                <button
                  onClick={fetchJob}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Candidatos ({job.candidates.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAddCandidates(!showAddCandidates)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Candidatos
            </button>
          </div>

          {/* Filters for existing candidates */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-5 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar por nome, cargo ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="reviewed">Revisados</option>
              <option value="contacted">Contactados</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>
        </div>

        {/* Candidates Grid */}
        {filteredCandidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                <div className="p-4 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {candidate.candidate.photoUrl ? (
                      <img
                        src={candidate.candidate.photoUrl}
                        alt={candidate.candidate.fullName || "Candidato"}
                        className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-6 h-6 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base font-semibold text-gray-900 truncate"
                        title={candidate.candidate.fullName || ""}
                      >
                        {candidate.candidate.fullName ||
                          candidate.candidate.linkedinId}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getStatusBadge(candidate.status)}
                        {candidate.matchScore !== null && (
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${getMatchScoreColor(
                              candidate.matchScore
                            )}`}
                          >
                            <Star className="w-3 h-3" />
                            {candidate.matchScore}%
                          </span>
                        )}
                        {hasDetailedData(candidate.candidate) ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Detalhado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
                            <Clock className="w-3 h-3" />
                            Não detalhado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">
                      {candidate.candidate.headline || "Sem título definido"}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {candidate.candidate.location ||
                          "Localização não informada"}
                      </span>
                    </div>
                  </div>

                  {candidate.aiAnalysis && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 mb-3">
                      <p className="text-xs text-purple-700 line-clamp-3">
                        <span className="font-medium">Análise IA:</span>{" "}
                        {candidate.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {candidate.candidate.linkedinId}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/candidates/${candidate.candidate.linkedinId}`}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      Ver Detalhes
                    </Link>
                    <a
                      href={`https://www.linkedin.com/in/${candidate.candidate.linkedinId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline"
                    >
                      LinkedIn
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200 mb-10">
            <UserCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
            <h3 className="text-base font-medium text-gray-900">
              Nenhum candidato encontrado
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar seus filtros."
                : "Esta vaga ainda não possui candidatos vinculados."}
            </p>
          </div>
        )}

        {/* ==================== ADD CANDIDATES SECTION ==================== */}
        {showAddCandidates && (
          <div className="border-t border-gray-200 pt-8">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Vincular Candidatos à Vaga
                    </h2>
                    <p className="text-sm text-gray-600">
                      Busque candidatos do banco de dados e vincule-os a uma
                      vaga para análise
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddCandidates(false);
                    setDbResults([]);
                    setSelectedIds(new Set());
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Database Search Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Filtros de Busca
                </h3>
              </div>

              <form onSubmit={handleDatabaseSearch} className="space-y-4">
                <div>
                  <label
                    htmlFor="dbQuery"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Busca Geral
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="dbQuery"
                      value={dbFilters.query}
                      onChange={(e) =>
                        setDbFilters({ ...dbFilters, query: e.target.value })
                      }
                      placeholder="Nome, cargo, descrição..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dbSkills"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Skills (separadas por vírgula)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Code className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="dbSkills"
                        value={dbFilters.skills}
                        onChange={(e) =>
                          setDbFilters({ ...dbFilters, skills: e.target.value })
                        }
                        placeholder="React, Node, Python..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="dbLocation"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Localização
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="dbLocation"
                        value={dbFilters.location}
                        onChange={(e) =>
                          setDbFilters({
                            ...dbFilters,
                            location: e.target.value,
                          })
                        }
                        placeholder="São Paulo, Brasil..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={dbLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                >
                  {dbLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pesquisando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Buscar no Banco de Dados
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Search Terms Highlight Info */}
            {searchTerms.length > 0 && dbResults.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-yellow-800 font-medium">
                  Destacando:
                </span>
                {searchTerms.map((term, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-yellow-200 text-yellow-900 text-xs rounded font-medium"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}

            {/* Selection Actions Bar */}
            {dbResults.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-black"
                  >
                    {selectedIds.size === dbResults.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500" />
                    )}
                    {selectedIds.size === dbResults.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedIds.size} selecionado(s)
                    </span>
                  )}
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearSelection}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Limpar
                    </button>

                    <button
                      onClick={linkCandidatesToJob}
                      disabled={linkingToJob}
                      className="flex items-center gap-2 px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {linkingToJob ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Vinculando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Vincular à Vaga
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Database Results */}
            {dbResults.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Candidatos Disponíveis ({dbResults.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {dbResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => toggleSelection(result.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedIds.has(result.id)
                          ? "border-purple-500 ring-2 ring-purple-200 bg-purple-50/30"
                          : "border-gray-200 hover:bg-gray-50 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 pt-1">
                          {selectedIds.has(result.id) ? (
                            <CheckSquare className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300" />
                          )}
                        </div>

                        {result.photoUrl ? (
                          <img
                            src={result.photoUrl}
                            alt={result.fullName || "Candidato"}
                            className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserCircle2 className="w-7 h-7 text-purple-600" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-semibold text-gray-900">
                                  <HighlightText
                                    text={
                                      result.fullName ||
                                      result.linkedinId ||
                                      "Nome não disponível"
                                    }
                                    searchTerms={searchTerms}
                                  />
                                </h4>
                                {hasDetailedData(result) ? (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Detalhado
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
                                    <Clock className="w-3 h-3" />
                                    Não detalhado
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 font-medium mt-0.5">
                                <HighlightText
                                  text={result.headline || "Sem título"}
                                  searchTerms={searchTerms}
                                />
                              </p>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(result.id);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              {expandedCards.has(result.id) ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>

                          {result.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
                              <MapPin className="w-3 h-3" />
                              <span>
                                <HighlightText
                                  text={result.location}
                                  searchTerms={searchTerms}
                                />
                              </span>
                            </div>
                          )}

                          {result.skills && result.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(expandedCards.has(result.id)
                                ? result.skills
                                : result.skills.slice(0, 5)
                              ).map((skill: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  <HighlightText
                                    text={skill}
                                    searchTerms={searchTerms}
                                  />
                                </span>
                              ))}
                              {!expandedCards.has(result.id) &&
                                result.skills.length > 5 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                    +{result.skills.length - 5}
                                  </span>
                                )}
                            </div>
                          )}

                          {expandedCards.has(result.id) && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {result.about && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-semibold text-gray-700 mb-1">
                                    Sobre
                                  </h5>
                                  <p className="text-xs text-gray-600 whitespace-pre-line">
                                    <HighlightText
                                      text={result.about}
                                      searchTerms={searchTerms}
                                    />
                                  </p>
                                </div>
                              )}

                              {result.experience &&
                                result.experience.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-gray-700 mb-1">
                                      Experiência
                                    </h5>
                                    <div className="space-y-2">
                                      {result.experience
                                        .slice(0, 3)
                                        .map((exp: any, index: number) => (
                                          <div
                                            key={index}
                                            className="text-xs text-gray-600"
                                          >
                                            <span className="font-medium">
                                              <HighlightText
                                                text={
                                                  exp.title ||
                                                  exp.position ||
                                                  ""
                                                }
                                                searchTerms={searchTerms}
                                              />
                                            </span>
                                            {(exp.company_name ||
                                              exp.company) && (
                                              <span>
                                                {" "}
                                                @{" "}
                                                <HighlightText
                                                  text={
                                                    exp.company_name ||
                                                    exp.company
                                                  }
                                                  searchTerms={searchTerms}
                                                />
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-3">
                            <Link
                              href={`/candidates/${result.linkedinId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              Ver Detalhes
                            </Link>
                            <a
                              href={`https://www.linkedin.com/in/${result.linkedinId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline"
                            >
                              LinkedIn
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {dbLoading && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
                <p className="text-base font-medium text-gray-900 mb-1.5">
                  Buscando no banco de dados...
                </p>
                <p className="text-sm text-gray-600">
                  Isso pode levar alguns instantes
                </p>
              </div>
            )}

            {/* Empty State */}
            {!dbLoading && dbResults.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-medium text-gray-900 mb-1.5">
                  Busque candidatos no banco
                </p>
                <p className="text-sm text-gray-600">
                  Use os filtros acima para encontrar candidatos e vinculá-los a
                  esta vaga
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
