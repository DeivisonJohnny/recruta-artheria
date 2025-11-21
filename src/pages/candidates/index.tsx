import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import {
  Users,
  MapPin,
  ExternalLink,
  UserCircle2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

interface Candidate {
  id: string;
  linkedinId: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  photoUrl: string | null;
  about: string | null;
  createdAt: string;
}

export default function CandidatesList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchCandidates();
    }
  }, [status, router]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recrutaia/candidates");
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        toast.error("Erro ao carregar candidatos");
      }
    } catch (error) {
      toast.error("Erro ao carregar candidatos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(
    (candidate) =>
      (candidate.fullName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (candidate.headline?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (candidate.location?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      )
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Banco de Talentos
              </h1>
            </div>
            <p className="text-sm text-gray-600">
              Gerencie todos os perfis salvos do LinkedIn
            </p>
          </div>

          <button
            onClick={fetchCandidates}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading && candidates.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
          </div>
        ) : filteredCandidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="p-4 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.fullName || "Candidato"}
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
                        title={candidate.fullName || ""}
                      >
                        {candidate.fullName || candidate.linkedinId}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {new Date(candidate.createdAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">
                      {candidate.headline || "Sem título definido"}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {candidate.location || "Localização não informada"}
                      </span>
                    </div>
                  </div>

                  {candidate.about && (
                    <p className="text-xs text-gray-600 line-clamp-3 mb-3 bg-gray-50 p-2.5 rounded-lg">
                      {candidate.about}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {candidate.linkedinId}
                  </span>
                  <a
                    href={`https://www.linkedin.com/in/${candidate.linkedinId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline"
                  >
                    Ver Perfil
                    <ExternalLink className="w-3 h-3" />
                  </a>
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
              {searchTerm
                ? "Tente ajustar seus termos de busca."
                : "Realize uma pesquisa para adicionar candidatos ao banco."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
