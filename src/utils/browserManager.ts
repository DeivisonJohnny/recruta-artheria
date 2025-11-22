// src/utils/browserManager.ts
import { Browser, Page } from "puppeteer";

interface BrowserInstance {
  browser: Browser;
  page: Page;
  isLoggedIn: boolean;
  lastUsed: number;
}

// Usar globalThis para manter singleton entre hot reloads do Next.js
const globalForBrowser = globalThis as unknown as {
  browserInstance: BrowserInstance | null;
  browserTimeoutId: NodeJS.Timeout | null;
};

class BrowserManager {
  private static readonly TIMEOUT = 30 * 60 * 1000; // 30 minutos de inatividade

  private static get instance(): BrowserInstance | null {
    return globalForBrowser.browserInstance || null;
  }

  private static set instance(value: BrowserInstance | null) {
    globalForBrowser.browserInstance = value;
  }

  private static get timeoutId(): NodeJS.Timeout | null {
    return globalForBrowser.browserTimeoutId || null;
  }

  private static set timeoutId(value: NodeJS.Timeout | null) {
    globalForBrowser.browserTimeoutId = value;
  }

  /**
   * Obtém ou cria uma instância do navegador
   */
  static async getInstance(): Promise<BrowserInstance> {
    // Se já existe uma instância ativa, verifica se ainda está conectada
    if (this.instance) {
      try {
        // Verifica se o browser ainda está conectado
        const isConnected = this.instance.browser.connected;
        if (isConnected) {
          console.log("♻️ Reutilizando navegador existente (conectado)");
          this.instance.lastUsed = Date.now();
          this.resetTimeout();
          return this.instance;
        } else {
          console.log("⚠️ Browser desconectado, criando novo...");
          this.instance = null;
        }
      } catch (e) {
        console.log("⚠️ Erro ao verificar browser, criando novo...");
        this.instance = null;
      }
    }

    console.log("🚀 Criando nova instância do navegador...");

    // Importa puppeteer-extra e plugin stealth dinamicamente
    const puppeteerExtra = (await import("puppeteer-extra")).default;
    const StealthPlugin = (await import("puppeteer-extra-plugin-stealth"))
      .default;

    puppeteerExtra.use(StealthPlugin());

    const browser = (await puppeteerExtra.launch({
      headless: false, // Mude para true em produção
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1366,768",
        "--disable-notifications",
        "--disable-extensions",
      ],
    })) as unknown as Browser;

    const page = await browser.newPage();

