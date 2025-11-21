// test-scraper.ts
// Script de teste para validar o scraping com sessão persistente
// Execute com: npx ts-node test-scraper.ts

import { LinkedInScraper } from "./src/utils/linkedinUtil";
import BrowserManager from "./src/utils/browserManager";
import * as dotenv from "dotenv";

dotenv.config();

async function testLinkedInScraper() {
  const email = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Credenciais do LinkedIn não encontradas no .env");
    console.log("\nAdicione ao seu arquivo .env:");
    console.log("LINKEDIN_EMAIL=seu-email@exemplo.com");
    console.log("LINKEDIN_PASSWORD=sua-senha");
    process.exit(1);
  }

  console.log("🚀 Iniciando teste do LinkedIn Scraper\n");
  console.log("━".repeat(60));

  const scraper = new LinkedInScraper();

  try {
    // ═══════════════════════════════════════════════════════════
    // TESTE 1: Primeira busca (com login)
    // ═══════════════════════════════════════════════════════════
    console.log("\n📋 TESTE 1: Primeira busca (com login)");
    console.log("─".repeat(60));

    await scraper.initialize();
    console.log("✓ Scraper inicializado");

    const isLoggedInBefore = await scraper.isLoggedIn();
    console.log(`✓ Status de login: ${isLoggedInBefore ? "logado" : "não logado"}`);

    if (!isLoggedInBefore) {
      console.log("🔐 Fazendo login...");
      const startLogin = Date.now();
      await scraper.login(email, password);
      const loginTime = Date.now() - startLogin;
      console.log(`✓ Login concluído em ${loginTime}ms`);
    }

    console.log("🔍 Buscando perfis de 'React Developer'...");
    const startSearch1 = Date.now();
    const profiles1 = await scraper.searchProfiles({
      keyword: "React Developer",
      maxResults: 5,
    });
    const searchTime1 = Date.now() - startSearch1;

    console.log(`✅ Primeira busca concluída em ${searchTime1}ms`);
    console.log(`📊 Perfis encontrados: ${profiles1.length}`);

    if (profiles1.length > 0) {
      console.log("\n👤 Exemplo de perfil:");
      console.log(JSON.stringify(profiles1[0], null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // TESTE 2: Segunda busca (SEM login - reutilizando sessão)
    // ═══════════════════════════════════════════════════════════
    console.log("\n━".repeat(60));
    console.log("\n📋 TESTE 2: Segunda busca (SEM login - sessão reutilizada)");
    console.log("─".repeat(60));

    const isStillLoggedIn = await scraper.isLoggedIn();
    console.log(`✓ Status de login: ${isStillLoggedIn ? "ainda logado ✅" : "deslogado ❌"}`);

    console.log("🔍 Buscando perfis de 'Node.js Developer'...");
    const startSearch2 = Date.now();
    const profiles2 = await scraper.searchProfiles({
      keyword: "Node.js Developer",
      maxResults: 5,
    });
    const searchTime2 = Date.now() - startSearch2;

    console.log(`✅ Segunda busca concluída em ${searchTime2}ms`);
    console.log(`📊 Perfis encontrados: ${profiles2.length}`);

    // ═══════════════════════════════════════════════════════════
    // TESTE 3: Terceira busca (ainda SEM login)
    // ═══════════════════════════════════════════════════════════
    console.log("\n━".repeat(60));
    console.log("\n📋 TESTE 3: Terceira busca (ainda sem login)");
    console.log("─".repeat(60));

    console.log("🔍 Buscando perfis de 'Python Developer'...");
    const startSearch3 = Date.now();
    const profiles3 = await scraper.searchProfiles({
      keyword: "Python Developer",
      location: "Brasil",
      maxResults: 5,
    });
    const searchTime3 = Date.now() - startSearch3;

    console.log(`✅ Terceira busca concluída em ${searchTime3}ms`);
    console.log(`📊 Perfis encontrados: ${profiles3.length}`);

    // ═══════════════════════════════════════════════════════════
    // RESUMO
    // ═══════════════════════════════════════════════════════════
    console.log("\n━".repeat(60));
    console.log("\n📊 RESUMO DOS TESTES");
    console.log("─".repeat(60));
    console.log(`⏱️  Tempo da 1ª busca (com login):   ${searchTime1}ms`);
    console.log(`⏱️  Tempo da 2ª busca (sem login):   ${searchTime2}ms`);
    console.log(`⏱️  Tempo da 3ª busca (sem login):   ${searchTime3}ms`);
    console.log(`\n💾 Total de perfis encontrados:     ${profiles1.length + profiles2.length + profiles3.length}`);

    const timeSaved = searchTime1 - ((searchTime2 + searchTime3) / 2);
    if (timeSaved > 0) {
      console.log(`\n🚀 Economia média de tempo (sem login): ~${Math.round(timeSaved)}ms por busca`);
      console.log(`   Isso representa aproximadamente ${Math.round((timeSaved / searchTime1) * 100)}% mais rápido!`);
    }

    console.log("\n━".repeat(60));
    console.log("\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!");
    console.log("\n💡 Dica: O navegador permanecerá aberto por 30 minutos.");
    console.log("   Execute este script novamente nos próximos 30 min");
    console.log("   para ver a sessão sendo reutilizada!\n");

  } catch (error: any) {
    console.error("\n❌ Erro durante os testes:", error.message);
    console.error("\nDetalhes:", error);
    process.exit(1);
  }
}

// Executar testes
testLinkedInScraper()
  .then(() => {
    console.log("🎉 Script finalizado!");
    console.log("⚠️  Navegador ainda está aberto para próximas requisições");
    console.log("   Use Ctrl+C para encerrar ou aguarde 30min para timeout\n");
  })
  .catch((error) => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  });
