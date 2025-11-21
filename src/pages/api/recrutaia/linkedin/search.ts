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
    const { title, profession, location, technologies, keywords } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Construir query do LinkedIn
    const queryParts: string[] = [];

    if (profession) queryParts.push(profession);
    // Location is handled separately in the scraper config, but can be part of keywords if needed
    if (technologies && technologies.length > 0) {
      queryParts.push(...technologies);
    }
    if (keywords && keywords.length > 0) {
      queryParts.push(...keywords);
    }

    const linkedinQuery = queryParts.join(" ");

    console.log(
      `🔍 Iniciando busca: "${linkedinQuery}" em "${location || "Global"}"`
    );

    // Inicializar Scraper
    const scraper = new LinkedInScraper();
    await scraper.initialize();

    // Buscar perfis
    const scrapingResults = await scraper.searchProfiles({
      keyword: linkedinQuery,
      location: location,
      maxResults: 15, // Limit to avoid timeouts
    });

    console.log(`✅ Encontrados ${scrapingResults.length} perfis.`);

    // Salvar pesquisa no banco
    const search = await prisma.search.create({
      data: {
        userId: (session.user as any).id,
        title,
        profession: profession || null,
        location: location || null,
        technologies: technologies || [],
        keywords: keywords || [],
      },
    });

    // Salvar resultados e perfis
    const savedResults = [];

    for (const result of scrapingResults) {
      try {
        // Extrair ID do LinkedIn da URL
        let linkedinId = "";
        const urlParts = result.profileUrl.split("/in/");
        if (urlParts.length > 1) {
          linkedinId = urlParts[1].split("/")[0].split("?")[0];
        } else {
          // Fallback se a URL não for padrão (ex: sales navigator ou outra)
          // Tenta pegar o último segmento válido
          const parts = result.profileUrl
            .split("/")
            .filter((p) => p && p !== "https:" && p !== "www.linkedin.com");
          linkedinId = parts[parts.length - 1];
        }

        if (!linkedinId) continue;

        // Upsert do perfil (Salvar ou Atualizar)
        const profile = await prisma.linkedInProfile.upsert({
          where: { linkedinId },
          update: {
            fullName: result.name,
            headline: result.title,
            location: result.location || location, // Usa a location do perfil ou da busca
            photoUrl: result.imageUrl,
            about: result.summary,
            // Mantemos os dados existentes se não vierem novos
          },
          create: {
            linkedinId,
            fullName: result.name,
            headline: result.title,
            location: result.location || location,
            photoUrl: result.imageUrl,
            about: result.summary,
          },
        });

        // Criar link com a pesquisa
        // Usamos upsert aqui também para evitar duplicatas se rodar a mesma busca
        const searchResult = await prisma.searchResult.upsert({
          where: {
            searchId_profileId: {
              searchId: search.id,
              profileId: profile.id,
            },
          },
          update: {
            linkedinUrl: result.profileUrl,
          },
          create: {
            searchId: search.id,
            profileId: profile.id,
            linkedinUrl: result.profileUrl,
          },
        });

        savedResults.push({
          ...result,
          linkedinId,
          id: profile.id,
        });
      } catch (err) {
        console.error(`Erro ao salvar perfil ${result.name}:`, err);
      }
    }

    return res.status(200).json({
      searchId: search.id,
      data: savedResults, // Retornando 'data' para alinhar com o frontend
      count: savedResults.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
