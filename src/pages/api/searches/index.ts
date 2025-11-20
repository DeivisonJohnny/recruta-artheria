import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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
    const searches = await prisma.search.findMany({
      where: {
        userId: (session.user as any).id,
      },
      include: {
        results: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ searches });
  } catch (error) {
    console.error('Fetch searches error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
