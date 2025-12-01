import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { LinkedInScraper } from "@/utils/linkedinUtil";
import BrowserManager from "@/utils/browserManager";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Extract search parameters from body (POST) or query (GET)
    let keywords: string = "";
    let location: string = "";

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.method === "POST") {
      const body = req.body;

      // Combine all search parameters into a single keywords string
      const parts: string[] = [];

      if (body.profession) parts.push(body.profession);

      if (Array.isArray(body.technologies)) {
        parts.push(...body.technologies);
      } else if (body.technologies) {
        parts.push(body.technologies);
      }

      if (Array.isArray(body.keywords)) {
        parts.push(...body.keywords);
      } else if (body.keywords) {
        parts.push(body.keywords);
      }

      // Fallback: if no keywords found but title exists, use title as keyword
      if (parts.length === 0 && body.title) {
        parts.push(body.title);
      }

      keywords = parts.filter(Boolean).join(" ");
      location = body.location || "";
    } else {
      const profession = (req.query.profession as string) ?? "";
      location = (req.query.location as string) ?? "";
      const technologies = (req.query.technologies as string) ?? "";
      keywords = [profession, technologies].filter(Boolean).join(" ");
    }

    if (!keywords && !location) {
      return res
        .status(400)
        .json({ error: "Missing search keywords or location" });
    }

    const dsn = process.env.DSN;
    const accountId = process.env.ACCOUNT_ID;
    const apiKey = process.env.API_KEY;

    if (!dsn || !accountId || !apiKey) {
      console.error("Missing DSN configuration");
      return res.status(500).json({ error: "Server configuration missing" });
    }

    // Step 1: Get location ID if location is provided
    let locationIds: number[] = [];
    if (location) {
      const locationResponse = await fetch(
        `${dsn}/api/v1/linkedin/search/parameters?account_id=${accountId}&type=LOCATION&keywords=${encodeURIComponent(
          location
        )}&limit=1`,
        {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey,
            Accept: "application/json",
          },
        }
      );

      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        if (locationData.items && locationData.items.length > 0) {
          locationIds = [parseInt(locationData.items[0].id)];
        }
      }
    }

    // Step 2: Perform the search with location IDs
    const searchBody: {
      api: string;
      category: string;
      keywords?: string;
      locationId?: number[];
    } = {
      api: "classic",
      category: "people",
    };

    if (keywords) {
      searchBody.keywords = keywords;
    }

    if (locationIds.length > 0) {
      searchBody.locationId = locationIds;
    }

    const response = await fetch(
      `${dsn}/api/v1/linkedin/search?account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
      }
    );
    console.log("🚀 ~ handler ~ response:", response);

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "External API Error:",
        response.status,
        JSON.stringify(data, null, 2)
      );
    }

    // Transform the response to match frontend expectations
    if (data.items) {
      const profiles = data.items.map(
        (item: {
          id: string;
          name: string;
          headline?: string;
          location?: string;
          profile_picture_url?: string;
          profile_url?: string;
          public_identifier?: string;
        }) => ({
          id: item.public_identifier || item.id,
          name: item.name,
          headline: item.headline || "",
          location: item.location,
          photo_url: item.profile_picture_url,
          profile_url:
            item.profile_url ||
            (item.public_identifier
              ? `https://www.linkedin.com/in/${item.public_identifier}`
              : null),
        })
      );

      // Save search to database
      let search;
      try {
        search = await prisma.search.create({
          data: {
            userId: (session.user as any).id,
            title: req.body.title || keywords,
            profession: req.body.profession || null,
            location: location || null,
            technologies: req.body.technologies || [],
            keywords: req.body.keywords || [],
          },
        });
      } catch (err) {
        console.error("Error saving search:", err);
        // If search saving fails, we might still want to return results, but usually we want to persist.
        // For now, let's proceed but log error.
      }

      const savedResults = [];

      if (search) {
        for (const profile of profiles) {
          try {
            const linkedinId = profile.id;
            if (!linkedinId) continue;

            // Upsert Profile (now using Candidate table)
            const dbProfile = await prisma.candidate.upsert({
              where: { linkedinId },
              update: {
                fullName: profile.name,
                headline: profile.headline,
                location: profile.location,
                photoUrl: profile.photo_url,
              },
              create: {
                userId: (session.user as any).id,
                source: 'linkedin',
                linkedinId,
                fullName: profile.name,
                headline: profile.headline,
                location: profile.location,
                photoUrl: profile.photo_url,
              },
            });

            // Upsert SearchResult
            await prisma.searchResult.upsert({
              where: {
                searchId_candidateId: {
                  searchId: search.id,
                  candidateId: dbProfile.id,
                },
              },
              update: { linkedinUrl: profile.profile_url },
              create: {
                searchId: search.id,
                candidateId: dbProfile.id,
                linkedinUrl: profile.profile_url,
              },
            });

            savedResults.push({
              ...profile,
              id: dbProfile.id, // Use DB ID for frontend consistency if needed, or keep linkedin ID.
              // The frontend search.tsx uses result.id as key.
              // The old handler returned: ...result, linkedinId, id: profile.id
              linkedinId: profile.id,
            });
          } catch (err) {
            console.error(`Error saving profile ${profile.name}:`, err);
            savedResults.push(profile); // Return profile even if save failed
          }
        }
      } else {
        // If search wasn't saved, just return profiles
        savedResults.push(...profiles);
      }

      return res.status(response.status).json({
        profiles: savedResults,
        paging: data.paging,
        cursor: data.cursor,
        searchId: search?.id,
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Original implementation kept as requested (renamed)
async function oldHandler(req: NextApiRequest, res: NextApiResponse) {
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

    // Marca sessão como logada após busca bem-sucedida
    if (scrapingResults.length > 0) {
      BrowserManager.markAsLoggedIn();
    }

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

        // Upsert do perfil (Salvar ou Atualizar) - now using Candidate table
        const profile = await prisma.candidate.upsert({
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
            userId: (session.user as any).id,
            source: 'linkedin',
            linkedinId,
            fullName: result.name,
            headline: result.title,
            location: result.location || location,
            photoUrl: result.imageUrl,
            about: result.summary,
            // Mantemos os dados existentes se não vierem novos
          },
        });

        // Criar link com a pesquisa
        // Usamos upsert aqui também para evitar duplicatas se rodar a mesma busca
        const searchResult = await prisma.searchResult.upsert({
          where: {
            searchId_candidateId: {
              searchId: search.id,
              candidateId: profile.id,
            },
          },
          update: {
            linkedinUrl: result.profileUrl,
          },
          create: {
            searchId: search.id,
            candidateId: profile.id,
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
