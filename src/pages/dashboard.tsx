import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { Search, FileText, Briefcase, TrendingUp, Users, Target, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo, {session.user?.name || 'Usuário'}!
          </h1>
          <p className="mt-2 text-gray-600">
            Gerencie suas buscas de candidatos e vagas em um só lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Nova Pesquisa */}
          <Link
            href="/candidates/search"
            className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 p-6"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Search className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pesquisar Candidatos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Busque perfis no LinkedIn por profissão, localização e tecnologias
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Começar busca <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

          {/* Card: Minhas Pesquisas */}
          <Link
            href="/searches"
            className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 p-6"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Minhas Pesquisas
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Veja e gerencie suas pesquisas anteriores e resultados
              </p>
              <div className="flex items-center text-emerald-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Ver pesquisas <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

          {/* Card: Vagas */}
          <Link
            href="/jobs"
            className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 p-6"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gerenciar Vagas
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Crie vagas e analise candidatos com IA
              </p>
              <div className="flex items-center text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Ver vagas <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Estatísticas rápidas */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estatísticas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total de Pesquisas</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Perfis Encontrados</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  0%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Vagas Ativas</p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
