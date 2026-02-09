import type { AABB } from './types.js';

/**
 * Tests if two AABBs intersect by projecting onto X and Y axes.
 * 
 * Two AABBs intersect if and only if they overlap on both axes.
 * This is an exact AABB overlap test:
 * - Returns false if one box is strictly to the left/right of the other
 * - Returns false if one box is strictly above/below the other
 * - Returns true otherwise (they overlap on both axes)
 * 
 * @param a - First AABB
 * @param b - Second AABB
 * @returns true if the AABBs intersect, false otherwise
 */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  // Check if boxes are separated on the X axis
  if (a.max.x < b.min.x || b.max.x < a.min.x) {
    return false;
  }
  
  // Check if boxes are separated on the Y axis
  if (a.max.y < b.min.y || b.max.y < a.min.y) {
    return false;
  }
  
  // If not separated on either axis, they intersect
  return true;
}

