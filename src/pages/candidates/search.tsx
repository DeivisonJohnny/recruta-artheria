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
      const response = await fetch("/api/recrutaia/search", {
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
        const candidates = data.data || data.results || [];
        setResults(candidates);
        setSearchId(data.searchId);
        toast.success(`Encontrados ${candidates.length} candidatos!`);
      } else {
        toast.error(data.message || "Erro ao realizar pesquisa");
      }
    } catch (error) {
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Pesquisar Candidatos
              </h1>
            </div>
          </div>
          <p className="text-gray-600">
            Busque perfis no LinkedIn por profissão, localização e tecnologias
          </p>
        </div>

        {/* Formulário de pesquisa */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Título da Pesquisa *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Desenvolvedores React em BH"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="profession"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Profissão
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircle2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    placeholder="Ex: Desenvolvedor"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Localização
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Belo Horizonte"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="technologies"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Tecnologias (separadas por vírgula)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Code className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="technologies"
                  name="technologies"
                  value={formData.technologies}
                  onChange={handleInputChange}
                  placeholder="Ex: Node, React, TypeScript"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="keywords"
                className="block text-sm font-semibold text-gray-700 mb-2"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Pesquisando...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Pesquisar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <UserCircle2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Resultados ({results.length})
              </h2>
            </div>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row md:items-start justify-between p-5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-all gap-4"
                >
                  <div className="flex-1 flex items-start gap-4">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-8 h-8 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {result.name || "Nome não disponível"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        {result.title || "Sem título"}
                      </p>

                      {result.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                          <MapPin className="w-3 h-3" />
                          <span>{result.location}</span>
                        </div>
                      )}

                      {result.summary && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {result.summary}
                        </p>
                      )}

                      <a
                        href={result.profileUrl || result.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
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
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
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
