import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          userId: (session.user as any).id,
        },
        include: {
          candidates: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ jobs });
    } catch (error) {
      console.error('Fetch jobs error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        requirements,
        location,
        technologies,
        experienceLevel,
        employmentType,
        salaryRange,
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }

      const job = await prisma.job.create({
        data: {
          userId: (session.user as any).id,
          title,
          description,
          requirements: requirements || [],
          location: location || null,
          technologies: technologies || [],
          experienceLevel: experienceLevel || null,
          employmentType: employmentType || null,
          salaryRange: salaryRange || null,
          isActive: true,
        },
      });

      return res.status(201).json({ job });
    } catch (error) {
      console.error('Create job error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
