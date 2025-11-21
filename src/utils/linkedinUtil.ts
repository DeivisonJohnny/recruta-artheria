// src/linkedin-scraper.ts
import { Page } from "puppeteer";
import { LinkedInProfile, SearchConfig } from "../types/linkedinScraperType";
import BrowserManager from "./browserManager";

export class LinkedInScraper {
  private page: Page | null = null;

  async initialize(): Promise<void> {
    // Obtém a página do navegador compartilhado
    this.page = await BrowserManager.getPage();
    console.log("✅ LinkedInScraper inicializado com navegador compartilhado");
  }

  async searchProfiles(config: SearchConfig): Promise<LinkedInProfile[]> {
    if (!this.page) {
      throw new Error("Scraper não inicializado. Chame initialize() primeiro.");
    }

    const profiles: LinkedInProfile[] = [];
    const searchUrl = this.buildSearchUrl(config);

    try {
      console.log(`Navegando para: ${searchUrl}`);
      // domcontentloaded é muito mais rápido que networkidle2
      await this.page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Se houver localização configurada, tenta aplicar o filtro visualmente
      let locationApplied = false;
      if (config.location) {
        locationApplied = await this.applyLocationFilter(config.location);

        // Se falhou ao aplicar visualmente, recarrega a página com o parâmetro na URL (Fallback robusto)
        if (!locationApplied) {
          console.log(
            "⚠️ Fallback: Recarregando página com filtro de localização na URL..."
          );
          const urlWithLocation = `${searchUrl}&location=${encodeURIComponent(
            config.location
          )}`;
          await this.page.goto(urlWithLocation, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
        }
      }

      // Aguarda os resultados carregarem (seletor principal)
      try {
        await this.page.waitForSelector(
          ".search-results-container, .reusable-search__result-container",
          { timeout: 10000 }
        );
      } catch (e) {
        console.log(
          "Container principal não encontrado, tentando continuar..."
        );
      }

      // Escuta logs do navegador para debug
      this.page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

      // Scroll para carregar mais resultados com comportamento mais humano
      await this.autoScroll();

      // Aguarda um pouco após o scroll para garantir renderização final
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Coleta os perfis executando o script diretamente no navegador (mais robusto)
      const extractedProfiles = await this.page.evaluate(() => {
        const data: any[] = [];

        // Helper para limpar texto
        const clean = (text: string | undefined | null) =>
          text ? text.replace(/\s+/g, " ").trim() : "";

        // 1. Tenta encontrar containers de resultado padrão
        let containers = Array.from(
          document.querySelectorAll(
            ".reusable-search__result-container, li.reusable-search__result-container"
          )
        );

        // 2. Se não encontrar, tenta itens de lista genéricos que podem ser resultados
        if (containers.length === 0) {
          containers = Array.from(
            document.querySelectorAll(
              "li.artdeco-list__item, li.search-result, .entity-result"
            )
          );
        }

        console.log(
          `[Browser] Encontrados ${containers.length} containers potenciais.`
        );

        containers.forEach((container) => {
          try {
            // Tenta encontrar o link do nome (geralmente o ponto de partida)
            const nameLink =
              container.querySelector(".entity-result__title-text a") ||
              container.querySelector("span.entity-result__title-text a") ||
              container.querySelector("a.app-aware-link");

            if (!nameLink) return;

            // O nome geralmente está em um span com aria-hidden="true" para evitar duplicidade visual
            const nameSpan =
              nameLink.querySelector('span[aria-hidden="true"]') || nameLink;
            const name = clean(nameSpan.textContent);

            let url = nameLink.getAttribute("href");

            if (name && url && url.includes("/in/")) {
              // Tenta extrair cargo/headline
              const subtitle = container.querySelector(
                ".entity-result__primary-subtitle"
              );
              const title = clean(subtitle?.textContent);

              // Tenta extrair localização
              const loc = container.querySelector(
                ".entity-result__secondary-subtitle"
              );
              const location = clean(loc?.textContent);

              // Tenta extrair imagem
              const imgTag =
                container.querySelector("img.presence-entity__image") ||
                container.querySelector(".entity-result__image img");
              const imageUrl = imgTag ? imgTag.getAttribute("src") : undefined;

              // Tenta extrair resumo/snippet
              const summaryEl = container.querySelector(
                ".entity-result__summary"
              );
              const summary = clean(summaryEl?.textContent);

              if (!url.startsWith("http")) url = url.split("?")[0];

              data.push({
                name,
                title,
                profileUrl: url,
                location,
                imageUrl,
                summary,
              });
            }
          } catch (e) {
            console.error("[Browser] Erro ao processar container:", e);
          }
        });

        // FALLBACK: Se não encontrou nada estruturado, busca bruta por links de perfil
        if (data.length === 0) {
          console.log(
            "[Browser] Tentando fallback bruto para links de perfil..."
          );
          const allLinks = Array.from(
            document.querySelectorAll('a[href*="/in/"]')
          );
          console.log(
            `[Browser] Encontrados ${allLinks.length} links com '/in/' na página.`
          );

          const uniqueLinks = new Set();

          allLinks.forEach((a: any) => {
            const url = a.getAttribute("href").split("?")[0];
            const text = a.innerText ? a.innerText.trim() : "";

            // Log para debug de links individuais (amostra)
            if (Math.random() > 0.9)
              console.log(`[Browser] Analisando link: ${url} - Texto: ${text}`);

            // Ignora links que não parecem perfis de usuário (ex: /in/unavailable) ou duplicados
            if (
              url.includes("/in/") &&
              !uniqueLinks.has(url) &&
              text.length > 2 &&
              !url.includes("/company/") &&
              !text.toLowerCase().includes("linkedin member")
            ) {
              uniqueLinks.add(url);
              // Tenta achar o nome no texto do link ou no pai
              const name = text.split("\n")[0];

              // Tenta encontrar imagem no contexto próximo (pais/irmãos)
              let imageUrl = undefined;
              let currentElement = a;

              // Sobe até 6 níveis para tentar achar um container que englobe a imagem
              // MAS com uma verificação de segurança: o container não pode ter outros links de perfil diferentes
              for (let i = 0; i < 6; i++) {
                if (!currentElement.parentElement) break;

                const parent = currentElement.parentElement;

                // Verifica se este pai contém OUTROS links de perfil (o que indicaria que subimos demais e estamos na lista)
                const otherProfileLinks = Array.from(
                  parent.querySelectorAll('a[href*="/in/"]')
                ).filter(
                  (link: any) =>
                    link !== a &&
                    link.getAttribute("href")?.split("?")[0] !== url
                );

                if (otherProfileLinks.length > 0) {
                  // Subimos demais, paramos aqui para não pegar imagem de outro card
                  break;
                }

                currentElement = parent;

                // Busca imagem de perfil neste escopo restrito
                const img = currentElement.querySelector(
                  'img[src*="profile-displayphoto"], img.presence-entity__image, img.ghost-person'
                );

                if (img) {
                  const src = img.getAttribute("src");
                  // Evita pegar a imagem do próprio usuário logado (geralmente pequena na nav bar) ou imagens quebradas
                  if (src && src.length > 50 && !src.includes("data:image")) {
                    imageUrl = src;
                    // Se achou uma imagem válida num container seguro, pode parar
                    break;
                  }
                }
              }

              data.push({
                name: name,
                title: "Perfil LinkedIn", // Título genérico no fallback
                profileUrl: url,
                location: "",
                imageUrl: imageUrl,
              });
            }
          });
        }

        return data;
      });

      console.log(`Extraídos ${extractedProfiles.length} perfis via evaluate.`);

      if (extractedProfiles.length === 0) {
        console.log("⚠️ Nenhum perfil extraído. Salvando HTML para debug...");
        const containerHtml = await this.page.evaluate(() => {
          return document.documentElement.outerHTML;
        });

        try {
          const fs = await import("fs");
          const path = await import("path");
          const debugPath = path.join(
            process.cwd(),
            "debug_linkedin_dump.html"
          );
          fs.writeFileSync(debugPath, containerHtml);
          console.log(
            `HTML completo salvo em '${debugPath}'. Verifique se os perfis aparecem neste arquivo.`
          );
        } catch (err) {
          console.error("Erro ao salvar arquivo de debug:", err);
        }

        // Verifica se caiu em página de segurança ou authwall
        const pageTitle = await this.page.title();
        console.log("Título da página:", pageTitle);
      }

      for (const p of extractedProfiles.slice(0, config.maxResults || 10)) {
        profiles.push({
          name: p.name,
          title: p.title,
          profileUrl: p.profileUrl.startsWith("http")
            ? p.profileUrl
            : `https://www.linkedin.com${p.profileUrl}`,
          location: p.location,
          imageUrl: p.imageUrl,
          summary: p.summary,
        });
      }
    } catch (error) {
      console.error("Erro durante a pesquisa:", error);
    }

    return profiles;
  }

  private buildSearchUrl(config: SearchConfig): string {
    const baseUrl = "https://www.linkedin.com/search/results/people/";
    const params = new URLSearchParams();

    params.append("keywords", config.keyword);
    // Removido para usar o filtro visual que é mais preciso
    // if (config.location) {
    //   params.append("location", config.location);
    // }

    return `${baseUrl}?${params.toString()}`;
  }

  private async applyLocationFilter(location: string): Promise<boolean> {
    if (!this) return false; // Changed from !this.page to !this for safety, though !this.page is more specific.
    if (!this.page) return false;

    console.log(
      `📍 Tentando aplicar filtro de localização visualmente: ${location}`
    );

    try {
      // 1. Encontra e clica no botão "Localidades"
      const filterButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find(
          (b) =>
            b.innerText.includes("Localidades") ||
            b.innerText.includes("Locations")
        );
      });

      if (!filterButton) {
        console.log("⚠️ Botão de filtro de localidades não encontrado.");
        return false;
      }

      await (filterButton as any).click();

      // Aguarda o dropdown abrir
      await new Promise((r) => setTimeout(r, 1500));

      // 2. Digita a localização no input
      // Adicionado suporte para inglês e seletores genéricos
      const inputSelectors = [
        'input[placeholder="Adicionar uma localidade"]',
        'input[aria-label="Adicionar uma localidade"]',
        'input[placeholder="Add a location"]',
        'input[aria-label="Add a location"]',
        ".artdeco-typeahead__input",
      ];

      let inputElement = null;
      for (const selector of inputSelectors) {
        try {
          const el = await this.page.$(selector);
          if (el) {
            inputElement = el;
            break;
          }
        } catch (e) {}
      }

      if (!inputElement) {
        console.log("⚠️ Input de localização não encontrado no dropdown.");
        return false;
      }

      await inputElement.type(location);

      // 3. Aguarda as sugestões aparecerem
      try {
        await this.page.waitForSelector(".basic-typeahead__selectable-option", {
          timeout: 5000,
        });
        await new Promise((r) => setTimeout(r, 1000)); // Espera renderizar opções

        // 4. Clica na primeira sugestão
        await this.page.click(".basic-typeahead__selectable-option");
      } catch (e) {
        console.log(
          "⚠️ Nenhuma sugestão de localidade apareceu, tentando enviar assim mesmo..."
        );
        await this.page.keyboard.press("Enter");
      }

      await new Promise((r) => setTimeout(r, 1000));

      // 5. Clica no botão de aplicar filtro ("Exibir resultados")
      const applyButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find(
          (b) =>
            (b.innerText.includes("Exibir resultados") ||
              b.innerText.includes("Show results") ||
              b.innerText.includes("Aplicar") ||
              b.innerText.includes("Apply")) &&
            b.offsetParent !== null
        );
      });

      if (applyButton) {
        await (applyButton as any).click();
        console.log("✅ Filtro de localização aplicado com sucesso.");
        await this.page
          .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 })
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
        return true;
      } else {
        console.log("⚠️ Botão de aplicar filtro não encontrado.");
        // Tenta dar Enter se não achar o botão
        await this.page.keyboard.press("Enter");
        await new Promise((r) => setTimeout(r, 2000));
        return true; // Assume que o Enter funcionou
      }
    } catch (error) {
      console.error("❌ Erro ao aplicar filtro de localização:", error);
      return false;
    }
  }

  private async autoScroll(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 400; // Aumentado de 100 para 400 para scrollar mais rápido

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          // Scroll com leve variação para parecer humano, mas mais rápido
          window.scrollBy(0, distance + Math.floor(Math.random() * 50));
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50 + Math.floor(Math.random() * 50)); // Reduzido intervalo para 50-100ms
      });
    });
  }

  async login(email: string, password: string): Promise<void> {
    // Usa o BrowserManager para fazer login
    await BrowserManager.login(email, password);
  }

  async close(): Promise<void> {
    // Não fecha o navegador, pois ele é compartilhado
    // Use BrowserManager.close() se realmente precisar fechar
    console.log(
      "⚠️ Navegador compartilhado não será fechado. Use BrowserManager.close() se necessário."
    );
    this.page = null;
  }

  /**
   * Verifica se já está logado no LinkedIn
   */
  async isLoggedIn(): Promise<boolean> {
    return await BrowserManager.isLoggedIn();
  }

  /**
   * Força um novo login (útil quando a sessão expira)
   */
  async forceRelogin(email: string, password: string): Promise<void> {
    await BrowserManager.forceRelogin(email, password);
  }
}
