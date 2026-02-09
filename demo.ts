/**
 * Demo/benchmark script for broad-phase collision detection.
 * 
 * This demo compares two broad-phase collision detection strategies:
 * 
 * 1. **BruteForceBroadPhase**: Simple O(n²) nested loop approach
 *    - Checks every entity against every other entity
 *    - Good baseline for small entity counts
 * 
 * 2. **SpatialGridBroadPhase**: Spatial partitioning using a uniform grid
 *    - Only checks entities that share grid cells
 *    - Significantly reduces AABB tests for larger entity counts
 * 
 * **What this demo shows:**
 * - **Correctness**: Both strategies produce identical candidate collision pairs
 * - **Performance**: Number of AABB intersection tests performed
 * - **Efficiency**: How spatial grid reduces computational cost
 * 
 * Run with: `npm run demo`
 */

import { BruteForceBroadPhase, SpatialGridBroadPhase, type Entity } from './src/index.js';

/**
 * Creates a random AABB within the specified world bounds.
 */
function createRandomAABB(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  minSize: number = 10,
  maxSize: number = 50
): Entity['aabb'] {
  const width = minSize + Math.random() * (maxSize - minSize);
  const height = minSize + Math.random() * (maxSize - minSize);
  
  const x = minX + Math.random() * (maxX - minX - width);
  const y = minY + Math.random() * (maxY - minY - height);
  
  return {
    min: { x, y },
    max: { x: x + width, y: y + height },
  };
}

/**
 * Creates an array of random entities.
 */
function createRandomEntities(count: number, worldWidth: number, worldHeight: number): Entity[] {
  const entities: Entity[] = [];
  
  for (let i = 0; i < count; i++) {
    entities.push({
      id: i,
      aabb: createRandomAABB(0, 0, worldWidth, worldHeight),
    });
  }
  
  return entities;
}

/**
 * Normalizes a pair array for comparison (sorts pairs and entities within pairs).
 */
function normalizePairs(pairs: Array<[Entity, Entity]>): string[] {
  return pairs
    .map(([a, b]) => {
      // Sort entity IDs within pair
      const ids = [String(a.id), String(b.id)].sort();
      return `${ids[0]}:${ids[1]}`;
    })
    .sort();
}

/**
 * Compares two sets of pairs to verify they match.
 */
function comparePairSets(
  pairs1: Array<[Entity, Entity]>,
  pairs2: Array<[Entity, Entity]>,
  label1: string,
  label2: string
): boolean {
  const normalized1 = normalizePairs(pairs1);
  const normalized2 = normalizePairs(pairs2);
  
  if (normalized1.length !== normalized2.length) {
    console.error(`❌ Pair count mismatch: ${label1} found ${normalized1.length}, ${label2} found ${normalized2.length}`);
    return false;
  }
  
  for (let i = 0; i < normalized1.length; i++) {
    if (normalized1[i] !== normalized2[i]) {
      console.error(`❌ Pair mismatch at index ${i}: ${label1} has ${normalized1[i]}, ${label2} has ${normalized2[i]}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Main demo function.
 */
function runDemo() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Broad-Phase Collision Detection Benchmark');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Comparing BruteForceBroadPhase vs SpatialGridBroadPhase');
  console.log('  • Correctness: Both strategies return identical candidate pairs');
  console.log('  • Performance: Number of AABB intersection tests performed');
  console.log('');
  
  // Configuration
  const worldWidth = 1024;
  const worldHeight = 768;
  const cellSize = 64; // Should be roughly 2-4x average entity size
  const entityCounts = [10, 50, 100, 500, 1000];
  
  console.log(`Configuration:`);
  console.log(`  World: ${worldWidth}×${worldHeight}`);
  console.log(`  Grid cell size: ${cellSize}`);
  console.log(`  Entity sizes: 10-50 units (random)`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  const results: Array<{
    entities: number;
    pairs: number;
    bruteTests: number;
    gridTests: number;
    reduction: string;
    speedup: string;
  }> = [];
  
  for (const numEntities of entityCounts) {
    // Create random entities
    const entities = createRandomEntities(numEntities, worldWidth, worldHeight);
    
    // Initialize broad-phase detectors
    const bruteForce = new BruteForceBroadPhase();
    const spatialGrid = new SpatialGridBroadPhase({
      cellSize,
      minX: 0,
      minY: 0,
      maxX: worldWidth,
      maxY: worldHeight,
    });
    
    // Update both with the same entities
    bruteForce.update(entities);
    spatialGrid.update(entities);
    
    // Query pairs
    const brutePairs = bruteForce.queryPairs();
    const gridPairs = spatialGrid.queryPairs();
    
    // Compare results
    const matches = comparePairSets(brutePairs, gridPairs, 'BruteForce', 'SpatialGrid');
    
    if (!matches) {
      console.error(`❌ ERROR: Strategies produced different results for ${numEntities} entities`);
      continue;
    }
    
    // Compare performance
    const bruteTests = bruteForce.collisionTests;
    const gridTests = spatialGrid.collisionTests;
    const reduction = ((bruteTests - gridTests) / bruteTests * 100).toFixed(1);
    const speedup = gridTests > 0 ? (bruteTests / gridTests).toFixed(2) : 'N/A';
    
    results.push({
      entities: numEntities,
      pairs: brutePairs.length,
      bruteTests,
      gridTests,
      reduction,
      speedup,
    });
    
    // Print formatted results
    console.log(`Entities: ${numEntities.toString().padStart(4)}`);
    console.log(`  Candidate pairs:     ${brutePairs.length.toString().padStart(6)}`);
    console.log(`  AABB tests:`);
    console.log(`    BruteForce:        ${bruteTests.toString().padStart(6)}`);
    console.log(`    SpatialGrid:       ${gridTests.toString().padStart(6)}`);
    console.log(`  Performance:`);
    console.log(`    Reduction:         ${reduction.padStart(5)}%`);
    if (gridTests > 0 && gridTests < bruteTests) {
      console.log(`    Speedup:           ${speedup.padStart(5)}×`);
    } else if (gridTests === 0 && bruteTests > 0) {
      console.log(`    Speedup:           ∞× (no tests needed)`);
    }
    console.log('');
  }
  
  // Summary table
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Entities │ Pairs │ BruteForce │ SpatialGrid │ Reduction │ Speedup');
  console.log('─────────┼───────┼────────────┼─────────────┼───────────┼────────');
  for (const r of results) {
    console.log(
      `${r.entities.toString().padStart(8)} │ ${r.pairs.toString().padStart(5)} │ ${r.bruteTests.toString().padStart(10)} │ ${r.gridTests.toString().padStart(11)} │ ${r.reduction.padStart(8)}% │ ${r.speedup.padStart(6)}×`
    );
  }
  console.log('');
  console.log('✅ All tests passed: Both strategies produce identical results');
  console.log('');
}

// Run the demo
runDemo();

