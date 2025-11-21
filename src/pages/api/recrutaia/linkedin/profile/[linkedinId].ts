import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

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
      return res.status(400).json({ message: "LinkedIn ID is required" });
    }

    // Verificar se o perfil já existe no banco
    let profile = await prisma.linkedInProfile.findUnique({
      where: { linkedinId },
    });

    // Se o perfil existe e tem dados completos, retornar do cache
    if (profile && profile.fullName && profile.rawData) {
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
        },
        fromCache: true,
      });
    }

    // Se não existe ou está incompleto, buscar da API do ScrapingDog
    const scrapingDogApiKey = process.env.SCRAPINGDOG_API_KEY;

    if (!scrapingDogApiKey) {
      return res
        .status(500)
        .json({ message: "ScrapingDog API key not configured" });
    }

    const scrapingDogUrl = `https://api.scrapingdog.com/profile?api_key=${scrapingDogApiKey}&id=${linkedinId}&type=profile&premium=false&webhook=false&fresh=false`;

    const response = await fetch(scrapingDogUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch profile from ScrapingDog",
      });
    }

    const profileData = await response.json();

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
    profile = await prisma.linkedInProfile.upsert({
      where: { linkedinId },
      update: {
        ...extractedData,
        rawData: profileData,
        updatedAt: new Date(),
      },
      create: {
        linkedinId,
        ...extractedData,
        rawData: profileData,
      },
    });

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
      },
      fromCache: false,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
