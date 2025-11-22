import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query; // Job ID

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Job ID is required" });
  }

  // Verify job belongs to user
  const job = await prisma.job.findFirst({
    where: {
      id,
      userId: (session.user as any).id,
    },
  });

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (req.method === "POST") {
    // Add candidates to job
    try {
      const { profileIds } = req.body;

      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "Profile IDs are required" });
      }

      // Create job candidates (skip duplicates)
      const results = await Promise.all(
        profileIds.map(async (profileId: string) => {
          try {
            const candidate = await prisma.jobCandidate.upsert({
              where: {
                jobId_profileId: {
                  jobId: id,
                  profileId,
                },
              },
              update: {}, // No update needed if already exists
              create: {
                jobId: id,
                profileId,
                status: "pending",
              },
              include: {
                profile: true,
              },
            });
            return { success: true, candidate };
          } catch (error) {
            console.error(`Error adding candidate ${profileId}:`, error);
            return { success: false, profileId, error: "Failed to add candidate" };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;

      return res.status(200).json({
        message: `${successCount} candidato(s) adicionado(s) à vaga`,
        results,
        successCount,
      });
    } catch (error) {
      console.error("Add candidates error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    // Remove candidate from job
    try {
      const { profileId } = req.body;

      if (!profileId) {
        return res.status(400).json({ message: "Profile ID is required" });
      }

      await prisma.jobCandidate.delete({
        where: {
          jobId_profileId: {
            jobId: id,
            profileId,
          },
        },
      });

      return res.status(200).json({ message: "Candidate removed from job" });
    } catch (error) {
      console.error("Remove candidate error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
