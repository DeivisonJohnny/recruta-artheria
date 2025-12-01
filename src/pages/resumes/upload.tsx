import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import {
  Upload as UploadIcon,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  FileUp,
  AlertCircle,
  Eye,
} from "lucide-react";

interface ResumeFile {
  id: string;
  file: File;
  content: string;
  contentType: 'text' | 'pdf';
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  extractedData?: any;
}

interface ProcessedCandidate {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  processingStatus: string;
  createdAt: string;
}

export default function ResumeUpload() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processedCandidates, setProcessedCandidates] = useState<
    ProcessedCandidate[]
  >([]);
  const [showProcessed, setShowProcessed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchProcessedCandidates();
    }
  }, [status, router]);

  const fetchProcessedCandidates = async () => {
    try {
      const response = await fetch("/api/recrutaia/resumes");
      if (response.ok) {
        const data = await response.json();
        setProcessedCandidates(data);
      }
    } catch (error) {
      console.error("Error fetching processed candidates:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Filtrar apenas PDFs e TXTs
    const validFiles = files.filter(
      (file) =>
        file.type === "application/pdf" || file.type === "text/plain"
    );

    if (validFiles.length !== files.length) {
      toast.error("Apenas arquivos PDF e TXT são aceitos");
    }

    // Processar cada arquivo
    for (const file of validFiles) {
      const reader = new FileReader();
      const isPdf = file.type === "application/pdf";

      reader.onload = async (event) => {
        const result = event.target?.result;

        let content: string;
        if (isPdf && result instanceof ArrayBuffer) {
          // Converter PDF para base64
          const bytes = new Uint8Array(result);
          const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
          content = btoa(binary);
        } else {
          // TXT já vem como string
          content = result as string;
        }

        const resumeFile: ResumeFile = {
          id: Math.random().toString(36).substring(7),
          file,
          content,
          contentType: isPdf ? 'pdf' : 'text',
          status: "pending",
        };

        setResumes((prev) => [...prev, resumeFile]);
      };

      // Ler PDF como ArrayBuffer, TXT como texto
      if (isPdf) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeResume = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const processResumes = async () => {
    if (resumes.length === 0) {
      toast.error("Adicione pelo menos um currículo");
      return;
    }

    setUploading(true);

    try {
      // Marcar todos como processando
      setResumes((prev) =>
        prev.map((r) => ({ ...r, status: "processing" as const }))
      );

      const resumeData = resumes.map((r) => ({
        fileName: r.file.name,
        content: r.content,
        contentType: r.contentType,
      }));

      const response = await fetch("/api/recrutaia/resumes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumes: resumeData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar currículos");
      }

      // Atualizar status de cada currículo
      const { results } = data;

      setResumes((prev) =>
        prev.map((resume) => {
          const result = results.find(
            (r: any) => r.fileName === resume.file.name
          );

          if (!result) return resume;

          return {
            ...resume,
            status: result.success ? "completed" : "failed",
            error: result.error,
            extractedData: result.data,
          };
        })
      );

      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          `${successCount} currículo(s) processado(s) com sucesso!`
        );
        fetchProcessedCandidates();
      }

      if (failCount > 0) {
        toast.error(`${failCount} currículo(s) falharam no processamento`);
      }
    } catch (error) {
      console.error("Error processing resumes:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar currículos"
      );

      // Marcar todos como falhados
      setResumes((prev) =>
        prev.map((r) => ({
          ...r,
          status: "failed" as const,
          error: "Erro no processamento",
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const clearCompleted = () => {
    setResumes((prev) =>
      prev.filter((r) => r.status !== "completed" && r.status !== "failed")
    );
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

  const getStatusIcon = (status: ResumeFile["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="w-5 h-5 text-gray-400" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = (status: ResumeFile["status"]) => {
    switch (status) {
      case "pending":
        return "Aguardando";
      case "processing":
        return "Processando...";
      case "completed":
        return "Concluído";
      case "failed":
        return "Falhou";
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <UploadIcon className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Upload de Currículos
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Faça upload de currículos em massa para extrair dados com IA e
            adicionar ao banco de talentos
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 mb-6 hover:border-orange-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="resume-upload"
          />
          <label
            htmlFor="resume-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <FileUp className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Clique para selecionar currículos
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              ou arraste e solte aqui
            </p>
            <p className="text-xs text-gray-400">
              Suporta arquivos PDF e TXT (máximo 10MB cada)
            </p>
          </label>
        </div>

        {/* Files List */}
        {resumes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Currículos para processar ({resumes.length})
              </h2>
              <div className="flex gap-2">
                {resumes.some(
                  (r) => r.status === "completed" || r.status === "failed"
                ) && (
                  <button
                    onClick={clearCompleted}
                    className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Limpar processados
                  </button>
                )}
                <button
                  onClick={processResumes}
                  disabled={uploading || resumes.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4" />
                      Processar Todos
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {getStatusIcon(resume.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {resume.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(resume.file.size / 1024).toFixed(1)} KB •{" "}
                      {getStatusText(resume.status)}
                    </p>
                    {resume.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {resume.error}
                      </p>
                    )}
                  </div>
                  {resume.status === "pending" && (
                    <button
                      onClick={() => removeResume(resume.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Como funciona
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  1. Selecione um ou mais currículos em PDF ou TXT
                </li>
                <li>
                  2. A IA irá extrair automaticamente os dados de cada currículo
                </li>
                <li>
                  3. Os candidatos serão salvos no banco de dados
                </li>
                <li>
                  4. Você poderá visualizar e gerenciar os candidatos
                  posteriormente
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Processed Candidates */}
        {processedCandidates.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Candidatos Processados ({processedCandidates.length})
              </h2>
              <button
                onClick={() => setShowProcessed(!showProcessed)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                {showProcessed ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {showProcessed && (
              <div className="space-y-2">
                {processedCandidates.slice(0, 10).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {candidate.fullName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {candidate.email && `${candidate.email} • `}
                        {candidate.location && `${candidate.location} • `}
                        {new Date(candidate.createdAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {candidate.skills.slice(0, 5).map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        candidate.processingStatus === "completed"
                          ? "bg-green-100 text-green-700"
                          : candidate.processingStatus === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {candidate.processingStatus === "completed"
                        ? "Completo"
                        : candidate.processingStatus === "failed"
                        ? "Falhou"
                        : "Processando"}
                    </div>
                  </div>
                ))}
                {processedCandidates.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{processedCandidates.length - 10} candidatos...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
