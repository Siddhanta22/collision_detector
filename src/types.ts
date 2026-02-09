/**
 * Axis-Aligned Bounding Box (AABB) representation.
 * 
 * An AABB is defined by its minimum and maximum corners in 2D space.
 * This is the simplest bounding volume and is efficient for broad-phase collision detection.
 */
export interface AABB {
  /** Minimum corner (bottom-left) of the bounding box */
  min: { x: number; y: number };
  /** Maximum corner (top-right) of the bounding box */
  max: { x: number; y: number };
}

/**
 * Entity interface for broad-phase collision detection.
 * 
 * The library only cares about the entity's ID (for tracking) and its AABB.
 * Game-specific fields should be stored elsewhere and referenced by ID.
 */
export interface Entity {
  /** Unique identifier for the entity (number or string) */
  id: number | string;
  /** The entity's axis-aligned bounding box in world space */
  aabb: AABB;
}

