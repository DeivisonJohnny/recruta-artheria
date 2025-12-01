import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { candidateId } = req.query;

  if (!candidateId || typeof candidateId !== "string") {
    return res.status(400).json({ message: "Candidate ID is required" });
  }

  if (req.method === "GET") {
    try {
      const jobCandidate = await prisma.jobCandidate.findFirst({
        where: {
          id: candidateId,
          job: {
            userId: (session.user as any).id,
          },
        },
        include: {
          candidate: true,
          job: true,
        },
      });

      if (!jobCandidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      return res.status(200).json({ candidate: jobCandidate });
    } catch (error) {
      console.error("Fetch candidate analysis error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
