import { SearchConfig } from "@/types/linkedinScraperType";
import { LinkedInScraper } from "@/utils/linkedinUtil";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const scraper = new LinkedInScraper();

    try {
      // Verificar autenticação
      const session = await getServerSession(req, res, authOptions);

      if (!session || !session.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { title, profession, technologies, location, keywords } = req.body;

      // Validar título obrigatório
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      // Constrói a string de busca combinando profissão, tecnologias e palavras-chave
      const searchTerms = [
        profession,
        ...(Array.isArray(technologies) ? technologies : []),
        ...(Array.isArray(keywords) ? keywords : []),
      ]
        .filter(Boolean)
        .join(" ");

      console.log("Termos de busca:", searchTerms);
      console.log("Localização:", location);

      console.log("Inicializando scraper...");
      await scraper.initialize();

      // ⚠️ Substitua pelas suas credenciais ou use variáveis de ambiente
      const email = process.env.LINKEDIN_EMAIL || "oliesantos124@gmail.com";
      const password = process.env.LINKEDIN_PASSWORD || "Jacare124";

      console.log("Realizando login...");
      await scraper.login(email, password);

      // Configuração da pesquisa
      const searchConfig: SearchConfig = {
        keyword: searchTerms || "desenvolvedor", // Fallback se vazio
        location: location || "Brasil",
        maxResults: 20,
      };

      console.log("Buscando perfis...");
      const profiles = await scraper.searchProfiles(searchConfig);

      console.log(`\nTotal de perfis encontrados: ${profiles.length}`);

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

      console.log(`✅ Pesquisa salva no banco com ID: ${search.id}`);

      // Salvar perfis no banco de dados
      const savedResults = [];

      for (const result of profiles) {
        try {
          // Extrair ID do LinkedIn da URL
          let linkedinId = "";
          const urlParts = result.profileUrl.split("/in/");
          if (urlParts.length > 1) {
            linkedinId = urlParts[1].split("/")[0].split("?")[0];
          } else {
            // Fallback se a URL não for padrão
            const parts = result.profileUrl
              .split("/")
              .filter((p) => p && p !== "https:" && p !== "www.linkedin.com");
            linkedinId = parts[parts.length - 1];
          }

          if (!linkedinId) {
            console.log(
              `⚠️ Não foi possível extrair linkedinId de: ${result.profileUrl}`
            );
            continue;
          }

          // Upsert do perfil (Salvar ou Atualizar)
          const profile = await prisma.candidate.upsert({
            where: { linkedinId },
            update: {
              fullName: result.name,
              headline: result.title,
              location: result.location || location,
              photoUrl: result.imageUrl,
              about: result.summary,
            },
            create: {
              userId: (session.user as any).id,
              source: "linkedin",
              linkedinId,
              linkedinUrl: result.profileUrl,
              fullName: result.name,
              headline: result.title,
              location: result.location || location,
              photoUrl: result.imageUrl,
              about: result.summary,
            },
          });

          console.log(
            `✅ Perfil salvo/atualizado: ${profile.fullName} (${linkedinId})`
          );

          // Criar link com a pesquisa
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
          console.error(`❌ Erro ao salvar perfil ${result.name}:`, err);
        }
      }

      console.log(
        `\n✅ Total de perfis salvos no banco: ${savedResults.length}`
      );

      // Retorna os resultados para o cliente
      res.status(200).json({
        success: true,
        count: savedResults.length,
        data: savedResults,
        searchId: search.id,
      });
    } catch (error: any) {
      console.error("Erro no handler de busca:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao realizar busca no LinkedIn",
        error: error.message,
      });
    } finally {
      await scraper.close();
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
