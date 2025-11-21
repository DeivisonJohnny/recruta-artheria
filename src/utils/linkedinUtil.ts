// src/linkedin-scraper.ts
import { Page } from "puppeteer";
import { LinkedInProfile, SearchConfig } from "../types/linkedinScraperType";
import BrowserManager from "./browserManager";

export class LinkedInScraper {
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.page = await BrowserManager.getPage();
    console.log("✅ LinkedInScraper inicializado com navegador compartilhado");
  }

  async isLoggedIn(): Promise<boolean> {
    return await BrowserManager.isLoggedIn();
  }

  async searchProfiles(config: SearchConfig): Promise<LinkedInProfile[]> {
    if (!this.page) {
      throw new Error("Scraper não inicializado. Chame initialize() primeiro.");
    }

    const profiles: LinkedInProfile[] = [];
    let currentKeyword = config.keyword;
    let searchUrl = this.buildSearchUrl(currentKeyword);

    try {
      // Escuta logs do navegador para debug
      this.page.on("console", (msg) => {
        const type = msg.type();
        if (type === "log" || type === "warn" || type === "error") {
          console.log(`[Browser ${type.toUpperCase()}] ${msg.text()}`);
        }
      });

      console.log(`Navegando para: ${searchUrl}`);
      await this.page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Aguarda a página carregar completamente antes de aplicar filtros
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Tenta aplicar o filtro de localização se fornecido
      if (config.location) {
        console.log(`\n🎯 Aplicando filtro de localização: ${config.location}`);
        const locationApplied = await this.applyLocationFilter(config.location);

        if (locationApplied) {
          console.log(
            "✅ Filtro de localização aplicado com sucesso via botão!"
          );
          // Aguarda os resultados filtrarem
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.log(
            "⚠️ Filtro visual falhou. Tentando recarregar com localização na keyword..."
          );
          currentKeyword = `${config.keyword} ${config.location}`;
          searchUrl = this.buildSearchUrl(currentKeyword);

          await this.page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Aguarda os resultados carregarem
      try {
        await this.page.waitForSelector(
          ".reusable-search__result-container, .entity-result, .artdeco-entity-lockup, div[data-view-name='people-search-result']",
          { timeout: 10000 }
        );
      } catch (e) {
        console.log(
          "⚠️ Container principal não encontrado imediatamente. Continuando..."
        );
      }

      // Scroll para carregar mais resultados
      await this.autoScroll();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Coleta os perfis
      const extractedProfiles = await this.page.evaluate(() => {
        const data: any[] = [];
        const clean = (text: string | undefined | null) =>
          text ? text.replace(/\s+/g, " ").trim() : "";

        // Seletores de container expandidos
        const containerSelectors = [
          ".reusable-search__result-container",
          "li.reusable-search__result-container",
          ".entity-result",
          ".artdeco-entity-lockup",
          "div[data-view-name='people-search-result']", // Novo seletor baseado no dump
          "li[data-view-name='search-result']", // Adicional
          ".search-result__wrapper", // Adicional
        ];

        let containers: Element[] = [];
        const seen = new Set();

        // Log detalhado de cada seletor
        for (const sel of containerSelectors) {
          const found = document.querySelectorAll(sel);
          console.log(
            `Seletor "${sel}": ${found.length} elementos encontrados`
          );
          found.forEach((el) => {
            if (!seen.has(el)) {
              seen.add(el);
              containers.push(el);
            }
          });
        }
        console.log(
          `Total de containers únicos encontrados: ${containers.length}`
        );

        if (containers.length === 0) {
          console.log(
            "❌ Nenhum container encontrado com os seletores padrão."
          );
          return [];
        }

        containers.forEach((container, index) => {
          try {
            console.log(
              `\n--- Processando container ${index + 1}/${
                containers.length
              } ---`
            );

            // Verifica se o container é o elemento alvo ou se contém o elemento alvo
            const peopleSearchResult =
              container.getAttribute("data-view-name") ===
              "people-search-result"
                ? container
                : container.querySelector(
                    '[data-view-name="people-search-result"]'
                  );

            // Lógica específica para estrutura baseada em data-view-name
            if (peopleSearchResult) {
              let nameLink = peopleSearchResult.querySelector(
                '[data-view-name="search-result-lockup-title"]'
              );
              let profileUrl = nameLink?.getAttribute("href")?.split("?")[0];
              let name = clean(nameLink?.textContent);

              // Se não achou link/nome padrão, pula este container
              if (!name || !profileUrl) {
                console.log(
                  `⚠️ Container sem link/nome válido - ignorando (pode ser perfil bloqueado)`
                );
                return;
              }

              if (name && profileUrl) {
                const paragraphs = Array.from(
                  peopleSearchResult.querySelectorAll("p")
                );

                let headline = "";
                let location = "";

                const infoParagraphs = paragraphs.filter(
                  (p) => !p.contains(nameLink!)
                );

                if (infoParagraphs.length > 0)
                  headline = clean(infoParagraphs[0].textContent);
                if (infoParagraphs.length > 1)
                  location = clean(infoParagraphs[1].textContent);

                const imgTag = peopleSearchResult.querySelector("img");
                let imageUrl = imgTag ? imgTag.getAttribute("src") : undefined;
                if (
                  imageUrl &&
                  (imageUrl.includes("ghost-person") ||
                    imageUrl.includes("data:image"))
                ) {
                  imageUrl = undefined;
                }

                console.log(
                  `✅ Perfil normal extraído (data-view-name): ${name}`
                );
                data.push({
                  name,
                  title: headline,
                  profileUrl,
                  location,
                  imageUrl,
                  summary: "",
                });
                return;
              } else {
                console.log(
                  `⚠️ Container data-view-name sem nome ou profileUrl válido`
                );
              }
            }

            // Lógica Padrão (Antiga) para outras estruturas
            const titleSelectors = [
              ".entity-result__title-text",
              ".artdeco-entity-lockup__title",
              ".search-result__title",
            ];

            let titleContainer = null;
            for (const sel of titleSelectors) {
              titleContainer = container.querySelector(sel);
              if (titleContainer) break;
            }

            let nameLink = null;
            if (titleContainer) {
              nameLink =
                titleContainer.querySelector("a.app-aware-link") ||
                titleContainer.querySelector("a");
            } else {
              const possibleLinks = Array.from(
                container.querySelectorAll('a[href*="/in/"]')
              );
              nameLink = possibleLinks.find(
                (l) =>
                  (l as HTMLElement).innerText?.length > 3 &&
                  !l.getAttribute("href")?.includes("/company/")
              );
            }

            // Se não encontrou nameLink, pula este container
            if (!nameLink) {
              console.log(
                `⚠️ Container sem nameLink - ignorando (pode ser perfil bloqueado)`
              );
              return;
            }

            const profileUrl = nameLink.getAttribute("href")?.split("?")[0];
            const nameSpan = nameLink.querySelector('span[aria-hidden="true"]');
            const name = clean(
              nameSpan ? nameSpan.textContent : nameLink.textContent
            );

            if (!name || !profileUrl || !profileUrl.includes("/in/")) {
              console.log(
                `⚠️ Pulando: nome="${name}", profileUrl="${profileUrl}"`
              );
              return;
            }

            if (
              nameLink.closest(".entity-result__simple-insight-text") ||
              nameLink.closest(".entity-result__bottom-small")
            ) {
              console.log(`⚠️ Pulando: link dentro de insight ou bottom-small`);
              return;
            }

            const headlineSelectors = [
              ".entity-result__primary-subtitle",
              ".artdeco-entity-lockup__subtitle",
            ];
            let headlineEl = null;
            for (const sel of headlineSelectors) {
              headlineEl = container.querySelector(sel);
              if (headlineEl) break;
            }
            const title = clean(headlineEl?.textContent);

            const locationSelectors = [
              ".entity-result__secondary-subtitle",
              ".artdeco-entity-lockup__caption",
            ];
            let locationEl = null;
            for (const sel of locationSelectors) {
              locationEl = container.querySelector(sel);
              if (locationEl) break;
            }
            const location = clean(locationEl?.textContent);

            const summaryEl = container.querySelector(
              ".entity-result__summary"
            );
            const summary = clean(summaryEl?.textContent);

            const imgTag =
              container.querySelector("img.presence-entity__image") ||
              container.querySelector("img");
            let imageUrl = imgTag ? imgTag.getAttribute("src") : undefined;

            if (
              imageUrl &&
              (imageUrl.includes("ghost-person") ||
                imageUrl.includes("data:image"))
            ) {
              imageUrl = undefined;
            }

            console.log(`✅ Perfil normal extraído (lógica padrão): ${name}`);
            data.push({
              name,
              title,
              profileUrl,
              location,
              imageUrl,
              summary,
            });
          } catch (e) {
            console.error(`[Browser] Erro ao processar container ${index}:`, e);
          }
        });

        console.log(`\n=== RESUMO DA EXTRAÇÃO ===`);
        console.log(`Containers processados: ${containers.length}`);
        console.log(`Perfis extraídos: ${data.length}`);
        console.log(
          `Taxa de sucesso: ${
            containers.length > 0
              ? ((data.length / containers.length) * 100).toFixed(1)
              : 0
          }%`
        );

        return data;
      });

      console.log(`✅ Extraídos ${extractedProfiles.length} perfis.`);

      // Salva HTML para debug se houver discrepância ou nenhum perfil
      if (extractedProfiles.length === 0) {
        console.log("⚠️ Nenhum perfil extraído. Salvando HTML para debug...");
        const html = await this.page.content();
        const fs = await import("fs");
        const path = await import("path");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        fs.writeFileSync(
          path.join(process.cwd(), `debug_linkedin_dump_${timestamp}.html`),
          html
        );

        // Captura screenshot para análise visual
        await this.page.screenshot({
          path: path.join(
            process.cwd(),
            `debug_linkedin_screenshot_${timestamp}.png`
          ),
          fullPage: true,
        });
        console.log(`📸 Screenshot e HTML salvos com timestamp: ${timestamp}`);
      }

      for (const p of extractedProfiles.slice(0, config.maxResults || 15)) {
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

  private buildSearchUrl(keyword: string): string {
    const baseUrl = "https://www.linkedin.com/search/results/people/";
    const params = new URLSearchParams();
    params.append("keywords", keyword);
    return `${baseUrl}?${params.toString()}`;
  }

  private async applyLocationFilter(location: string): Promise<boolean> {
    if (!this.page) return false;

    console.log(`📍 Tentando aplicar filtro de localização: ${location}`);

    try {
      // Aguarda a página carregar completamente
      await new Promise((r) => setTimeout(r, 2000));

      // Tira screenshot antes de começar (debug)
      console.log("📸 Tirando screenshot antes de aplicar filtro...");

      // Procura o botão "Localidades" com mais seletores
      console.log("🔍 Procurando botão 'Localidades'...");

      const filterButtonClicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        console.log(`Total de botões encontrados: ${buttons.length}`);

        const locationButton = buttons.find((b) => {
          const text = b.innerText?.toLowerCase() || "";
          const ariaLabel = b.getAttribute("aria-label")?.toLowerCase() || "";
          return (
            text.includes("localidades") ||
            text.includes("locations") ||
            ariaLabel.includes("localidades") ||
            ariaLabel.includes("locations")
          );
        });

        if (locationButton) {
          console.log(`✅ Botão encontrado: "${locationButton.innerText}"`);
          (locationButton as HTMLButtonElement).click();
          return true;
        }

        console.log("❌ Botão 'Localidades' não encontrado");
        return false;
      });

      if (!filterButtonClicked) {
        console.log("⚠️ Botão 'Localidades' não encontrado.");
        return false;
      }

      console.log("✅ Botão 'Localidades' clicado!");
      await new Promise((r) => setTimeout(r, 1500));

      // Procura o input de localização
      console.log("🔍 Procurando input de localização...");

      const inputSelectors = [
        'input[placeholder*="localidade" i]',
        'input[placeholder*="location" i]',
        'input[aria-label*="localidade" i]',
        'input[aria-label*="location" i]',
        ".artdeco-typeahead__input",
        'input[type="text"]',
      ];

      let inputElement = null;
      for (const sel of inputSelectors) {
        const elements = await this.page.$$(sel);
        for (const el of elements) {
          const isVisible = await el.evaluate((node) => {
            const element = node as HTMLElement;
            return !!(
              element.offsetWidth ||
              element.offsetHeight ||
              element.getClientRects().length
            );
          });

          if (isVisible) {
            inputElement = el;
            console.log(`✅ Input encontrado com seletor: ${sel}`);
            break;
          }
        }
        if (inputElement) break;
      }

      if (!inputElement) {
        console.log("⚠️ Input de localização não encontrado.");

        // Tira screenshot para debug
        const fs = await import("fs");
        const path = await import("path");
        await this.page.screenshot({
          path: path.join(process.cwd(), "debug_location_filter.png"),
          fullPage: true,
        });
        console.log("📸 Screenshot salvo: debug_location_filter.png");

        return false;
      }

      // Limpa e digita a localização
      console.log(`⌨️ Digitando localização: ${location}`);
      await inputElement.click({ clickCount: 3 }); // Seleciona todo o texto
      await this.page.keyboard.press("Backspace");
      await inputElement.type(location, { delay: 100 });

      // Aguarda sugestões aparecerem
      console.log("⏳ Aguardando sugestões...");
      await new Promise((r) => setTimeout(r, 2000));

      // Tenta selecionar a primeira sugestão
      console.log("🔽 Selecionando primeira sugestão...");
      await this.page.keyboard.press("ArrowDown");
      await new Promise((r) => setTimeout(r, 500));
      await this.page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 1000));

      // Procura e clica no botão "Exibir resultados" ou similar
      console.log("🔍 Procurando botão para aplicar filtro...");

      const applyButtonClicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const applyButton = buttons.find((b) => {
          const text = b.innerText?.toLowerCase() || "";
          const isVisible = b.offsetParent !== null;
          return (
            isVisible &&
            (text.includes("exibir") ||
              text.includes("show") ||
              text.includes("aplicar") ||
              text.includes("apply") ||
              text.includes("mostrar"))
          );
        });

        if (applyButton) {
          console.log(
            `✅ Botão de aplicar encontrado: "${applyButton.innerText}"`
          );
          (applyButton as HTMLButtonElement).click();
          return true;
        }

        console.log("⚠️ Botão de aplicar não encontrado, tentando Enter...");
        return false;
      });

      if (applyButtonClicked) {
        console.log("✅ Botão de aplicar clicado!");
        await this.page
          .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 })
          .catch(() => {
            console.log("⚠️ Navigation timeout (esperado)");
          });
      } else {
        // Fallback: pressiona Enter
        console.log("⌨️ Pressionando Enter como fallback...");
        await this.page.keyboard.press("Enter");
        await new Promise((r) => setTimeout(r, 2000));
      }

      console.log("✅ Filtro de localização aplicado com sucesso!");
      return true;
    } catch (error) {
      console.error("❌ Erro no filtro de localização:", error);

      // Salva screenshot do erro
      try {
        const fs = await import("fs");
        const path = await import("path");
        await this.page.screenshot({
          path: path.join(process.cwd(), "debug_location_error.png"),
          fullPage: true,
        });
        console.log("📸 Screenshot de erro salvo: debug_location_error.png");
      } catch (e) {
        console.log("⚠️ Não foi possível salvar screenshot de erro");
      }

      return false;
    }
  }

  private async autoScroll(): Promise<void> {
    if (!this.page) return;
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (
            totalHeight >= scrollHeight - window.innerHeight ||
            totalHeight > 15000
          ) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async login(email: string, password: string): Promise<void> {
    await BrowserManager.login(email, password);
  }

  async close(): Promise<void> {
    this.page = null;
  }
}
