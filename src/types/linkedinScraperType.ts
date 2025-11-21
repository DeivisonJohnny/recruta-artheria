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
