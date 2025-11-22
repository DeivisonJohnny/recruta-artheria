import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  MapPin,
  Code,
  Users,
  Calendar,
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
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
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

interface JobCandidate {
  id: string;
  profileId: string;
  aiAnalysis: string | null;
  matchScore: number | null;
  status: string;
  notes: string | null;
  profile: LinkedInProfile;
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

export default function JobDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updating, setUpdating] = useState(false);

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

  const filteredCandidates = job?.candidates.filter((candidate) => {
    const matchesSearch =
      (candidate.profile.fullName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (candidate.profile.headline?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (candidate.profile.location?.toLowerCase() || "").includes(
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
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Candidatos ({job.candidates.length})
            </h2>
          </div>

          {/* Filters */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                <div className="p-4 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {candidate.profile.photoUrl ? (
                      <img
                        src={candidate.profile.photoUrl}
                        alt={candidate.profile.fullName || "Candidato"}
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
                        title={candidate.profile.fullName || ""}
                      >
                        {candidate.profile.fullName ||
                          candidate.profile.linkedinId}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
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
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">
                      {candidate.profile.headline || "Sem título definido"}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {candidate.profile.location ||
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
                    {candidate.profile.linkedinId}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/candidates/${candidate.profile.linkedinId}`}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      Ver Detalhes
                    </Link>
                    <a
                      href={`https://www.linkedin.com/in/${candidate.profile.linkedinId}`}
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
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
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
      </div>
    </Layout>
  );
}
