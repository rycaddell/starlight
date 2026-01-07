export const MIRROR_THRESHOLD = 10;

/**
 * Get the mirror threshold for a specific user based on their group
 * @param {Object} user - User object with group_name property
 * @returns {number} Mirror threshold (6 for Mens Group, 10 for others)
 */
export const getMirrorThreshold = (user) => {
  if (user?.group_name === 'Mens Group') {
    return 6;
  }
  return MIRROR_THRESHOLD; // Default: 10
};
