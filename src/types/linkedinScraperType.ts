export interface SearchConfig {
  keyword: string;
  location?: string;
  maxResults?: number;
}

export interface LinkedInProfile {
  name: string;
  title: string;
  profileUrl: string;
  location?: string;
  imageUrl?: string;
  summary?: string;
  currentCompany?: string;
}

export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description?: string;
  isCurrent?: boolean;
}

export interface Education {
  school: string;
  schoolUrl?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  activities?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issuerUrl?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LinkedInProfileDetails {
  linkedinId: string;
  fullName: string;
  headline?: string;
  location?: string;
  photoUrl?: string;
  bannerUrl?: string;
  about?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: string[];
  certifications: Certification[];
  connectionCount?: string;
  followerCount?: string;
  profileUrl: string;
}
