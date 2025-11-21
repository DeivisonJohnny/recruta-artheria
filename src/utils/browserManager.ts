// src/utils/browserManager.ts
import { Browser, Page } from "puppeteer";

interface BrowserInstance {
  browser: Browser;
  page: Page;
  isLoggedIn: boolean;
  lastUsed: number;
}

class BrowserManager {
  private static instance: BrowserInstance | null = null;
  private static readonly TIMEOUT = 30 * 60 * 1000; // 30 minutos de inatividade
  private static timeoutId: NodeJS.Timeout | null = null;

  /**
   * Obtém ou cria uma instância do navegador
   */
  static async getInstance(): Promise<BrowserInstance> {
    // Se já existe uma instância ativa, retorna ela
    if (this.instance) {
      console.log("♻️ Reutilizando navegador existente");
      this.instance.lastUsed = Date.now();
      this.resetTimeout();
      return this.instance;
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
   */
  static async isLoggedIn(): Promise<boolean> {
    if (!this.instance) return false;

    try {
      const { page } = this.instance;
      const currentUrl = page.url();

      // Otimização: Se já estamos em uma página interna do LinkedIn (não login/authwall),
      // verificamos se existe o menu de navegação global para confirmar login sem recarregar.
      if (
        currentUrl.includes("linkedin.com") &&
        !currentUrl.includes("/login") &&
        !currentUrl.includes("/authwall") &&
        !currentUrl.includes("checkpoint")
      ) {
        try {
          // Verifica se o elemento de navegação global existe (indica usuário logado)
          // Timeout curto pois deve estar visível se estivermos logados
          await page.waitForSelector(".global-nav__content, #global-nav", {
            timeout: 2000,
          });
          console.log("✅ Já logado (verificado via URL e seletor)");
          this.instance.isLoggedIn = true;
          return true;
        } catch (e) {
          console.log(
            "⚠️ URL interna mas sem nav bar, verificando via feed..."
          );
        }
      }

      // Tenta acessar o feed do LinkedIn
      await page.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const finalUrl = page.url();

      // Se não redirecionou para login, está logado
      const loggedIn =
        !finalUrl.includes("/login") && !finalUrl.includes("/authwall");

      this.instance.isLoggedIn = loggedIn;

      if (loggedIn) {
        console.log("✅ Sessão do LinkedIn ainda ativa");
      } else {
        console.log("⚠️ Sessão do LinkedIn expirada");
      }

      return loggedIn;
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
}

export default BrowserManager;
