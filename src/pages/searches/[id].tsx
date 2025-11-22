import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Code,
  Users,
  Calendar,
  ArrowLeft,
  ExternalLink,
  UserCircle2,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  Download,
  X,
  Eye,
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

interface SearchResult {
  id: string;
  profileId: string;
  linkedinUrl: string;
  relevanceScore: number | null;
  profile: LinkedInProfile;
}

interface SearchDetail {
  id: string;
  title: string;
  profession: string | null;
  location: string | null;
  technologies: string[];
  keywords: string[];
  createdAt: string;
  results: SearchResult[];
}

interface ScrapeProgress {
  current: number;
  total: number;
  status: "idle" | "scraping" | "done" | "error";
  message?: string;
}

export default function SearchDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<SearchDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress>({
    current: 0,
    total: 0,
    status: "idle",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      fetchSearch();
    }
  }, [session, id]);

  const fetchSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recrutaia/searches/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSearch(data.search);
      } else if (response.status === 404) {
        toast.error("Pesquisa não encontrada");
        router.push("/searches");
      } else {
        toast.error("Erro ao carregar pesquisa");
      }
    } catch (error) {
      console.error("Error fetching search:", error);
      toast.error("Erro ao carregar pesquisa");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = search?.results.filter(
    (result) =>
      (result.profile.fullName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (result.profile.headline?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (result.profile.location?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      )
  ) || [];

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
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.profile.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const hasDetailedData = (profile: LinkedInProfile) => {
    return (
      (profile.experience && profile.experience.length > 0) ||
      (profile.skills && profile.skills.length > 0)
    );
  };

  const scrapeSelectedProfiles = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um perfil");
      return;
    }

    setScrapeProgress({
      current: 0,
      total: selectedIds.size,
      status: "scraping",
      message: "Iniciando coleta de detalhes com Scrapingdog...",
    });

    try {
      const profilesToScrape = filteredResults
        .filter((r) => selectedIds.has(r.profile.id))
        .map((r) => r.profile.linkedinId)
        .filter((id) => id);

      if (profilesToScrape.length === 0) {
        toast.error("Nenhum ID do LinkedIn válido encontrado");
        setScrapeProgress({ current: 0, total: 0, status: "idle" });
        return;
      }

      const response = await fetch("/api/recrutaia/linkedin/scrape-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: profilesToScrape }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao coletar detalhes");
      }

      const results = data.results || [];
      const successCount = results.filter((r: any) => r.success).length;

      setScrapeProgress({
        current: successCount,
        total: selectedIds.size,
        status: "done",
        message: `${successCount} de ${selectedIds.size} perfis coletados com sucesso!`,
      });

      if (successCount > 0) {
        toast.success(`${successCount} perfis atualizados com sucesso!`);
        clearSelection();
        fetchSearch();
      } else {
        toast.warning("Nenhum perfil foi atualizado com sucesso.");
      }
    } catch (error) {
      console.error("Erro no scraping:", error);
      toast.error("Erro ao coletar detalhes dos perfis");
      setScrapeProgress({
        current: 0,
        total: 0,
        status: "error",
        message: "Erro durante a coleta",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">
              Carregando pesquisa...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session || !search) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/searches"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para pesquisas
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {search.title}
                </h1>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {search.profession && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200 font-medium">
                    {search.profession}
                  </span>
                )}
                {search.location && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                    <MapPin className="w-3 h-3" />
                    {search.location}
                  </span>
                )}
                {search.technologies.map((tech, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg border border-purple-200"
                  >
                    <Code className="w-3 h-3" />
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{search.results.length} resultados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(search.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={fetchSearch}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-5 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Filtrar por nome, cargo ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Selection Bar */}
        {filteredResults.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-black"
              >
                {selectedIds.size === filteredResults.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-500" />
                )}
                {selectedIds.size === filteredResults.length
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
                  onClick={scrapeSelectedProfiles}
                  disabled={scrapeProgress.status === "scraping"}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scrapeProgress.status === "scraping" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Coletando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Coletar Detalhes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {scrapeProgress.status === "scraping" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-700">
                {scrapeProgress.message}
              </span>
              <span className="text-sm text-emerald-600">
                {scrapeProgress.current}/{scrapeProgress.total}
              </span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(scrapeProgress.current / scrapeProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Results Grid */}
        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                onClick={() => toggleSelection(result.profile.id)}
                className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer ${
                  selectedIds.has(result.profile.id)
                    ? "border-emerald-500 ring-2 ring-emerald-200"
                    : "border-gray-200"
                }`}
              >
                <div className="p-4 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 pt-0.5">
                      {selectedIds.has(result.profile.id) ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    {result.profile.photoUrl ? (
                      <img
                        src={result.profile.photoUrl}
                        alt={result.profile.fullName || "Candidato"}
                        className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className="text-base font-semibold text-gray-900 truncate"
                          title={result.profile.fullName || ""}
                        >
                          {result.profile.fullName || result.profile.linkedinId}
                        </h3>
                        {hasDetailedData(result.profile) && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                            Detalhado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {new Date(result.profile.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">
                      {result.profile.headline || "Sem título definido"}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {result.profile.location || "Localização não informada"}
                      </span>
                    </div>
                  </div>

                  {result.profile.about && (
                    <p className="text-xs text-gray-600 line-clamp-3 mb-3 bg-gray-50 p-2.5 rounded-lg">
                      {result.profile.about}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {result.profile.linkedinId}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/candidates/${result.profile.linkedinId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      Ver Detalhes
                    </Link>
                    <a
                      href={`https://www.linkedin.com/in/${result.profile.linkedinId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium hover:underline"
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
              Nenhum resultado encontrado
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm
                ? "Tente ajustar seus termos de busca."
                : "Esta pesquisa não retornou nenhum perfil."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
