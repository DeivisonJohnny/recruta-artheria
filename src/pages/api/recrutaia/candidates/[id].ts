import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    // Buscar candidato por ID (funciona para ambos: LinkedIn e Currículo)
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { searchResults: true, jobCandidates: true },
        },
      },
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    return res.status(200).json({
      candidate: {
        id: candidate.id,
        source: candidate.source,
        linkedinId: candidate.linkedinId,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        headline: candidate.headline,
        location: candidate.location,
        photoUrl: candidate.photoUrl,
        about: candidate.about,
        summary: candidate.summary,
        experience: candidate.experience,
        education: candidate.education,
        skills: candidate.skills,
        languages: candidate.languages,
        certifications: candidate.certifications,
        projects: candidate.projects,
        linkedinUrl: candidate.linkedinUrl,
        portfolioUrl: candidate.portfolioUrl,
        githubUrl: candidate.githubUrl,
        resumeFileName: candidate.resumeFileName,
        processingStatus: candidate.processingStatus,
        createdAt: candidate.createdAt,
        _count: candidate._count,
      },
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
