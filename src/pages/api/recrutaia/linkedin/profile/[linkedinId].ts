import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/recrutaia/linkedin/profile/[linkedinId]
 *
 * Busca um candidato no banco de dados por ID ou linkedinId.
 * Este endpoint APENAS retorna dados existentes no banco.
 * Para fazer scraping de novos perfis do LinkedIn, use POST /api/recrutaia/linkedin/scrape-profile
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { linkedinId } = req.query;

    if (!linkedinId || typeof linkedinId !== "string") {
      return res.status(400).json({ message: "ID is required" });
    }

    // Buscar perfil por ID ou linkedinId
    const profile = await prisma.candidate.findFirst({
      where: {
        OR: [
          { id: linkedinId },
          { linkedinId },
        ],
      },
    });

    // Se não encontrou, retornar 404
    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
        suggestion: "Use POST /api/recrutaia/linkedin/scrape-profile to fetch from LinkedIn"
      });
    }

    // Retornar dados do perfil
    return res.status(200).json({
      profile: {
        id: profile.id,
        linkedinId: profile.linkedinId,
        fullName: profile.fullName,
        headline: profile.headline,
        location: profile.location,
        photoUrl: profile.photoUrl,
        about: profile.about,
        summary: profile.summary,
        experience: profile.experience,
        education: profile.education,
        skills: profile.skills,
        languages: profile.languages,
        certifications: profile.certifications,
        projects: profile.projects,
        email: profile.email,
        phone: profile.phone,
        linkedinUrl: profile.linkedinUrl,
        portfolioUrl: profile.portfolioUrl,
        githubUrl: profile.githubUrl,
        source: profile.source,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
