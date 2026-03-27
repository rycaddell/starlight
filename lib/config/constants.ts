export const MIRROR_THRESHOLD = 7;

/**
 * Get the mirror threshold for a specific user based on their group
 */
export const getMirrorThreshold = (_user?: { group_name?: string | null } | null): number => {
  return MIRROR_THRESHOLD;
};
