import type { Entity } from './types.js';

/**
 * Abstract interface for broad-phase collision detection strategies.
 * 
 * Broad-phase collision detection is the first step in a collision detection pipeline.
 * It quickly identifies candidate pairs of entities that might be colliding, using
 * coarse tests (typically AABB overlap). The narrow-phase (not implemented here)
 * would then perform precise collision tests on these candidate pairs.
 * 
 * Different implementations trade off between:
 * - Setup cost (update complexity)
 * - Query cost (pair generation complexity)
 * - Memory usage
 * 
 * @see BruteForceBroadPhase - Simple O(n²) approach, good for small entity counts
 * @see SpatialGridBroadPhase - Spatial partitioning, efficient for many entities
 */
export abstract class BroadPhase {
  /**
   * Updates the internal data structures with the current set of entities.
   * 
   * This should be called once per simulation step, before queryPairs().
   * 
   * @param entities - Array of all entities to consider for collision detection
   */
  abstract update(entities: Entity[]): void;

  /**
   * Queries for all candidate collision pairs based on broad-phase tests.
   * 
   * Returns pairs of entities whose AABBs overlap. This is a coarse test;
   * narrow-phase collision detection would be performed on these pairs.
   * 
   * @returns Array of candidate collision pairs [Entity, Entity]
   */
  abstract queryPairs(): Array<[Entity, Entity]>;

  /**
   * Number of AABB intersection tests performed during the last queryPairs() call.
   * 
   * This is useful for debugging and performance analysis. Lower is better,
   * as it indicates the broad-phase is effectively culling non-intersecting pairs.
   */
  abstract get collisionTests(): number;
}

