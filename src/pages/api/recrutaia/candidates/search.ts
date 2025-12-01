import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { query, skills, location, experience } = req.body;

    // Build dynamic where clause
    const whereConditions: Prisma.CandidateWhereInput[] = [];

    if (query && query.trim()) {
      const searchTerms = query.trim().toLowerCase();
      whereConditions.push({
        OR: [
          { fullName: { contains: searchTerms, mode: "insensitive" } },
          { headline: { contains: searchTerms, mode: "insensitive" } },
          { about: { contains: searchTerms, mode: "insensitive" } },
          { linkedinId: { contains: searchTerms, mode: "insensitive" } },
        ],
      });
    }

    if (location && location.trim()) {
      whereConditions.push({
        location: { contains: location.trim(), mode: "insensitive" },
      });
    }

    if (skills && skills.length > 0) {
      // Filter profiles that have at least one of the skills
      whereConditions.push({
        OR: skills.map((skill: string) => ({
          skills: { has: skill.trim() },
        })),
      });
    }

    // Build the final where clause
    const whereClause: Prisma.CandidateWhereInput =
      whereConditions.length > 0 ? { AND: whereConditions } : {};

    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit results
    });

    return res.status(200).json({
      candidates,
      total: candidates.length,
    });
  } catch (error) {
    console.error("Search candidates error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
