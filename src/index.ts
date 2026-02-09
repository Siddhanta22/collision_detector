/**
 * Broad-phase collision detection library.
 * 
 * This library provides efficient broad-phase collision detection strategies
 * for identifying candidate collision pairs in 2D space using AABB (Axis-Aligned
 * Bounding Box) tests.
 * 
 * Based on "Broad Phase Collision Detection Using Spatial Partitioning"
 * by Andrew Petersen (Build New Games).
 * 
 * @example
 * ```ts
 * import { SpatialGridBroadPhase, type Entity } from './collision-detector';
 * 
 * const entities: Entity[] = [
 *   { id: 1, aabb: { min: { x: 0, y: 0 }, max: { x: 32, y: 32 } } },
 *   { id: 2, aabb: { min: { x: 30, y: 30 }, max: { x: 62, y: 62 } } },
 * ];
 * 
 * const broadPhase = new SpatialGridBroadPhase({
 *   cellSize: 32,
 *   minX: 0,
 *   minY: 0,
 *   maxX: 1024,
 *   maxY: 768,
 * });
 * 
 * broadPhase.update(entities);
 * const pairs = broadPhase.queryPairs();
 * console.log(`Found ${pairs.length} candidate pairs`);
 * ```
 */

// Types
export type { AABB, Entity } from './types.js';

// Helper functions
export { aabbIntersects } from './aabb.js';

// Broad-phase implementations
export { BroadPhase } from './broad-phase.js';
export { BruteForceBroadPhase } from './brute-force.js';
export { SpatialGridBroadPhase, type SpatialGridOptions } from './spatial-grid.js';

