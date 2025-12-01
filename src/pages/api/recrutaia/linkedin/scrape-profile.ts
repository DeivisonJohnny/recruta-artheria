import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/recrutaia/linkedin/scrape-profile
 *
 * Faz scraping de um perfil do LinkedIn usando a API do ScrapingDog.
 * Salva ou atualiza os dados no banco de dados.
 *
 * Body: { linkedinId: string }
 */
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
    const { linkedinId } = req.body;

    if (!linkedinId || typeof linkedinId !== "string") {
      return res.status(400).json({ message: "linkedinId is required" });
    }

    // Verificar se a API key do ScrapingDog está configurada
    const scrapingDogApiKey = process.env.SCRAPINGDOG_API_KEY;

    if (!scrapingDogApiKey) {
      return res
        .status(500)
        .json({ message: "ScrapingDog API key not configured" });
    }

    // Fazer a chamada para a API do ScrapingDog com premium=true
    const scrapingDogUrl = `https://api.scrapingdog.com/profile?api_key=${scrapingDogApiKey}&id=${linkedinId}&type=profile&premium=true&webhook=false&fresh=false`;

    console.log("Fetching profile from ScrapingDog (premium):", linkedinId);

    const response = await fetch(scrapingDogUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ScrapingDog API error:", response.status, errorText);
      return res.status(response.status).json({
        message: "Failed to fetch profile from ScrapingDog",
        error: errorText,
      });
    }

    const profileData = await response.json();

    // Verificar se a API retornou erro
    if (profileData.success === false || profileData.message) {
      console.error("ScrapingDog API error:", profileData.message);
      return res.status(400).json({
        message: profileData.message || "Failed to fetch profile from ScrapingDog",
      });
    }

    // Extrair dados relevantes da resposta do ScrapingDog
    const extractedData = {
      fullName: profileData.name || profileData.fullName || null,
      headline: profileData.headline || null,
      location: profileData.location || null,
      photoUrl: profileData.photoUrl || profileData.profilePicture || null,
      about: profileData.about || profileData.summary || null,
      experience: profileData.experience || null,
      education: profileData.education || null,
      skills: profileData.skills || null,
      languages: profileData.languages || null,
      certifications: profileData.certifications || null,
    };

    // Salvar ou atualizar no banco
    const profile = await prisma.candidate.upsert({
      where: { linkedinId },
      update: {
        ...extractedData,
        rawData: profileData,
        source: "linkedin",
        updatedAt: new Date(),
      },
      create: {
        linkedinId,
        ...extractedData,
        rawData: profileData,
        source: "linkedin",
        user: {
          connect: { id: (session.user as any).id },
        },
      },
    });

    console.log("Profile scraped and saved:", profile.id);

    return res.status(200).json({
      profile: {
        id: profile.id,
        linkedinId: profile.linkedinId,
        fullName: profile.fullName,
        headline: profile.headline,
        location: profile.location,
        photoUrl: profile.photoUrl,
        about: profile.about,
        experience: profile.experience,
        education: profile.education,
        skills: profile.skills,
        languages: profile.languages,
        certifications: profile.certifications,
        source: profile.source,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      scraped: true,
    });
  } catch (error) {
    console.error("Profile scraping error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
