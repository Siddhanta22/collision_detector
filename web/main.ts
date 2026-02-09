import {
  SpatialGridBroadPhase,
  BruteForceBroadPhase,
  type Entity,
  type AABB,
} from '../src/index.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SimEntity extends Entity {
  vx: number;
  vy: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  twinklePhase: number;
  depth: number;
  alpha: number;
}

interface Asteroid {
  radius: number;
  angle: number;
  speed: number;
  distance: number;
  size: number;
}

// ============================================================================
// Configuration
// ============================================================================

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 768;
const CELL_SIZE = 64;
const MIN_ENTITY_SIZE = 10;
const MAX_ENTITY_SIZE = 50;
const MAX_VELOCITY = 2.5;

// ============================================================================
// State
// ============================================================================

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let entities: SimEntity[] = [];
let stars: Star[] = [];
let asteroids: Asteroid[] = [];
let collisionPairs: Array<[Entity, Entity]> = [];
let entityCount = 100;
let showGrid = true;
let showBounds = false;

let spatialGrid: SpatialGridBroadPhase;
let bruteForce: BruteForceBroadPhase;
let bruteForceTests = 0;
let gridTests = 0;
let bruteForceFrameCounter = 0;
const BRUTE_FORCE_UPDATE_INTERVAL = 10; // Update brute force every 10 frames

// ============================================================================
// Initialization
// ============================================================================

function init() {
  canvas = document.getElementById('space-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas not found');
  
  ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('Could not get 2D context');
  
  // Set canvas size to match world
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  
  // Initialize broad-phase detectors
  spatialGrid = new SpatialGridBroadPhase({
    cellSize: CELL_SIZE,
    minX: 0,
    minY: 0,
    maxX: WORLD_WIDTH,
    maxY: WORLD_HEIGHT,
  });
  
  bruteForce = new BruteForceBroadPhase();
  
  // Initialize stars
  initStars();
  
  // Initialize asteroid belt
  initAsteroidBelt();
  
  // Create initial entities
  createEntities(entityCount);
  
  // Setup controls
  setupControls();
  
  // Start animation loop
  animate();
}

function initStars() {
  stars = [];
  const numStars = 150;
  
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: Math.random() * 1.5 + 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.5,
    });
  }
}

function initAsteroidBelt() {
  asteroids = [];
  const numAsteroids = 40;
  const centerX = WORLD_WIDTH / 2;
  const centerY = WORLD_HEIGHT / 2;
  
  for (let i = 0; i < numAsteroids; i++) {
    const angle = (Math.PI * 2 * i) / numAsteroids;
    const distance = 200 + Math.random() * 150;
    
    asteroids.push({
      radius: Math.random() * 3 + 2,
      angle: angle + Math.random() * 0.5,
      speed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      distance: distance,
      size: Math.random() * 4 + 3,
    });
  }
}

function createEntities(count: number) {
  entities = [];
  
  for (let i = 0; i < count; i++) {
    const width = MIN_ENTITY_SIZE + Math.random() * (MAX_ENTITY_SIZE - MIN_ENTITY_SIZE);
    const height = MIN_ENTITY_SIZE + Math.random() * (MAX_ENTITY_SIZE - MIN_ENTITY_SIZE);
    
    const x = Math.random() * (WORLD_WIDTH - width);
    const y = Math.random() * (WORLD_HEIGHT - height);
    
    entities.push({
      id: i,
      aabb: {
        min: { x, y },
        max: { x: x + width, y: y + height },
      },
      vx: (Math.random() - 0.5) * MAX_VELOCITY * 2,
      vy: (Math.random() - 0.5) * MAX_VELOCITY * 2,
    });
  }
  
  // Update broad-phase with new entities
  spatialGrid.update(entities);
  bruteForce.update(entities);
}

// ============================================================================
// Controls
// ============================================================================

function setupControls() {
  const entityCountSelect = document.getElementById('entity-count') as HTMLSelectElement;
  const showGridCheckbox = document.getElementById('show-grid') as HTMLInputElement;
  const showBoundsCheckbox = document.getElementById('show-bounds') as HTMLInputElement;
  
  entityCountSelect.addEventListener('change', (e) => {
    entityCount = parseInt((e.target as HTMLSelectElement).value);
    createEntities(entityCount);
  });
  
  showGridCheckbox.addEventListener('change', (e) => {
    showGrid = (e.target as HTMLInputElement).checked;
  });
  
  showBoundsCheckbox.addEventListener('change', (e) => {
    showBounds = (e.target as HTMLInputElement).checked;
  });
}

// ============================================================================
// Simulation Update
// ============================================================================

