import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

    // Buscar todos os candidatos de currículo do usuário
    const candidates = await prisma.candidate.findMany({
      where: {
        userId: user.id,
        source: 'resume'
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching resume candidates:', error);
    return res.status(500).json({
      error: 'Failed to fetch resume candidates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
