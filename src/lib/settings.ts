import { getAllSettings } from './queries';

const DEFAULT_SITE_SETTINGS = {
  site_name: 'Learn Plus Courses',
  site_description: 'Free Online Courses Platform',
  courses_per_page: 12,
  scraper_enabled: true,
  scraper_interval_hours: 6,
};

export interface SiteSettings {
  site_name: string;
  site_description: string;
  courses_per_page: number;
  scraper_enabled: boolean;
  scraper_interval_hours: number;
}

// Cache for site settings - refresh every 5 minutes
let cachedSiteSettings: SiteSettings | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSiteSettings(): Promise<SiteSettings> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSiteSettings && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedSiteSettings;
  }

  const settings: Record<string, string> = await getAllSettings().catch(() => ({} as Record<string, string>));
  const result: SiteSettings = {
    site_name: settings.site_name || DEFAULT_SITE_SETTINGS.site_name,
    site_description: settings.site_description || DEFAULT_SITE_SETTINGS.site_description,
    courses_per_page: parseInt(settings.courses_per_page || String(DEFAULT_SITE_SETTINGS.courses_per_page)),
    scraper_enabled: settings.scraper_enabled !== 'false',
    scraper_interval_hours: parseInt(settings.scraper_interval_hours || String(DEFAULT_SITE_SETTINGS.scraper_interval_hours)),
  };

  // Update cache
  cachedSiteSettings = result;
  settingsCacheTime = now;
  
  return result;
}

// Clear cache manually (useful after settings update)
export function clearSiteSettingsCache(): void {
  cachedSiteSettings = null;
  settingsCacheTime = 0;
}
