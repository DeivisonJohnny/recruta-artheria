import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { extractResumeData } from '@/lib/gemini';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { resumes } = req.body;

    if (!Array.isArray(resumes) || resumes.length === 0) {
      return res.status(400).json({ error: 'Invalid resumes data' });
    }

    const results = [];

    for (const resume of resumes) {
      const { fileName, content, contentType } = resume;

      if (!fileName || !content) {
        results.push({
          fileName,
          success: false,
          error: 'Missing fileName or content',
        });
        continue;
      }

      try {
        // Criar registro inicial com status pending
        const candidate = await prisma.candidate.create({
          data: {
            userId: user.id,
            source: 'resume',
            fullName: 'Processando...',
            resumeFileName: fileName,
            processingStatus: 'processing',
          },
        });

        // Extrair dados com Gemini AI
        const extractedData = await extractResumeData(content, contentType || 'text');

        // Atualizar com os dados extraídos
        const updatedCandidate = await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            fullName: extractedData.fullName,
            email: extractedData.email,
            phone: extractedData.phone,
            location: extractedData.location,
            summary: extractedData.summary,
            experience: extractedData.experience as any,
            education: extractedData.education as any,
            skills: extractedData.skills as any,
            languages: extractedData.languages as any,
            certifications: extractedData.certifications as any,
            projects: extractedData.projects as any,
            linkedinUrl: extractedData.linkedinUrl,
            portfolioUrl: extractedData.portfolioUrl,
            githubUrl: extractedData.githubUrl,
            extractedData: extractedData as any,
            processingStatus: 'completed',
          },
        });

        results.push({
          fileName,
          success: true,
          candidateId: updatedCandidate.id,
          data: extractedData,
        });
      } catch (error) {
        console.error(`Error processing resume ${fileName}:`, error);

        // Tentar atualizar o registro com erro
        try {
          await prisma.candidate.updateMany({
            where: {
              userId: user.id,
              source: 'resume',
              resumeFileName: fileName,
              processingStatus: 'processing',
            },
            data: {
              processingStatus: 'failed',
              processingError:
                error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (updateError) {
          console.error('Error updating failed status:', updateError);
        }

        results.push({
          fileName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to process resumes',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
