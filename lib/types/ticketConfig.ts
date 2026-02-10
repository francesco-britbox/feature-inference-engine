/**
 * Ticket generation configuration types
 * Project-level defaults stored in DB (ticket_config table)
 */

export type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface PlatformCheckbox {
  platform: 'Web' | 'iOS' | 'Android';
  enabled: boolean;
}

export interface RegionEntry {
  name: string;
  enabled: boolean;
}

export interface TicketConfig {
  id: string;
  projectKey: string;
  projectName: string;
  reporter: string;
  defaultPriority: JiraPriority;
  targetPlatforms: PlatformCheckbox[];
  targetRegions: RegionEntry[];
  sprintName: string | null;
  toolName: string;
  authorName: string;
  keyCounter: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default ticket config values used when no config exists in DB
 */
export const DEFAULT_TICKET_CONFIG: Omit<TicketConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  projectKey: 'PROJ',
  projectName: 'My Project',
  reporter: 'System',
  defaultPriority: 'Medium',
  targetPlatforms: [
    { platform: 'Web', enabled: true },
    { platform: 'iOS', enabled: false },
    { platform: 'Android', enabled: false },
  ],
  targetRegions: [
    { name: 'US', enabled: true },
    { name: 'EU', enabled: true },
  ],
  sprintName: null,
  toolName: 'AI Feature Inference Engine',
  authorName: 'System',
  keyCounter: 1,
};
