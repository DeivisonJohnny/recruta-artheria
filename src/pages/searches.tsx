import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import {
  Search,
  FileText,
  MapPin,
  Code,
  Users,
  Calendar,
  ArrowRight,
  Plus,
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  profession: string | null;
  location: string | null;
  technologies: string[];
  keywords: string[];
  createdAt: string;
  results: any[];
}

export default function Searches() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<SearchItem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSearches();
    }
  }, [session]);

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recrutaia/searches");
      const data = await response.json();

      if (response.ok) {
        setSearches(data.searches);
      }
    } catch (error) {
      console.error("Error fetching searches:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">
              Carregando pesquisas...
            </p>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Minhas Pesquisas
            </h1>
            <p className="mt-1.5 text-sm text-gray-600">
              Visualize e gerencie suas pesquisas anteriores
            </p>
          </div>
          <Link
            href="/candidates/search"
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Pesquisa
          </Link>
        </div>

        {searches.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Nenhuma pesquisa realizada
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Você ainda não realizou nenhuma pesquisa. Comece agora!
            </p>
            <Link
              href="/candidates/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
            >
              <Search className="w-4 h-4" />
              Fazer primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                        <Search className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {search.title}
                      </h3>
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
                      {search.technologies.slice(0, 4).map((tech, index) => (
                        <span
                          key={index}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg border border-purple-200"
                        >
                          <Code className="w-3 h-3" />
                          {tech}
                        </span>
                      ))}
                      {search.technologies.length > 4 && (
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-200 font-medium">
                          +{search.technologies.length - 4}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{search.results.length} resultados</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(search.createdAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/searches/${search.id}`}
                    className="ml-3 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Ver Resultados
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