    // Configurações para evitar detecção
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1366, height: 768 });

    // Habilita interceptação de requisição para bloquear recursos pesados
    // COMENTADO: Permitindo imagens para extrair fotos de perfil
    /*
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    */

    this.instance = {
      browser,
      page,
      isLoggedIn: false,
      lastUsed: Date.now(),
    };

    this.resetTimeout();

    console.log("✅ Navegador criado com sucesso");
    return this.instance;
  }

  /**
   * Verifica se já está logado no LinkedIn
   * Método otimizado que evita navegação desnecessária
   */
  static async isLoggedIn(): Promise<boolean> {
    if (!this.instance) return false;

    try {
      const { page } = this.instance;
      const currentUrl = page.url();

      console.log(`🔍 Verificando login. URL atual: ${currentUrl}`);

      // Se a URL está em branco ou about:blank, precisamos navegar
      if (!currentUrl || currentUrl === "about:blank" || !currentUrl.includes("linkedin.com")) {
        console.log("📍 Navegando para LinkedIn para verificar sessão...");
        await page.goto("https://www.linkedin.com/feed/", {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        const finalUrl = page.url();
        const loggedIn = !finalUrl.includes("/login") && !finalUrl.includes("/authwall") && !finalUrl.includes("checkpoint");

        this.instance.isLoggedIn = loggedIn;
        console.log(loggedIn ? "✅ Sessão ativa" : "⚠️ Sessão expirada");
        return loggedIn;
      }

      // Se estamos em página de login/authwall, não estamos logados
      if (currentUrl.includes("/login") || currentUrl.includes("/authwall") || currentUrl.includes("checkpoint")) {
        console.log("⚠️ Página de login detectada - não está logado");
        this.instance.isLoggedIn = false;
        return false;
      }

      // Se estamos em qualquer outra página do LinkedIn, verificamos o nav bar
      if (currentUrl.includes("linkedin.com")) {
        try {
          // Verifica se o elemento de navegação global existe (indica usuário logado)
          const navExists = await page.evaluate(() => {
            return !!(
              document.querySelector(".global-nav__content") ||
              document.querySelector("#global-nav") ||
              document.querySelector(".global-nav") ||
              document.querySelector('[data-test-global-nav]')
            );
          });

          if (navExists) {
            console.log("✅ Já logado (nav bar detectada)");
            this.instance.isLoggedIn = true;
            return true;
          }

          // Se não encontrou nav bar, pode ser que a página ainda está carregando
          // Aguarda um pouco e tenta novamente
          await new Promise((r) => setTimeout(r, 1000));

          const navExistsRetry = await page.evaluate(() => {
            return !!(
              document.querySelector(".global-nav__content") ||
              document.querySelector("#global-nav") ||
              document.querySelector(".global-nav")
            );
          });

          if (navExistsRetry) {
            console.log("✅ Já logado (nav bar detectada após retry)");
            this.instance.isLoggedIn = true;
            return true;
          }

          // Se ainda não encontrou, pode ser uma página específica, vamos confiar na URL
          // Desde que não seja login/authwall
          console.log("✅ Assumindo logado baseado na URL válida do LinkedIn");
          this.instance.isLoggedIn = true;
          return true;
        } catch (e) {
          console.log("⚠️ Erro ao verificar nav bar:", e);
          // Em caso de erro, assumimos que está logado se a URL for válida
          this.instance.isLoggedIn = true;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      return false;
    }
  }

  /**
   * Realiza login no LinkedIn
   */
  static async login(email: string, password: string): Promise<void> {
    const { page } = await this.getInstance();

    // Verifica se já está logado
    if (await this.isLoggedIn()) {
      console.log("✅ Já está logado no LinkedIn");
      return;
    }

    console.log("🔐 Realizando login no LinkedIn...");

    try {
      await page.goto("https://www.linkedin.com/login", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector("#username", { timeout: 10000 });
      await page.type("#username", email);

      await page.waitForSelector("#password", { timeout: 10000 });
      await page.type("#password", password);

      await Promise.all([
        page.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }),
        page.click('[type="submit"]'),
      ]);

      const currentUrl = page.url();

      if (currentUrl.includes("checkpoint/challenge")) {
        throw new Error(
          "Verificação de segurança necessária. Complete a verificação manualmente."
        );
      }

      if (currentUrl.includes("/login")) {
        throw new Error("Login falhou. Verifique suas credenciais.");
      }

      if (this.instance) {
        this.instance.isLoggedIn = true;
      }

      console.log("✅ Login realizado com sucesso");
    } catch (error: any) {
      console.error("❌ Erro no login:", error);
      throw new Error(`Erro no login: ${error.message || error}`);
    }
  }

  /**
   * Obtém a página atual do navegador
   */
  static async getPage(): Promise<Page> {
    const instance = await this.getInstance();
    return instance.page;
  }

  /**
   * Reseta o timeout de inatividade
   */
  private static resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      console.log("⏰ Timeout de inatividade atingido, fechando navegador...");
      this.close();
    }, this.TIMEOUT);
  }

  /**
   * Fecha o navegador e limpa a instância
   */
  static async close(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.instance) {
      console.log("🔒 Fechando navegador...");
      try {
        await this.instance.browser.close();
      } catch (error) {
        console.error("Erro ao fechar navegador:", error);
      }
      this.instance = null;
      console.log("✅ Navegador fechado");
    }
  }

  /**
   * Força um novo login (útil quando a sessão expira)
   */
  static async forceRelogin(email: string, password: string): Promise<void> {
    if (this.instance) {
      this.instance.isLoggedIn = false;
    }
    await this.login(email, password);
  }

  /**
   * Marca a sessão como logada (útil após login manual ou busca bem-sucedida)
   */
  static markAsLoggedIn(): void {
    if (this.instance) {
      this.instance.isLoggedIn = true;
      console.log("✅ Sessão marcada como logada");
    }
  }

  /**
   * Retorna o status atual do login (sem verificar)
   */
  static getLoginStatus(): boolean {
    return this.instance?.isLoggedIn || false;
  }
}

export default BrowserManager;
