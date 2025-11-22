import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { LinkedInScraper } from "@/utils/linkedinUtil";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { profileIds } = req.body;

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({ message: "profileIds array is required" });
    }

    console.log(`🔍 Iniciando scraping detalhado de ${profileIds.length} perfis`);

    // Busca os perfis no banco para obter as URLs
    const profiles = await prisma.linkedInProfile.findMany({
      where: {
        id: { in: profileIds },
      },
      select: {
        id: true,
        linkedinId: true,
        fullName: true,
      },
    });

    if (profiles.length === 0) {
      return res.status(404).json({ message: "No profiles found" });
    }

    // Monta as URLs dos perfis
    const profileUrls = profiles.map(
      (p: { id: string; linkedinId: string; fullName: string | null }) =>
        `https://www.linkedin.com/in/${p.linkedinId}`
    );

    // Inicializa o scraper (usa singleton do BrowserManager)
    const scraper = new LinkedInScraper();
    await scraper.initialize();

    // Verifica se está logado - não navega, apenas verifica estado atual
    const isLoggedIn = await scraper.isLoggedIn();
    console.log(`📋 Status de login: ${isLoggedIn ? "Logado" : "Não logado"}`);

    if (!isLoggedIn) {
      // NÃO fecha o scraper aqui para manter a sessão
      return res.status(401).json({
        message: "Sessão do LinkedIn expirada. Por favor, faça uma busca primeiro para efetuar o login.",
        requiresLogin: true,
      });
    }

    // Faz scraping dos perfis
    let scrapedProfiles;
    try {
      scrapedProfiles = await scraper.scrapeMultipleProfiles(profileUrls);
    } catch (scrapeError) {
      console.error("Erro durante scraping:", scrapeError);
      // NÃO fecha o browser em caso de erro
      return res.status(500).json({
        message: "Erro durante o scraping dos perfis",
        error: scrapeError instanceof Error ? scrapeError.message : "Unknown error",
      });
    }

    // Verifica se algum perfil foi extraído
    if (scrapedProfiles.length === 0) {
      // NÃO fecha o browser
      return res.status(401).json({
        message: "Nenhum perfil foi extraído. A sessão do LinkedIn pode ter expirado. Por favor, faça uma nova busca para efetuar o login.",
        requiresLogin: true,
        total: profileIds.length,
        success: 0,
        failed: profileIds.length,
      });
    }

    // Salva os resultados no banco
    const savedProfiles = [];

    for (const profile of scrapedProfiles) {
      try {
        const updated = await prisma.linkedInProfile.update({
          where: { linkedinId: profile.linkedinId },
          data: {
            fullName: profile.fullName || undefined,
            headline: profile.headline || undefined,
            location: profile.location || undefined,
            photoUrl: profile.photoUrl || undefined,
            about: profile.about || undefined,
            experience: profile.experience as any,
            education: profile.education as any,
            skills: profile.skills as any,
            languages: profile.languages as any,
            certifications: profile.certifications as any,
            rawData: profile as any,
            updatedAt: new Date(),
          },
        });

        savedProfiles.push({
          linkedinId: profile.linkedinId,
          fullName: profile.fullName,
          success: true,
        });

        console.log(`✅ Perfil salvo: ${profile.fullName}`);
      } catch (error) {
        console.error(`❌ Erro ao salvar perfil ${profile.linkedinId}:`, error);
        savedProfiles.push({
          linkedinId: profile.linkedinId,
          fullName: profile.fullName,
          success: false,
          error: "Failed to save to database",
        });
      }
    }

    // NÃO fecha o browser - mantém sessão ativa para próximas operações
    // O browser será fechado automaticamente após 30 min de inatividade

    return res.status(200).json({
      message: `Scraping completed for ${scrapedProfiles.length} profiles`,
      total: profileIds.length,
      success: scrapedProfiles.length,
      failed: profileIds.length - scrapedProfiles.length,
      profiles: savedProfiles,
    });
  } catch (error) {
    console.error("Scrape details error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
