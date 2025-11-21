import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import {
  Search,
  FileText,
  Briefcase,
  TrendingUp,
  Users,
  Target,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo, {session.user?.name || "Usuário"}!
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            Gerencie suas buscas de candidatos e vagas em um só lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card: Nova Pesquisa */}
          <Link
            href="/candidates/search"
            className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 p-5"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -mr-14 -mt-14 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-3 shadow-md">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                Pesquisar Candidatos
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Busque perfis no LinkedIn por profissão, localização e
                tecnologias
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Começar busca <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </Link>

          {/* Card: Minhas Pesquisas */}
          <Link
            href="/searches"
            className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 p-5"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -mr-14 -mt-14 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-3 shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                Minhas Pesquisas
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Veja e gerencie suas pesquisas anteriores e resultados
              </p>
              <div className="flex items-center text-emerald-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Ver pesquisas <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </Link>

          {/* Card: Vagas */}
          <Link
            href="/jobs"
            className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 p-5"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full -mr-14 -mt-14 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-lg flex items-center justify-center mb-3 shadow-md">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                Gerenciar Vagas
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Crie vagas e analise candidatos com IA
              </p>
              <div className="flex items-center text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Ver vagas <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Estatísticas rápidas */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Estatísticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center text-green-600 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">Total de Pesquisas</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center text-green-600 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">Perfis Encontrados</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex items-center text-green-600 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">Vagas Ativas</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
