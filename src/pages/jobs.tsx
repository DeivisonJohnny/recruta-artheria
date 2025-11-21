import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Job {
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
  candidates: any[];
}

export default function Jobs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      const response = await fetch("/api/jobs");
      const data = await response.json();

      if (response.ok) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
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
            <p className="mt-2 text-sm text-gray-600">Carregando vagas...</p>
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
              Gerenciar Vagas
            </h1>
            <p className="mt-1.5 text-sm text-gray-600">
              Crie vagas e analise candidatos com IA
            </p>
          </div>
          <Link
            href="/jobs/create"
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Vaga
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Nenhuma vaga criada
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Você ainda não criou nenhuma vaga. Comece agora!
            </p>
            <Link
              href="/jobs/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Criar primeira vaga
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h3>
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
                    <p className="mt-1.5 text-xs text-gray-600 line-clamp-2 mb-3">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.location && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.experienceLevel && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200 font-medium">
                          {job.experienceLevel}
                        </span>
                      )}
                      {job.technologies.slice(0, 3).map((tech, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg border border-purple-200"
                        >
                          {tech}
                        </span>
                      ))}
                      {job.technologies.length > 3 && (
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-200 font-medium">
                          +{job.technologies.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{job.candidates.length} candidatos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(job.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="ml-3 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Ver Detalhes
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
