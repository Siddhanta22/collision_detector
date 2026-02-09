# Broad-Phase Collision Detector

A TypeScript implementation of broad-phase collision detection using spatial partitioning. This library provides efficient algorithms for identifying candidate collision pairs in 2D space using AABB (Axis-Aligned Bounding Box) tests, based on the article "Broad Phase Collision Detection Using Spatial Partitioning" by Andrew Petersen (Build New Games).

## Project Overview

This library implements two broad-phase collision detection strategies to solve the O(n²) problem of checking every entity against every other entity. By using spatial partitioning, the spatial grid approach dramatically reduces the number of AABB intersection tests needed, making it practical for games and physics simulations with hundreds or thousands of entities.

## Key Features

- **Reusable BroadPhase abstraction** - Clean interface for plugging into any game loop
- **Brute-force implementation** - Simple O(n²) baseline for small entity counts
- **Spatial grid implementation** - Uniform grid partitioning for efficient large-scale collision detection
- **AABB-based overlap test** - Fast axis-aligned bounding box intersection detection
- **Performance metrics** - Built-in collision test counting for benchmarking
- **TypeScript-first** - Full type safety with modern ES modules

## Algorithms

### The Problem

In a collision detection system, we need to find all pairs of entities that might be colliding. A naive approach checks every entity against every other entity, resulting in O(n²) complexity. For 1000 entities, that's 499,500 potential checks per frame—far too expensive for real-time applications.

### Brute-Force Approach

The simplest solution: iterate through all entities with nested loops, checking each pair exactly once (i < j to avoid duplicates). This is O(n²) but works well for small entity counts (< 100).

**Complexity:**
- `update()`: O(1) - just stores the entity array
- `queryPairs()`: O(n²) - checks all pairs

### Spatial Grid Approach

Partition the world into a uniform grid of cells. Each entity is added to all grid cells its AABB overlaps. When querying for pairs, only entities in the same cell are checked against each other. A checked-pair cache prevents duplicate tests when entities span multiple cells.

**How it works:**
1. **Grid Population**: For each entity, compute which cells its AABB overlaps and add it to those cells
2. **Pair Querying**: For each cell with 2+ entities, check all pairs within that cell, using a cache to skip duplicates

**Complexity:**
- `update()`: O(n + k) where n is entities and k is populated cells
- `queryPairs()`: O(n + m) where m is pairs in shared cells
  - Worst case (all entities in one cell): O(n²) like brute force
  - Typical case: Much better than brute force with proper cell sizing

**Cell Size Selection:**
- Too small: Entities span many cells, increasing memory and update cost
- Too large: Many entities per cell, reducing culling effectiveness
- Rule of thumb: `cellSize` should be roughly 2-4× the average entity size

## Performance

The spatial grid approach dramatically reduces the number of AABB tests compared to brute force:

| Entities | Candidate Pairs | BruteForce Tests | SpatialGrid Tests | Reduction | Speedup |
|----------|----------------|------------------|-------------------|-----------|---------|
| 10       | 0              | 45               | 1                 | 97.8%     | 45×     |
| 50       | 10             | 1,225            | 30                | 97.6%     | 41×     |
| 100      | 24             | 4,950            | 80                | 98.4%     | 62×     |
| 500      | 603            | 124,750          | 2,323             | 98.1%     | 54×     |
| 1000     | 2,331          | 499,500          | 9,626             | 98.1%     | 52×     |

**Key observations:**
- Both strategies return **identical candidate pairs** (correctness verified)
- Spatial grid achieves **~98% reduction** in AABB tests
- Performance improvement scales well with entity count
- Speedup factor: **50-60× fewer tests** for large entity counts

## Getting Started

### Prerequisites

- Node.js 18+ (for ES modules support)
- npm or yarn

### Installation

```bash
npm install
```

### Running the Demo

```bash
npm run demo
```

The demo creates random entities and compares both strategies, showing:
- Correctness verification (identical pairs from both strategies)
- Performance metrics (AABB test counts)
- Efficiency improvements (reduction percentage and speedup factor)

### Web Visualization

Launch an interactive, space-themed browser visualization of the collision detection system:

```bash
npm run dev
```

This opens a real-time visualizer at `http://localhost:5173` featuring:

- **Animated starfield** - Twinkling stars with parallax depth
- **Asteroid belt** - Rotating belt of asteroids around the center
- **Entity visualization** - Entities rendered as glowing "asteroids" that move and bounce
- **Collision highlighting** - Colliding pairs glow with a hot pink/magenta color
- **Spatial grid overlay** - Optional grid visualization showing cell boundaries
- **Real-time HUD** - Performance metrics updated every frame:
  - Entity count
  - AABB tests (BruteForce vs SpatialGrid)
  - Speedup factor
  - Collision pair count

**Controls:**
- **Entity Count** - Adjust from 50 to 500 entities (slider/dropdown)
- **Show Grid Overlay** - Toggle spatial grid cell visualization
- **Show Bounding Boxes** - Switch between asteroid-style rendering and AABB wireframes

The visualization runs the spatial grid algorithm every frame for smooth performance, while brute-force tests are computed periodically (every 10 frames) to provide comparison metrics without impacting frame rate.

### Building

```bash
npm run build
```

Outputs compiled JavaScript and type definitions to `dist/`.

## Usage Example

```typescript
import {
  SpatialGridBroadPhase,
  type Entity,
} from './src/index.js';

// Create entities with AABBs
const entities: Entity[] = [
  { id: 1, aabb: { min: { x: 0, y: 0 }, max: { x: 32, y: 32 } } },
  { id: 2, aabb: { min: { x: 30, y: 30 }, max: { x: 62, y: 62 } } },
  // ... more entities
];

// Initialize broad-phase detector
const broadPhase = new SpatialGridBroadPhase({
  cellSize: 32,  // Grid cell size (2-4× average entity size)
  minX: 0,
  minY: 0,
  maxX: 1024,
  maxY: 768,
});

// Game loop
function gameStep() {
  // 1. Update broad-phase with current entity positions
  broadPhase.update(entities);
  
  // 2. Query for candidate collision pairs
  const pairs = broadPhase.queryPairs();
  
  // 3. Perform narrow-phase collision detection on candidate pairs
  for (const [entityA, entityB] of pairs) {
    // ... perform precise collision test (circle, polygon, etc.)
    // ... handle collision response
  }
  
  // Optional: Check performance
  console.log(`Found ${pairs.length} candidate pairs`);
  console.log(`Performed ${broadPhase.collisionTests} AABB tests`);
}
```

### API Reference

#### Types

```typescript
interface AABB {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

interface Entity {
  id: number | string;
  aabb: AABB;
}
```

#### Classes

**`BruteForceBroadPhase`**
- Simple nested-loop approach
- Good for small entity counts (< 100)
- Complexity: O(n²) for `queryPairs()`

**`SpatialGridBroadPhase`**
- Spatial partitioning with uniform grid
- Efficient for many entities
- Complexity: O(n + m) for `queryPairs()` where m is pairs in shared cells

#### Functions

**`aabbIntersects(a: AABB, b: AABB): boolean`**
- Tests if two AABBs intersect by checking overlap on both X and Y axes

## Future Work / Ideas

- **Narrow-phase collision detection** - Add precise collision tests (circle-circle, SAT for polygons, OBB)
- **3D support** - Extend to 3D space using octree or BVH (Bounding Volume Hierarchy)
- **Dynamic grid resizing** - Adapt cell size based on entity distribution
- **Integration example** - Simple game engine or physics sandbox demonstrating real-world usage
- **Benchmark suite** - Automated performance testing across different entity distributions

## License

MIT
