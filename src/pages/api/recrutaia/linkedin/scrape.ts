import type { NextApiRequest, NextApiResponse } from "next";
import { LinkedInScraper } from "@/utils/linkedinUtil";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { keyword, location, maxResults = 10, email, password } = req.body;

    if (!keyword) {
      return res.status(400).json({ message: "Keyword is required" });
    }

    // IMPORTANTE: Em produção, armazene as credenciais de forma segura
    const linkedinEmail = email || process.env.LINKEDIN_EMAIL;
    const linkedinPassword = password || process.env.LINKEDIN_PASSWORD;

    if (!linkedinEmail || !linkedinPassword) {
      return res.status(400).json({
        message: "LinkedIn credentials not provided",
      });
    }

    console.log("🚀 Iniciando scraper do LinkedIn...");

    const scraper = new LinkedInScraper();
    await scraper.initialize();

    // Verifica se já está logado
    const isLoggedIn = await scraper.isLoggedIn();

    if (!isLoggedIn) {
      console.log("🔐 Realizando login no LinkedIn...");
      await scraper.login(linkedinEmail, linkedinPassword);
    } else {
      console.log("✅ Já está logado, reutilizando sessão!");
    }

    // Executa a pesquisa
    console.log(`🔍 Buscando perfis com keyword: ${keyword}`);
    const profiles = await scraper.searchProfiles({
      keyword,
      location,
      maxResults,
    });

    // Não fecha o navegador para reutilizar na próxima requisição
    // scraper.close(); // ❌ NÃO FAÇA ISSO

    console.log(`✅ ${profiles.length} perfis encontrados`);

    return res.status(200).json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error: any) {
    console.error("❌ Erro no scraping:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}