function updateSimulation() {
  // Update entity positions
  for (const entity of entities) {
    entity.aabb.min.x += entity.vx;
    entity.aabb.min.y += entity.vy;
    entity.aabb.max.x += entity.vx;
    entity.aabb.max.y += entity.vy;
    
    // Bounce off boundaries
    if (entity.aabb.min.x < 0 || entity.aabb.max.x > WORLD_WIDTH) {
      entity.vx = -entity.vx;
      entity.aabb.min.x = Math.max(0, Math.min(WORLD_WIDTH - (entity.aabb.max.x - entity.aabb.min.x), entity.aabb.min.x));
      entity.aabb.max.x = entity.aabb.min.x + (entity.aabb.max.x - entity.aabb.min.x);
    }
    
    if (entity.aabb.min.y < 0 || entity.aabb.max.y > WORLD_HEIGHT) {
      entity.vy = -entity.vy;
      entity.aabb.min.y = Math.max(0, Math.min(WORLD_HEIGHT - (entity.aabb.max.y - entity.aabb.min.y), entity.aabb.min.y));
      entity.aabb.max.y = entity.aabb.min.y + (entity.aabb.max.y - entity.aabb.min.y);
    }
  }
  
  // Update broad-phase
  spatialGrid.update(entities);
  collisionPairs = spatialGrid.queryPairs();
  gridTests = spatialGrid.collisionTests;
  
  // Update brute force periodically (expensive for large N)
  bruteForceFrameCounter++;
  if (bruteForceFrameCounter >= BRUTE_FORCE_UPDATE_INTERVAL) {
    bruteForce.update(entities);
    bruteForce.queryPairs();
    bruteForceTests = bruteForce.collisionTests;
    bruteForceFrameCounter = 0;
  }
  
  // Update stars (twinkle)
  for (const star of stars) {
    star.twinklePhase += 0.05;
    star.alpha = 0.5 + Math.sin(star.twinklePhase) * 0.3;
  }
  
  // Update asteroid belt (rotate)
  for (const asteroid of asteroids) {
    asteroid.angle += asteroid.speed;
  }
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  
  // Render starfield
  renderStars();
  
  // Render asteroid belt
  renderAsteroidBelt();
  
  // Render grid overlay (if enabled)
  if (showGrid) {
    renderGrid();
  }
  
  // Render entities
  renderEntities();
  
  // Update HUD
  updateHUD();
}

function renderStars() {
  for (const star of stars) {
    ctx.save();
    ctx.globalAlpha = star.alpha * star.depth;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderAsteroidBelt() {
  const centerX = WORLD_WIDTH / 2;
  const centerY = WORLD_HEIGHT / 2;
  
  for (const asteroid of asteroids) {
    const x = centerX + Math.cos(asteroid.angle) * asteroid.distance;
    const y = centerY + Math.sin(asteroid.angle) * asteroid.distance;
    
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(x, y, asteroid.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some texture
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x - asteroid.size * 0.3, y - asteroid.size * 0.3, asteroid.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderGrid() {
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x <= WORLD_WIDTH; x += CELL_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= WORLD_HEIGHT; y += CELL_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }
}

function renderEntities() {
  // Create a set of entities involved in collisions for fast lookup
  const collidingEntities = new Set<number | string>();
  for (const [a, b] of collisionPairs) {
    collidingEntities.add(a.id);
    collidingEntities.add(b.id);
  }
  
  for (const entity of entities) {
    const aabb = entity.aabb;
    const width = aabb.max.x - aabb.min.x;
    const height = aabb.max.y - aabb.min.y;
    const centerX = aabb.min.x + width / 2;
    const centerY = aabb.min.y + height / 2;
    const isColliding = collidingEntities.has(entity.id);
    
    if (showBounds) {
      // Draw bounding box
      ctx.strokeStyle = isColliding ? '#ff6b9d' : '#64c8ff';
      ctx.lineWidth = isColliding ? 3 : 1;
      ctx.strokeRect(aabb.min.x, aabb.min.y, width, height);
    } else {
      // Draw asteroid-like entity with glow effect
      const radius = Math.max(width, height) / 2;
      
      // Outer glow
      if (isColliding) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.8);
        gradient.addColorStop(0, '#ff6b9d');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, '#64c8ff');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Main entity body
      ctx.save();
      ctx.fillStyle = isColliding ? '#ff6b9d' : '#64c8ff';
      ctx.shadowBlur = isColliding ? 20 : 10;
      ctx.shadowColor = isColliding ? '#ff6b9d' : '#64c8ff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner highlight
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function updateHUD() {
  const entitiesEl = document.getElementById('stat-entities');
  const bruteTestsEl = document.getElementById('stat-brute-tests');
  const gridTestsEl = document.getElementById('stat-grid-tests');
  const speedupEl = document.getElementById('stat-speedup');
  const pairsEl = document.getElementById('stat-pairs');
  
  if (entitiesEl) entitiesEl.textContent = entities.length.toString();
  if (bruteTestsEl) bruteTestsEl.textContent = bruteForceTests.toLocaleString();
  if (gridTestsEl) gridTestsEl.textContent = gridTests.toLocaleString();
  if (pairsEl) pairsEl.textContent = collisionPairs.length.toString();
  
  if (speedupEl) {
    if (gridTests > 0 && bruteForceTests > 0) {
      const speedup = (bruteForceTests / gridTests).toFixed(1);
      speedupEl.textContent = `${speedup}×`;
    } else {
      speedupEl.textContent = '—';
    }
  }
}

// ============================================================================
// Animation Loop
// ============================================================================

function animate() {
  updateSimulation();
  render();
  requestAnimationFrame(animate);
}

// ============================================================================
// Start
// ============================================================================

init();


