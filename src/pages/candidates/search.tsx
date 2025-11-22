import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Code,
  FileText,
  Loader2,
  ExternalLink,
  UserCircle2,
} from "lucide-react";

export default function SearchCandidates() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    profession: "",
    location: "",
    technologies: "",
    keywords: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      // Use the new API endpoint
      const response = await fetch("/api/recrutaia/linkedin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          profession: formData.profession,
          location: formData.location,
          technologies: formData.technologies
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          keywords: formData.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Handle both data formats (data.data from new API or data.results from old)
        // The new API returns { profiles: [...] }
        let candidates = data.profiles || data.data || data.results || [];

        // Normalize candidates data structure if needed
        candidates = candidates.map((c: any) => ({
          ...c,
          // Map new API fields to frontend expected fields if they don't exist
          title: c.title || c.headline,
          imageUrl: c.imageUrl || c.photo_url,
          profileUrl: c.profileUrl || c.profile_url || c.linkedinUrl,
        }));

        setResults(candidates);
        setSearchId(data.searchId);
        toast.success(`Encontrados ${candidates.length} candidatos!`);
      } else {
        toast.error(data.message || data.error || "Erro ao realizar pesquisa");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar pesquisa");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pesquisar Candidatos
              </h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Busque perfis no LinkedIn por profissão, localização e tecnologias
          </p>
        </div>

        {/* Formulário de pesquisa */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Título da Pesquisa *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Desenvolvedores React em BH"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profession"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Profissão
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircle2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    placeholder="Ex: Desenvolvedor"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location"
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
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Belo Horizonte"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="technologies"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Tecnologias (separadas por vírgula)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Code className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="technologies"
                  name="technologies"
                  value={formData.technologies}
                  onChange={handleInputChange}
                  placeholder="Ex: Node, React, TypeScript"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="keywords"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Palavras-chave adicionais (separadas por vírgula)
              </label>
              <input
                type="text"
                id="keywords"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="Ex: Senior, Full Stack"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pesquisando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Pesquisar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Resultados ({results.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row md:items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all gap-3"
                >
                  <div className="flex-1 flex items-start gap-3">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {result.name || "Nome não disponível"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        {result.title || "Sem título"}
                      </p>

                      {result.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{result.location}</span>
                        </div>
                      )}

                      {result.summary && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {result.summary}
                        </p>
                      )}

                      <a
                        href={result.profileUrl || result.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        Ver Perfil LinkedIn
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900 mb-1.5">
              Buscando perfis no LinkedIn...
            </p>
            <p className="text-sm text-gray-600">
              Isso pode levar alguns instantes
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
