export const MIRROR_THRESHOLD = 10;

/**
 * Get the mirror threshold for a specific user based on their group
 */
export const getMirrorThreshold = (user: { group_name?: string | null } | null | undefined): number => {
  if (user?.group_name === 'Mens Group') {
    return 6;
  }
  return MIRROR_THRESHOLD; // Default: 10
};
