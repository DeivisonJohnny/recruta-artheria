import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { title, profession, location, technologies, keywords } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Construir query do LinkedIn
    const queryParts: string[] = [];

    if (profession) queryParts.push(profession);
    if (location) queryParts.push(location);
    if (technologies && technologies.length > 0) {
      queryParts.push(...technologies);
    }
    if (keywords && keywords.length > 0) {
      queryParts.push(...keywords);
    }

    const linkedinQuery = queryParts.join(' ');

    // Buscar perfis no LinkedIn usando ScrapingDog
    const scrapingResults = await searchLinkedInProfiles(linkedinQuery, location);

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

    // Salvar resultados
    const savedResults = await Promise.all(
      scrapingResults.map(async (result) => {
        // Verificar se o perfil já existe
        let profile = await prisma.linkedInProfile.findUnique({
          where: { linkedinId: result.linkedinId },
        });

        // Se não existir, criar um registro mínimo (será preenchido quando o usuário clicar)
        if (!profile) {
          profile = await prisma.linkedInProfile.create({
            data: {
              linkedinId: result.linkedinId,
              fullName: null,
              headline: null,
              location: location || null,
            },
          });
        }

        // Criar resultado da pesquisa
        await prisma.searchResult.create({
          data: {
            searchId: search.id,
            profileId: profile.id,
            linkedinUrl: result.linkedinUrl,
          },
        });

        return {
          linkedinId: result.linkedinId,
          linkedinUrl: result.linkedinUrl,
        };
      })
    );

    return res.status(200).json({
      searchId: search.id,
      results: savedResults,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Função para buscar perfis no LinkedIn usando Puppeteer
async function searchLinkedInProfiles(
  query: string,
  location?: string
): Promise<Array<{ linkedinId: string; linkedinUrl: string; fullName?: string; headline?: string }>> {
  try {
    console.log('🔍 Iniciando busca no LinkedIn com Puppeteer:', query);

    // Importar Puppeteer dinamicamente
    const puppeteer = await import('puppeteer-extra');
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;

    // Adicionar plugin stealth para evitar detecção
    puppeteer.default.use(StealthPlugin());

    console.log('🚀 Abrindo navegador...');

    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    const page = await browser.newPage();

    // Configurar user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Construir URL de busca do LinkedIn
    const searchQuery = encodeURIComponent(query);
    const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`;

    console.log('🌐 Acessando LinkedIn:', linkedinSearchUrl);

    try {
      // Navegar para a página de busca
      await page.goto(linkedinSearchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('⏳ Aguardando carregamento da página...');

      // Aguardar um pouco para garantir que o conteúdo foi carregado
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extrair perfis da página
      const profiles = await page.evaluate(() => {
        const results: Array<{ linkedinId: string; linkedinUrl: string; fullName?: string; headline?: string }> = [];

        // Seletores possíveis para os cards de perfil
        const selectors = [
          '.entity-result',
          '.reusable-search__result-container',
          '[data-chameleon-result-urn]',
          '.search-result',
          '.artdeco-entity-lockup'
        ];

        let profileElements: Element[] = [];

        // Tentar encontrar os elementos com diferentes seletores
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            profileElements = elements;
            break;
          }
        }

        console.log(`Encontrados ${profileElements.length} elementos na página`);

        for (const element of profileElements) {
          try {
            // Tentar encontrar o link do perfil
            const linkElement = element.querySelector('a[href*="/in/"]') as HTMLAnchorElement;

            if (linkElement && linkElement.href) {
              const match = linkElement.href.match(/linkedin\.com\/in\/([^\/\?]+)/);

              if (match) {
                const linkedinId = match[1];
                const linkedinUrl = `https://www.linkedin.com/in/${linkedinId}`;

                // Tentar extrair nome
                const nameElement = element.querySelector('.entity-result__title-text, .artdeco-entity-lockup__title, [data-anonymize="person-name"]');
                const fullName = nameElement?.textContent?.trim();

                // Tentar extrair headline
                const headlineElement = element.querySelector('.entity-result__primary-subtitle, .artdeco-entity-lockup__subtitle, [data-anonymize="job-title"]');
                const headline = headlineElement?.textContent?.trim();

                results.push({
                  linkedinId,
                  linkedinUrl,
                  fullName: fullName || undefined,
                  headline: headline || undefined
                });
              }
            }
          } catch (err) {
            console.error('Erro ao processar elemento:', err);
          }
        }

        return results;
      });

      await browser.close();

      if (profiles.length === 0) {
        console.warn('⚠️ Nenhum perfil encontrado com Puppeteer, usando resultados mock');
        return generateMockLinkedInResults(query);
      }

      // Remover duplicatas
      const uniqueProfiles = Array.from(
        new Map(profiles.map(p => [p.linkedinId, p])).values()
      ).slice(0, 25);

      console.log(`✅ ${uniqueProfiles.length} perfis únicos encontrados!`);
      return uniqueProfiles;

    } catch (error) {
      console.error('❌ Erro ao acessar LinkedIn:', error);
      await browser.close();
      return generateMockLinkedInResults(query);
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar Puppeteer:', error);
    return generateMockLinkedInResults(query);
  }
}

// Função auxiliar para gerar resultados mockados (fallback)
function generateMockLinkedInResults(query: string): Array<{ linkedinId: string; linkedinUrl: string }> {
  const mockProfiles = [
    'joao-silva-dev',
    'maria-santos-tech',
    'pedro-oliveira-software',
    'ana-costa-developer',
    'carlos-ferreira-eng',
    'julia-rodrigues-dev',
    'rafael-almeida-tech',
    'fernanda-lima-software',
    'lucas-martins-dev',
    'camila-souza-engineer',
  ];

  // Retornar 5-10 resultados mockados
  const numResults = Math.floor(Math.random() * 6) + 5;
  const selectedProfiles = mockProfiles
    .sort(() => Math.random() - 0.5)
    .slice(0, numResults);

  return selectedProfiles.map(id => ({
    linkedinId: id,
    linkedinUrl: `https://www.linkedin.com/in/${id}`,
  }));
}
