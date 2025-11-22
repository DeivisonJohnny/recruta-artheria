import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Search ID is required" });
  }

  try {
    const search = await prisma.search.findFirst({
      where: {
        id,
        userId: (session.user as any).id,
      },
      include: {
        results: {
          include: {
            profile: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!search) {
      return res.status(404).json({ message: "Search not found" });
    }

    return res.status(200).json({ search });
  } catch (error) {
    console.error("Fetch search error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
