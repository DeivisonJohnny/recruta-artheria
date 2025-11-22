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

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Job ID is required" });
  }

  if (req.method === "GET") {
    try {
      const job = await prisma.job.findFirst({
        where: {
          id,
          userId: (session.user as any).id,
        },
        include: {
          candidates: {
            include: {
              profile: true,
            },
            orderBy: {
              matchScore: "desc",
            },
          },
        },
      });

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.status(200).json({ job });
    } catch (error) {
      console.error("Fetch job error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "PUT") {
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
        isActive,
      } = req.body;

      const job = await prisma.job.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(requirements && { requirements }),
          ...(location !== undefined && { location }),
          ...(technologies && { technologies }),
          ...(experienceLevel !== undefined && { experienceLevel }),
          ...(employmentType !== undefined && { employmentType }),
          ...(salaryRange !== undefined && { salaryRange }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return res.status(200).json({ job });
    } catch (error) {
      console.error("Update job error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await prisma.job.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Delete job error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
