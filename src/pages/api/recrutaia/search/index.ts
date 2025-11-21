import { SearchConfig } from "@/types/linkedinScraperType";
import { LinkedInScraper } from "@/utils/linkedinUtil";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const scraper = new LinkedInScraper();

    try {
      const { profession, technologies, location, keywords } = req.body;

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

      // Retorna os resultados para o cliente
      res.status(200).json({
        success: true,
        count: profiles.length,
        data: profiles,
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
    return res.status(200);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
