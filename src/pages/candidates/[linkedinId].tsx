import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  UserCircle2,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  ExternalLink,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

interface ProfileData {
  id: string;
  linkedinId: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  photoUrl: string | null;
  about: string | null;
  experience: any;
  education: any;
  skills: any;
  languages: any;
  certifications: any;
}

export default function CandidateProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { linkedinId } = router.query;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState("");
  const [scraping, setScraping] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (linkedinId && typeof linkedinId === "string") {
      fetchProfile(linkedinId);
    }
  }, [linkedinId]);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    setError("");
    setNotFound(false);

    try {
      const response = await fetch(`/api/recrutaia/linkedin/profile/${id}`);
      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setFromCache(data.fromCache !== undefined ? data.fromCache : false);
      } else if (response.status === 404) {
        setNotFound(true);
        setError(data.message || "Perfil não encontrado");
      } else {
        setError(data.message || "Erro ao buscar perfil");
      }
    } catch (err) {
      setError("Erro ao buscar perfil");
    } finally {
      setLoading(false);
    }
  };

  const scrapeProfile = async () => {
    if (!linkedinId || typeof linkedinId !== "string") return;

    setScraping(true);
    setError("");

    try {
      const response = await fetch("/api/recrutaia/linkedin/scrape-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkedinId }),
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setNotFound(false);
        setFromCache(false);
      } else {
        setError(data.message || "Erro ao fazer scraping do perfil");
      }
    } catch (err) {
      setError("Erro ao fazer scraping do perfil");
    } finally {
      setScraping(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Carregando perfil...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  if (error && !notFound) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">
                Erro ao carregar perfil
              </h3>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || (!profile && !loading)) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Perfil não encontrado
                </h3>
                <p className="text-yellow-800">
                  O perfil solicitado não está no banco de dados.
                </p>
              </div>
            </div>
            <button
              onClick={scrapeProfile}
              disabled={scraping}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando perfil do LinkedIn...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Buscar perfil do LinkedIn
                </>
              )}
            </button>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {fromCache && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Dados carregados do cache (economia de API)
            </p>
          </div>
        )}

        {/* Header do perfil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-sm">
          <div className="flex items-start gap-6">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName || "Profile"}
                className="w-28 h-28 rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-md">
                <UserCircle2 className="w-16 h-16 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.fullName || "Nome não disponível"}
              </h1>
              {profile.headline && (
                <p className="text-lg text-gray-600 mb-3">{profile.headline}</p>
              )}
              {profile.location && (
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              <a
                href={`https://www.linkedin.com/in/${profile.linkedinId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver perfil no LinkedIn
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Sobre */}
        {profile.about && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Sobre</h2>
            </div>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {profile.about}
            </p>
          </div>
        )}

        {/* Experiência */}
        {profile.experience &&
          Array.isArray(profile.experience) &&
          profile.experience.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Experiência
                </h2>
              </div>
              <div className="space-y-6">
                {profile.experience.map((exp: any, index: number) => (
                  <div
                    key={index}
                    className="relative pl-6 border-l-2 border-blue-200"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {exp.title || exp.position}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {exp.company}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {exp.startDate} - {exp.endDate || "Presente"}
                    </p>
                    {exp.description && (
                      <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Educação */}
        {profile.education &&
          Array.isArray(profile.education) &&
          profile.education.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Educação
                </h2>
              </div>
              <div className="space-y-5">
                {profile.education.map((edu: any, index: number) => (
                  <div
                    key={index}
                    className="relative pl-6 border-l-2 border-emerald-200"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-emerald-600 rounded-full"></div>
                    <h3 className="font-semibold text-gray-900">
                      {edu.school}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {edu.degree}{" "}
                      {edu.fieldOfStudy && `em ${edu.fieldOfStudy}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {edu.startDate} - {edu.endDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Skills */}
        {profile.skills &&
          Array.isArray(profile.skills) &&
          profile.skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Habilidades
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: any, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200"
                  >
                    {typeof skill === "string" ? skill : skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Certificações */}
        {profile.certifications &&
          Array.isArray(profile.certifications) &&
          profile.certifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Certificações
                </h2>
              </div>
              <div className="space-y-4">
                {profile.certifications.map((cert: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-purple-50 border border-purple-200 rounded-xl"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {cert.name || cert.title}
                    </h3>
                    <p className="text-sm text-purple-700 font-medium mt-1">
                      {cert.issuer || cert.organization}
                    </p>
                    {cert.date && (
                      <p className="text-xs text-gray-500 mt-2">{cert.date}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </Layout>
  );
}
