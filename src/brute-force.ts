import { BroadPhase } from './broad-phase.js';
import { aabbIntersects } from './aabb.js';
import type { Entity } from './types.js';

/**
 * Brute-force broad-phase collision detection.
 * 
 * This is the simplest approach: check every entity against every other entity.
 * 
 * **Algorithm (from "Broad Phase Collision Detection Using Spatial Partitioning"):**
 * - Nested loop over all entities
 * - For each pair (i, j) where i < j, test AABB intersection
 * - Return all pairs that intersect
 * 
 * **Complexity:**
 * - update(): O(1) - just stores the array reference
 * - queryPairs(): O(n²) where n is the number of entities
 * 
 * **Use cases:**
 * - Small entity counts (< 100 entities)
 * - When simplicity is more important than performance
 * - As a baseline for comparing other algorithms
 * 
 * @example
 * ```ts
 * const broadPhase = new BruteForceBroadPhase();
 * broadPhase.update(entities);
 * const pairs = broadPhase.queryPairs();
 * console.log(`Found ${pairs.length} candidate pairs`);
 * console.log(`Performed ${broadPhase.collisionTests} AABB tests`);
 * ```
 */
export class BruteForceBroadPhase extends BroadPhase {
  private _entities: Entity[] = [];
  private _collisionTests: number = 0;

  /**
   * Updates the internal entity list.
   * 
   * @param entities - Array of all entities to consider
   */
  update(entities: Entity[]): void {
    // Store a shallow copy to avoid issues if the caller modifies the array
    this._entities = [...entities];
  }

  /**
   * Queries for all candidate collision pairs using brute-force nested loops.
   * 
   * Avoids duplicate checks by only considering pairs where i < j.
   * 
   * @returns Array of candidate collision pairs
   */
  queryPairs(): Array<[Entity, Entity]> {
    const pairs: Array<[Entity, Entity]> = [];
    this._collisionTests = 0;

    // Outer loop: i from 0 to length - 1
    for (let i = 0; i < this._entities.length; i++) {
      const entityA = this._entities[i];
      
      // Inner loop: j from i + 1 to length - 1 (avoids duplicates and self-pairs)
      for (let j = i + 1; j < this._entities.length; j++) {
        const entityB = this._entities[j];
        
        // Increment collision test counter
        this._collisionTests++;
        
        // Test AABB intersection
        if (aabbIntersects(entityA.aabb, entityB.aabb)) {
          pairs.push([entityA, entityB]);
        }
      }
    }

    return pairs;
  }

  /**
   * Number of AABB intersection tests performed in the last queryPairs() call.
   */
  get collisionTests(): number {
    return this._collisionTests;
  }
}

