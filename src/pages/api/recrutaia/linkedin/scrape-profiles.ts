import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

// Type definitions for Scrapingdog API response
interface ScrapingdogProfile {
  public_identifier?: string;
  profile_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  location?: string;
  summary?: string;
  profile_pic_url?: string;
  background_cover_image_url?: string;
  follower_count?: number;
  connection_count?: number;
  country_full_name?: string;
  occupation?: string;
  experiences?: any[];
  education?: any[];
  skills?: any[];
  languages?: any[];
  certifications?: any[];
  volunteering?: any[];
  recommendations?: any[];
  similar_profiles?: any[];
  articles?: any[];
  groups?: any[];
  people_also_viewed?: any[];
  activities?: any[];
  similarly_named_profiles?: any[];
  [key: string]: any; // Allow extra fields
}

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
    const { profiles } = req.body; // Expecting an array of profile IDs/URLs

    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: "Profiles must be an array" });
    }

    if (profiles.length === 0) {
      return res.status(400).json({ error: "No profiles provided" });
    }

    if (profiles.length > 5) {
      return res.status(400).json({ error: "Maximum of 5 profiles allowed" });
    }

    const apiKey =
      process.env.SCRAPINGDOG_API_KEY || "6921d46b307f062400b763d5";

    if (!apiKey) {
      console.error("Missing SCRAPINGDOG_API_KEY configuration");
      return res.status(500).json({ error: "Server configuration missing" });
    }

    const results = await Promise.all(
      profiles.map(async (rawId: string) => {
        try {
          // Extract ID if a full URL is provided
          let id = rawId;
          if (rawId.includes("linkedin.com/in/")) {
            const parts = rawId.split("/in/");
            if (parts.length > 1) {
              id = parts[1].split("/")[0].split("?")[0];
            }
          }

          id = decodeURIComponent(id);

          const queryParams = new URLSearchParams({
            api_key: apiKey,
            id: id,
            type: "profile",
            premium: "true",
            webhook: "false",
            fresh: "false",
          });

          const apiUrl = `https://api.scrapingdog.com/profile?${queryParams.toString()}`;

          console.log(`Fetching profile from Scrapingdog (premium): ${id}`);

          const response = await fetch(apiUrl);
          const responseData = await response.json();

          // Check for API error response (success: false)
          if (responseData.success === false || responseData.message) {
            console.error(
              `Scrapingdog API error for ${id}:`,
              responseData.message || "Unknown error"
            );

            const isRetryLater =
              responseData.message?.includes("try again") ||
              responseData.message?.includes("2-3 minutes");

            return {
              id,
              error: responseData.message || "Failed to fetch profile",
              status: response.status,
              retryLater: isRetryLater,
            };
          }

          if (!response.ok) {
            console.error(
              `Scrapingdog API error for ${id}:`,
              response.status,
              response.statusText
            );
            return {
              id,
              error: "Failed to fetch profile",
              status: response.status,
            };
          }

          // API returns an array, get the first element
          const data: ScrapingdogProfile = Array.isArray(responseData)
            ? responseData[0]
            : responseData;

          if (!data || Object.keys(data).length === 0) {
            return { id, error: "Profile not found", status: 404 };
          }

          return processProfileData(id, data, prisma, (session.user as any).id);
        } catch (err: any) {
          console.error(`Error processing profile ${rawId}:`, err);
          return { id: rawId, error: err.message || "Unknown error" };
        }
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Profile batch fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Helper to parse followers/connections
const parseCount = (str: string | number | undefined): number => {
  if (typeof str === "number") return str;
  if (typeof str === "string") {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
};

// Helper to parse dates
function parseDate(dateObj: any): string | null {
  if (!dateObj) return null;
  if (typeof dateObj === "string") return dateObj;
  const { year, month, day } = dateObj;
  if (year) return `${year}-${month || 1}-${day || 1}`;
  return null;
}

function parseYear(dateObj: any): number | undefined {
  if (!dateObj) return undefined;
  if (typeof dateObj === "string") return parseInt(dateObj) || undefined;
  return dateObj.year;
}

// Process profile data and save to database
async function processProfileData(
  id: string,
  data: ScrapingdogProfile,
  prismaClient: typeof prisma,
  userId: string
) {
  const linkedinId = data.public_identifier || data.profile_id || id;

  // Get existing profile from database to preserve non-empty fields
  const existingProfile = await prismaClient.candidate.findUnique({
    where: { linkedinId },
  });

  const transformedProfile = {
    success: true,
    id: data.public_identifier || data.profile_id || id,
    provider_id: "scrapingdog",
    name:
      data.fullName ||
      data.full_name ||
      `${data.first_name || ""} ${data.last_name || ""}`.trim(),
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    headline:
      data.headline || data.title || data.occupation || data.sub_title || "",
    location: data.location || data.country_full_name || "",
    photo_url: data.profile_photo || data.profile_pic_url,
    photo_url_large: data.profile_photo || data.profile_pic_url,
    profile_url: `https://www.linkedin.com/in/${data.public_identifier || id}`,
    summary: data.about || data.summary || "",

    // Profile metadata
    is_premium: false,
    is_influencer: false,
    is_creator: false,
    is_open_profile: false,
    network_distance: "",
    follower_count: parseCount(data.followers) || data.follower_count || 0,
    connections_count:
      parseCount(data.connections) || data.connection_count || 0,
    primary_locale: {
      country: data.country_full_name || "",
      language: "",
    },
    websites: [],

    // Work experience
    work_experience_total_count:
      data.experience?.length || data.experiences?.length || 0,
    experiences: (data.experience || data.experiences || []).map(
      (exp: any) => ({
        company_id: exp.company_id || "",
        company: exp.company_name || exp.company || "",
        title: exp.title || exp.position || "",
        location: exp.location || "",
        description: exp.description || "",
        company_logo: exp.company_image || exp.company_logo_url,
        skills: [],
        start_date: exp.start_date || parseDate(exp.starts_at),
        end_date: exp.end_date || parseDate(exp.ends_at),
        is_current: !exp.ends_at && !exp.end_date,
      })
    ),

    // Education
    education_total_count: data.education?.length || 0,
    education: (data.education || []).map((edu: any) => ({
      school: edu.school || edu.school_name || "",
      degree: edu.degree_name || edu.degree || "",
      field: edu.field_of_study || edu.field || "",
      start_year: edu.start_year || parseYear(edu.starts_at),
      end_year: edu.end_year || parseYear(edu.ends_at),
    })),

    // Skills
    skills_total_count: data.skills?.length || 0,
    skills: (data.skills || []).map((skill: any) => ({
      name: typeof skill === "string" ? skill : skill.name,
      endorsement_count: 0,
      insights: [],
    })),

    // Languages
    languages_total_count: data.languages?.length || 0,
    languages: (data.languages || []).map((lang: any) => ({
      name: typeof lang === "string" ? lang : lang.name,
      proficiency: lang.proficiency || "",
    })),

    // Certifications
    certifications_total_count:
      data.certification?.length || data.certifications?.length || 0,
    certifications: (data.certification || data.certifications || []).map(
      (cert: any) => ({
        name: cert.certification || cert.title || cert.name,
        organization: cert.company_name || cert.authority || cert.organization,
      })
    ),

    // Volunteering
    volunteering_experience_total_count: data.volunteering?.length || 0,
    volunteering: data.volunteering || [],

    // Projects
    projects_total_count: data.projects?.length || 0,
    projects: (data.projects || []).map((proj: any) => ({
      title: proj.title || "",
      description: proj.description || "",
      duration: proj.duration || "",
    })),

    // Recommendations
    recommendations: data.recommendations || null,

    // Hashtags/Interests
    hashtags: [],
  };

  // Save to database - only update fields that have data (don't overwrite existing with empty)
  try {
    // Build update object conditionally - only include fields with actual data
    const updateData: Record<string, any> = {
      rawData: transformedProfile as any, // Always update raw data
    };

    // Only update if new value is not empty
    if (transformedProfile.summary) {
      updateData.about = transformedProfile.summary;
    }
    if (transformedProfile.experiences.length > 0) {
      updateData.experience = transformedProfile.experiences;
    }
    if (transformedProfile.education.length > 0) {
      updateData.education = transformedProfile.education;
    }
    if (transformedProfile.skills.length > 0) {
      updateData.skills = transformedProfile.skills.map((s: any) => s.name);
    }
    if (transformedProfile.languages.length > 0) {
      updateData.languages = transformedProfile.languages.map((l: any) => l.name);
    }
    if (transformedProfile.certifications.length > 0) {
      updateData.certifications = transformedProfile.certifications;
    }
    if (transformedProfile.name) {
      updateData.fullName = transformedProfile.name;
    }
    if (transformedProfile.headline) {
      updateData.headline = transformedProfile.headline;
    }
    if (transformedProfile.location) {
      updateData.location = transformedProfile.location;
    }
    if (transformedProfile.photo_url) {
      updateData.photoUrl = transformedProfile.photo_url;
    }

    await prismaClient.candidate.upsert({
      where: { linkedinId },
      update: updateData,
      create: {
        userId: userId,
        source: 'linkedin',
        linkedinId,
        fullName: transformedProfile.name || existingProfile?.fullName || "",
        headline: transformedProfile.headline || existingProfile?.headline || "",
        location: transformedProfile.location || existingProfile?.location || "",
        photoUrl: transformedProfile.photo_url || existingProfile?.photoUrl || "",
        about: transformedProfile.summary || existingProfile?.about || "",
        experience: transformedProfile.experiences.length > 0
          ? transformedProfile.experiences
          : (existingProfile?.experience as any) || [],
        education: transformedProfile.education.length > 0
          ? transformedProfile.education
          : (existingProfile?.education as any) || [],
        skills: transformedProfile.skills.length > 0
          ? transformedProfile.skills.map((s: any) => s.name)
          : existingProfile?.skills || [],
        languages: transformedProfile.languages.length > 0
          ? transformedProfile.languages.map((l: any) => l.name)
          : existingProfile?.languages || [],
        certifications: transformedProfile.certifications.length > 0
          ? transformedProfile.certifications
          : (existingProfile?.certifications as any) || [],
        rawData: transformedProfile as any,
      },
    });
  } catch (dbError) {
    console.error(`Database error for ${linkedinId}:`, dbError);
  }

  return transformedProfile;
}
