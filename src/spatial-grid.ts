import { BroadPhase } from './broad-phase.js';
import { aabbIntersects } from './aabb.js';
import type { Entity } from './types.js';

/**
 * Configuration options for SpatialGridBroadPhase.
 */
export interface SpatialGridOptions {
  /** Size of each grid cell in world units (e.g., 32 or 64 pixels) */
  cellSize: number;
  /** Minimum X coordinate of the grid's world space (default: 0) */
  minX?: number;
  /** Minimum Y coordinate of the grid's world space (default: 0) */
  minY?: number;
  /** Maximum X coordinate of the grid's world space */
  maxX: number;
  /** Maximum Y coordinate of the grid's world space */
  maxY: number;
}

/**
 * Spatial grid broad-phase collision detection.
 * 
 * Uses a uniform grid to partition space, reducing the number of AABB tests
 * by only checking entities that share grid cells.
 * 
 * **Algorithm (from "Broad Phase Collision Detection Using Spatial Partitioning"):**
 * 
 * 1. **Grid Population:**
 *    - For each entity, determine which grid cells its AABB overlaps
 *    - Add the entity to all overlapping cells
 * 
 * 2. **Querying For Collision Pairs:**
 *    - Iterate over each occupied cell
 *    - For cells with 2+ entities, check all pairs within that cell
 *    - Use a checked-pair cache to avoid duplicate tests when entities overlap multiple cells
 * 
 * **Complexity:**
 * - update(): O(n + k) where n is entities and k is populated cells
 * - queryPairs(): O(n + m) where m is the number of entity pairs in shared cells
 *   - In worst case (all entities in one cell), this degrades to O(n²) like brute force
 *   - With good cellSize matching, typically much better than brute force
 * 
 * **Cell Size Selection:**
 * - Too small: entities span many cells, increasing memory and update cost
 * - Too large: many entities per cell, reducing culling effectiveness
 * - Rule of thumb: cellSize should be roughly 2-4x the average entity size
 * 
 * @example
 * ```ts
 * const broadPhase = new SpatialGridBroadPhase({
 *   cellSize: 32,
 *   minX: 0,
 *   minY: 0,
 *   maxX: 1024,
 *   maxY: 768,
 * });
 * broadPhase.update(entities);
 * const pairs = broadPhase.queryPairs();
 * ```
 */
export class SpatialGridBroadPhase extends BroadPhase {
  private readonly cellSize: number;
  private readonly minX: number;
  private readonly minY: number;
  private readonly maxX: number;
  private readonly maxY: number;
  private readonly numCols: number;
  private readonly numRows: number;
  
  // 2D grid: grid[col][row] is an array of entities in that cell
  private grid: Array<Array<Entity[]>> = [];
  
  private _collisionTests: number = 0;

  /**
   * Creates a new spatial grid broad-phase detector.
   * 
   * @param options - Grid configuration
   */
  constructor(options: SpatialGridOptions) {
    super();
    
    // Validate configuration
    if (options.cellSize <= 0) {
      throw new Error('cellSize must be greater than 0');
    }
    if (options.maxX <= (options.minX ?? 0)) {
      throw new Error('maxX must be greater than minX');
    }
    if (options.maxY <= (options.minY ?? 0)) {
      throw new Error('maxY must be greater than minY');
    }
    
    this.cellSize = options.cellSize;
    this.minX = options.minX ?? 0;
    this.minY = options.minY ?? 0;
    this.maxX = options.maxX;
    this.maxY = options.maxY;
    
    // Calculate grid dimensions
    this.numCols = Math.ceil((this.maxX - this.minX) / this.cellSize);
    this.numRows = Math.ceil((this.maxY - this.minY) / this.cellSize);
    
    // Initialize empty grid
    this.grid = [];
    for (let col = 0; col < this.numCols; col++) {
      this.grid[col] = [];
      for (let row = 0; row < this.numRows; row++) {
        this.grid[col][row] = [];
      }
    }
  }

  /**
   * Converts world coordinates to grid cell coordinates.
   * 
   * Clamps the result to valid grid indices to handle entities outside the grid bounds.
   * 
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @returns Grid cell coordinates { col, row }
   */
  private worldToGrid(x: number, y: number): { col: number; row: number } {
    const col = Math.floor((x - this.minX) / this.cellSize);
    const row = Math.floor((y - this.minY) / this.cellSize);
    
    // Clamp to valid grid indices
    return {
      col: Math.max(0, Math.min(col, this.numCols - 1)),
      row: Math.max(0, Math.min(row, this.numRows - 1)),
    };
  }

  /**
   * Updates the grid by populating it with entities.
   * 
   * **Grid Population Algorithm:**
   * - Clear the entire grid
   * - For each entity:
   *   - Compute the range of cells overlapped by its AABB
   *   - Add the entity to all overlapping cells
   * 
   * @param entities - Array of all entities to consider
   */
  update(entities: Entity[]): void {
    // Clear the grid (recreate arrays for each cell)
    for (let col = 0; col < this.numCols; col++) {
      for (let row = 0; row < this.numRows; row++) {
        this.grid[col][row] = [];
      }
    }
    
    // Populate grid with entities
    for (const entity of entities) {
      const aabb = entity.aabb;
      
      // Determine the range of cells overlapped by this AABB
      const minCell = this.worldToGrid(aabb.min.x, aabb.min.y);
      const maxCell = this.worldToGrid(aabb.max.x, aabb.max.y);
      
      // Add entity to all overlapping cells
      for (let col = minCell.col; col <= maxCell.col; col++) {
        for (let row = minCell.row; row <= maxCell.row; row++) {
          this.grid[col][row].push(entity);
        }
      }
    }
  }

  /**
   * Queries for all candidate collision pairs using the spatial grid.
   * 
   * **Querying Algorithm:**
   * - Iterate over each occupied cell
   * - For cells with 2+ entities, check all pairs within that cell
   * - Use a checked-pair cache (string keys) to avoid duplicate tests
   *   when entities overlap multiple cells
   * 
   * @returns Array of candidate collision pairs
   */
  queryPairs(): Array<[Entity, Entity]> {
    const pairs: Array<[Entity, Entity]> = [];
    const checked: Record<string, true> = {};
    this._collisionTests = 0;
    
    // Iterate over every cell in the grid
    for (let col = 0; col < this.numCols; col++) {
      for (let row = 0; row < this.numRows; row++) {
        const entitiesInCell = this.grid[col][row];
        
        // Only process cells with 2+ entities (no pairs possible with < 2)
        if (entitiesInCell.length < 2) {
          continue;
        }
        
        // Check all pairs within this cell
        for (let i = 0; i < entitiesInCell.length; i++) {
          const entityA = entitiesInCell[i];
          
          for (let j = i + 1; j < entitiesInCell.length; j++) {
            const entityB = entitiesInCell[j];
            
            // Build string keys for the pair (both orders to catch duplicates)
            const hashA = `${entityA.id}:${entityB.id}`;
            const hashB = `${entityB.id}:${entityA.id}`;
            
            // Skip if we've already checked this pair
            if (checked[hashA] || checked[hashB]) {
              continue;
            }
            
            // Mark both keys as checked
            checked[hashA] = true;
            checked[hashB] = true;
            
            // Increment collision test counter
            this._collisionTests++;
            
            // Test AABB intersection
            if (aabbIntersects(entityA.aabb, entityB.aabb)) {
              pairs.push([entityA, entityB]);
            }
          }
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

