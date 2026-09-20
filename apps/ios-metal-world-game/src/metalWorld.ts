import {
  MTLCompileOptions,
  MTLCreateSystemDefaultDevice,
  MTLClearColorMake,
  MTLPixelFormatBGRA8Unorm_sRGB,
  MTLPrimitiveTypeTriangle,
  MTLRenderPipelineDescriptor,
} from "@geastack/apple/Metal";
import { MTKView, MTKViewDelegate } from "@geastack/apple/MetalKit";
import { UILabel } from "@geastack/apple/UIKit";
import {
  BOSS_MODEL,
  BOSS_MODEL_VERTEX_COUNT,
  ENEMY_MODEL,
  ENEMY_MODEL_VERTEX_COUNT,
  METEOR_MODEL,
  METEOR_MODEL_VERTEX_COUNT,
  PLAYER_MODEL,
  PLAYER_MODEL_VERTEX_COUNT,
} from "./spaceModels";
import { worldShaderSource } from "./shader";

const backdropVertexCount = 3606;
const focalLength = 1.22;
const playerDepth = 2.04;

const moveXIndex = 0;
const moveYIndex = 1;
const fireIndex = 2;
const boostIndex = 3;
const eventIndex = 4;
const playerXIndex = 5;
const playerYIndex = 6;
const velocityXIndex = 7;
const velocityYIndex = 8;
const bankIndex = 9;
const scoreIndex = 10;
const shieldIndex = 11;
const heatIndex = 12;
const scorePulseIndex = 13;
const hitPulseIndex = 14;
const hitCooldownIndex = 15;
const fireCooldownIndex = 16;
const frameIndex = 17;
const tapXFramesIndex = 18;
const tapYFramesIndex = 19;
const tapFireFramesIndex = 20;
const tapBoostFramesIndex = 21;
const explosionXIndex = 22;
const explosionYIndex = 23;
const explosionDepthIndex = 24;
const explosionFramesIndex = 25;
const explosionSeedIndex = 26;
const explosionDurationFrames = 18;

export interface MetalWorldController {
  ready: boolean;
  beginControl(command: string): void;
  endControl(command: string): void;
  tapControl(command: string): void;
  controlEventCount(): number;
  scoreText(): string;
  shieldText(): string;
  statusText(): string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value: number, fallback: number): number {
  if (value === value) return value;
  return fallback;
}

function fraction(value: number): number {
  return value - Math.floor(value);
}

function cycleVisibility(run: number): number {
  return clamp(Math.min(run / 0.14, (1 - run) / 0.14), 0, 1);
}

function worldXFromClip(clipX: number, depth: number, aspectScale: number): number {
  return clipX * depth / (focalLength * aspectScale);
}

function worldYFromClip(clipY: number, depth: number): number {
  return clipY * depth / focalLength;
}

function clipXFromWorld(worldX: number, depth: number, aspectScale: number): number {
  return worldX * focalLength * aspectScale / depth;
}

function clipYFromWorld(worldY: number, depth: number): number {
  return worldY * focalLength / depth;
}

function enemyRun(slot: number, time: number): number {
  return fraction(time * 0.070 + slot * 0.31);
}

function enemyDepth(slot: number, time: number): number {
  return 8.2 - enemyRun(slot, time) * 2.9;
}

function enemyClipX(slot: number, time: number): number {
  if (slot === 3) return Math.sin(time * 0.30) * 0.07;
  if (slot === 4) return 0.46 + Math.sin(time * 0.62) * 0.04;
  const lanes = [-0.56, -0.04, 0.56];
  return lanes[slot % 3] + Math.sin(time * 0.46 + slot * 1.74) * 0.045;
}

function enemyClipY(slot: number, time: number): number {
  if (slot === 3) return 0.47 + Math.sin(time * 0.34) * 0.018;
  if (slot === 4) return 0.24 + Math.sin(time * 0.47) * 0.030;
  const rows = [0.33, 0.25, 0.34];
  return rows[slot % 3] + Math.sin(time * 0.58 + slot) * 0.026;
}

function enemyWorldX(slot: number, time: number, aspectScale: number): number {
  const depth = enemyDepth(slot, time);
  return worldXFromClip(enemyClipX(slot, time), depth, aspectScale);
}

function enemyWorldY(slot: number, time: number): number {
  const depth = enemyDepth(slot, time);
  return worldYFromClip(enemyClipY(slot, time), depth);
}

function meteorRun(slot: number, time: number): number {
  return fraction(time * 0.115 + slot * 0.39);
}

function meteorDepth(slot: number, time: number): number {
  return 9.6 - meteorRun(slot, time) * 6.0;
}

function meteorClipX(slot: number, time: number): number {
  if (slot === 0) return -0.86 + Math.sin(time * 0.20) * 0.04;
  if (slot === 1) return 0.80 + Math.sin(time * 0.24) * 0.05;
  if (slot === 2) return -0.64 + Math.sin(time * 0.18) * 0.04;
  if (slot === 3) return 0.72 + Math.sin(time * 0.16) * 0.05;
  return Math.sin(time * 0.32 + slot * 2.63) * 0.62;
}

function meteorClipY(slot: number, time: number): number {
  if (slot === 0) return 0.40 - meteorRun(slot, time) * 0.82;
  if (slot === 1) return 0.22 - meteorRun(slot, time) * 0.74;
  if (slot === 2) return 0.58 - meteorRun(slot, time) * 0.70;
  if (slot === 3) return -0.18 - meteorRun(slot, time) * 0.30;
  return 0.72 - meteorRun(slot, time) * 1.02;
}

function meteorWorldX(slot: number, time: number, aspectScale: number): number {
  const depth = meteorDepth(slot, time);
  return worldXFromClip(meteorClipX(slot, time), depth, aspectScale);
}

function meteorWorldY(slot: number, time: number): number {
  const depth = meteorDepth(slot, time);
  return worldYFromClip(meteorClipY(slot, time), depth);
}

function enemyShotRun(slot: number, time: number): number {
  return fraction(time * 0.50 + slot * 0.28);
}

function enemyShotCycle(slot: number, time: number): number {
  return Math.floor(time * 0.50 + slot * 0.28);
}

function enemyShotLaunchTime(slot: number, time: number): number {
  return (enemyShotCycle(slot, time) - slot * 0.28) / 0.50;
}

function enemyShotOriginClipX(slot: number, time: number): number {
  return enemyClipX(slot % 3, enemyShotLaunchTime(slot, time));
}

function enemyShotOriginClipY(slot: number, time: number): number {
  return enemyClipY(slot % 3, enemyShotLaunchTime(slot, time)) - 0.08;
}

function enemyShotTargetClipX(slot: number, time: number): number {
  const cycle = enemyShotCycle(slot, time);
  const origin = enemyShotOriginClipX(slot, time);
  return clamp(origin * 0.42 + Math.sin(cycle * 1.91 + slot * 2.37) * 0.28, -0.66, 0.66);
}

function enemyShotTargetClipY(slot: number, time: number): number {
  const cycle = enemyShotCycle(slot, time);
  return -0.72 + Math.cos(cycle * 1.43 + slot * 1.19) * 0.06;
}

function enemyShotClipX(slot: number, time: number): number {
  const run = enemyShotRun(slot, time);
  const origin = enemyShotOriginClipX(slot, time);
  const target = enemyShotTargetClipX(slot, time);
  return origin * (1 - run) + target * run;
}

function enemyShotClipY(slot: number, time: number): number {
  const run = enemyShotRun(slot, time);
  const origin = enemyShotOriginClipY(slot, time);
  const target = enemyShotTargetClipY(slot, time);
  return origin * (1 - run) + target * run;
}

function enemyShotDepth(slot: number, time: number): number {
  const run = enemyShotRun(slot, time);
  const origin = enemyDepth(slot % 3, enemyShotLaunchTime(slot, time)) - 0.30;
  return origin * (1 - run) + playerDepth * run;
}

function enemyShotRotation(slot: number, time: number): number {
  return Math.atan2(
    enemyShotTargetClipX(slot, time) - enemyShotOriginClipX(slot, time),
    enemyShotTargetClipY(slot, time) - enemyShotOriginClipY(slot, time),
  );
}

function playerShotRun(slot: number, time: number): number {
  return fraction(time * 0.92 + slot * 0.27);
}

function playerShotClipX(slot: number, time: number, playerClipX: number): number {
  const run = playerShotRun(slot, time);
  const spread = (slot - 3) * 0.018;
  return playerClipX + spread * (1 + run);
}

function playerShotClipY(slot: number, time: number, playerClipY: number): number {
  const run = playerShotRun(slot, time);
  return playerClipY + 0.10 + run * 0.92;
}

function playerShotDepth(slot: number, time: number): number {
  return playerDepth + playerShotRun(slot, time) * 6.4;
}

function projectileHits(
  shotClipX: number,
  shotClipY: number,
  shotDepth: number,
  targetClipX: number,
  targetClipY: number,
  targetDepth: number,
  clipRadius: number,
  depthRadius: number,
): boolean {
  const dx = shotClipX - targetClipX;
  const dy = (shotClipY - targetClipY) * 1.22;
  const dz = Math.abs(shotDepth - targetDepth);
  return dx * dx + dy * dy < clipRadius * clipRadius && dz < depthRadius;
}

export function createMetalWorldController(
  view: MTKView,
  statusLabel: UILabel,
  scoreLabel: UILabel,
  shieldLabel: UILabel,
  initialAspectScale: number,
): MetalWorldController {
  const state = [
    0,
    0,
    0,
    0,
    0,
    0,
    -0.48,
    0,
    0,
    0,
    12450,
    100,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  let aspectScale = safeNumber(initialAspectScale, 1);
  if (aspectScale <= 0) aspectScale = 1;

  function hitDistance(x: number, y: number): number {
    return Math.abs(state[playerXIndex] - x) + Math.abs(state[playerYIndex] - y) * 1.22;
  }

  function triggerExplosion(clipX: number, clipY: number, depth: number, intensity: number): void {
    state[explosionXIndex] = worldXFromClip(clipX, depth, aspectScale);
    state[explosionYIndex] = worldYFromClip(clipY, depth);
    state[explosionDepthIndex] = depth;
    state[explosionFramesIndex] = explosionDurationFrames;
    state[explosionSeedIndex] = state[explosionSeedIndex] + 1 + intensity * 0.37;
  }

  function tryPlayerShotHit(time: number, playerClipX: number, playerClipY: number, boost: boolean): boolean {
    const previousTime = time - 1 / 60;
    const enemyRadius = boost ? 0.13 : 0.10;
    const bossRadius = boost ? 0.18 : 0.14;
    for (let shot = 0; shot < 7; shot += 1) {
      const shotClipX = playerShotClipX(shot, time, playerClipX);
      const shotClipY = playerShotClipY(shot, time, playerClipY);
      const shotDepth = playerShotDepth(shot, time);
      const previousShotClipX = playerShotClipX(shot, previousTime, playerClipX);
      const previousShotClipY = playerShotClipY(shot, previousTime, playerClipY);
      const previousShotDepth = playerShotDepth(shot, previousTime);

      const bossDepth = enemyDepth(3, time) - 0.92;
      const bossClipX = clipXFromWorld(enemyWorldX(3, time, aspectScale), bossDepth, aspectScale);
      const bossClipY = clipYFromWorld(enemyWorldY(3, time), bossDepth);
      const previousBossDepth = enemyDepth(3, previousTime) - 0.92;
      const previousBossClipX = clipXFromWorld(enemyWorldX(3, previousTime, aspectScale), previousBossDepth, aspectScale);
      const previousBossClipY = clipYFromWorld(enemyWorldY(3, previousTime), previousBossDepth);
      const hitsBoss = projectileHits(shotClipX, shotClipY, shotDepth, bossClipX, bossClipY, bossDepth, bossRadius, 0.72);
      const wasAlreadyIntersecting = projectileHits(
        previousShotClipX,
        previousShotClipY,
        previousShotDepth,
        previousBossClipX,
        previousBossClipY,
        previousBossDepth,
        bossRadius,
        0.72,
      );
      if (hitsBoss && !wasAlreadyIntersecting) {
        triggerExplosion(shotClipX, shotClipY, shotDepth, 1.35);
        state[scoreIndex] += boost ? 150 : 100;
        state[scorePulseIndex] = 1;
        return true;
      }

      for (let slot = 0; slot < 3; slot += 1) {
        const targetDepth = enemyDepth(slot, time);
        const previousTargetDepth = enemyDepth(slot, previousTime);
        const hitsEnemy = projectileHits(shotClipX, shotClipY, shotDepth, enemyClipX(slot, time), enemyClipY(slot, time), targetDepth, enemyRadius, 0.58);
        const wasAlreadyIntersecting = projectileHits(
          previousShotClipX,
          previousShotClipY,
          previousShotDepth,
          enemyClipX(slot, previousTime),
          enemyClipY(slot, previousTime),
          previousTargetDepth,
          enemyRadius,
          0.58,
        );
        if (hitsEnemy && !wasAlreadyIntersecting) {
          triggerExplosion(shotClipX, shotClipY, shotDepth, 1.0);
          state[scoreIndex] += boost ? 85 : 55;
          state[scorePulseIndex] = 1;
          return true;
        }
      }
    }
    return false;
  }

  function tryEnemyShotHit(time: number, playerClipX: number, playerClipY: number): boolean {
    const previousTime = time - 1 / 60;
    for (let slot = 0; slot < 3; slot += 1) {
      if (enemyShotRun(slot, time) < 0.58) continue;
      const hitsPlayer = projectileHits(
        enemyShotClipX(slot, time),
        enemyShotClipY(slot, time),
        enemyShotDepth(slot, time),
        playerClipX,
        playerClipY,
        playerDepth,
        0.15,
        0.46,
      );
      const wasAlreadyIntersecting = projectileHits(
        enemyShotClipX(slot, previousTime),
        enemyShotClipY(slot, previousTime),
        enemyShotDepth(slot, previousTime),
        playerClipX,
        playerClipY,
        playerDepth,
        0.15,
        0.46,
      );
      if (hitsPlayer && !wasAlreadyIntersecting) {
        triggerExplosion(enemyShotClipX(slot, time), enemyShotClipY(slot, time), enemyShotDepth(slot, time), 0.9);
        return true;
      }
    }
    return false;
  }

  function beginControl(command: string): void {
    let activated = false;
    if (command === "left") {
      activated = state[moveXIndex] !== -1;
      state[moveXIndex] = -1;
    } else if (command === "right") {
      activated = state[moveXIndex] !== 1;
      state[moveXIndex] = 1;
    } else if (command === "up") {
      activated = state[moveYIndex] !== 1;
      state[moveYIndex] = 1;
    } else if (command === "down") {
      activated = state[moveYIndex] !== -1;
      state[moveYIndex] = -1;
    } else if (command === "fire") {
      activated = state[fireIndex] !== 1;
      state[fireIndex] = 1;
    } else if (command === "boost") {
      activated = state[boostIndex] !== 1;
      state[boostIndex] = 1;
    }
    if (activated) state[eventIndex] += 1;
  }

  function endControl(command: string): void {
    if (command === "left" && state[moveXIndex] < 0) state[moveXIndex] = 0;
    else if (command === "right" && state[moveXIndex] > 0) state[moveXIndex] = 0;
    else if (command === "up" && state[moveYIndex] > 0) state[moveYIndex] = 0;
    else if (command === "down" && state[moveYIndex] < 0) state[moveYIndex] = 0;
    else if (command === "fire") state[fireIndex] = 0;
    else if (command === "boost") state[boostIndex] = 0;
  }

  function tapControl(command: string): void {
    if (command === "left") {
      state[moveXIndex] = -1;
      state[tapXFramesIndex] = 8;
    } else if (command === "right") {
      state[moveXIndex] = 1;
      state[tapXFramesIndex] = 8;
    } else if (command === "up") {
      state[moveYIndex] = 1;
      state[tapYFramesIndex] = 8;
    } else if (command === "down") {
      state[moveYIndex] = -1;
      state[tapYFramesIndex] = 8;
    } else if (command === "fire") {
      state[fireIndex] = 1;
      state[tapFireFramesIndex] = 9;
      if (state[fireCooldownIndex] <= 0 && state[heatIndex] < 0.96) {
        state[fireCooldownIndex] = 0.12;
        state[heatIndex] = clamp(state[heatIndex] + 0.16, 0, 1);
        state[scoreIndex] += state[boostIndex] > 0.5 ? 45 : 30;
        state[scorePulseIndex] = 1;
      }
    } else if (command === "boost") {
      state[boostIndex] = 1;
      state[tapBoostFramesIndex] = 14;
    }
    state[eventIndex] += 1;
  }

  function updateSimulation(delta: number): void {
    const time = state[frameIndex] / 60;
    const demoMode = state[eventIndex] === 0;
    if (demoMode && time > 0.45) {
      state[moveXIndex] = 0;
      state[moveYIndex] = 0;
      state[velocityXIndex] = 0;
      state[velocityYIndex] = 0;
      state[playerXIndex] = Math.sin(time * 0.78) * 0.12;
      state[playerYIndex] = -0.48 + Math.sin(time * 0.62) * 0.040;
      state[bankIndex] = Math.sin(time * 1.15) * 0.30;
      state[boostIndex] = Math.sin(time * 1.42) > 0.70 ? 1 : 0;
      state[fireIndex] = 1;
    }

    const boost = state[boostIndex] > 0.5;
    const drive = boost ? 2.9 : 2.05;
    const drag = boost ? 0.86 : 0.80;
    state[velocityXIndex] = (state[velocityXIndex] + state[moveXIndex] * drive * delta) * drag;
    state[velocityYIndex] = (state[velocityYIndex] + state[moveYIndex] * drive * 0.82 * delta) * drag;
    if (!demoMode) {
      state[playerXIndex] = clamp(state[playerXIndex] + state[velocityXIndex], -0.72, 0.72);
      state[playerYIndex] = clamp(state[playerYIndex] + state[velocityYIndex], -0.70, -0.30);
      state[bankIndex] = state[bankIndex] * 0.75 + state[velocityXIndex] * 3.4;
    }

    state[fireCooldownIndex] = Math.max(0, state[fireCooldownIndex] - delta);
    state[hitCooldownIndex] = Math.max(0, state[hitCooldownIndex] - delta);
    state[heatIndex] = Math.max(0, state[heatIndex] - delta * 0.22);
    state[scorePulseIndex] = Math.max(0, state[scorePulseIndex] - delta * 2.6);
    state[hitPulseIndex] = Math.max(0, state[hitPulseIndex] - delta * 3.4);
    state[explosionFramesIndex] = Math.max(0, state[explosionFramesIndex] - 1);

    if (state[fireIndex] > 0.5 && state[fireCooldownIndex] <= 0 && state[heatIndex] < 0.96) {
      state[fireCooldownIndex] = boost ? 0.10 : 0.15;
      state[heatIndex] = clamp(state[heatIndex] + 0.17, 0, 1);
      state[scoreIndex] += demoMode ? 6 : (boost ? 45 : 30);
      state[scorePulseIndex] = 1;
    }

    const playerClipX = clipXFromWorld(state[playerXIndex], playerDepth, aspectScale);
    const playerClipY = clipYFromWorld(state[playerYIndex], playerDepth);

    if (state[fireIndex] > 0.5) tryPlayerShotHit(time, playerClipX, playerClipY, boost);

    const enemyShotNear = !demoMode && time > 2 && state[hitCooldownIndex] <= 0 && tryEnemyShotHit(time, playerClipX, playerClipY);
    const enemyNear =
      (enemyDepth(0, time) < 3.6 && Math.abs(playerClipX - enemyClipX(0, time)) + Math.abs(playerClipY - enemyClipY(0, time)) < 0.17) ||
      (enemyDepth(1, time) < 3.6 && Math.abs(playerClipX - enemyClipX(1, time)) + Math.abs(playerClipY - enemyClipY(1, time)) < 0.17) ||
      (enemyDepth(2, time) < 3.6 && Math.abs(playerClipX - enemyClipX(2, time)) + Math.abs(playerClipY - enemyClipY(2, time)) < 0.17) ||
      (meteorDepth(0, time) < 3.0 && Math.abs(playerClipX - meteorClipX(0, time)) + Math.abs(playerClipY - meteorClipY(0, time)) < 0.18) ||
      (meteorDepth(1, time) < 3.0 && Math.abs(playerClipX - meteorClipX(1, time)) + Math.abs(playerClipY - meteorClipY(1, time)) < 0.18) ||
      enemyShotNear;

    if (!demoMode && time > 2 && enemyNear && state[hitCooldownIndex] <= 0) {
      state[hitCooldownIndex] = 0.95;
      state[shieldIndex] = Math.max(0, state[shieldIndex] - 8);
      state[hitPulseIndex] = 1;
      state[scorePulseIndex] = 0.65;
    }

    if (state[shieldIndex] <= 0) {
      state[shieldIndex] = 100;
      state[scoreIndex] = Math.max(0, state[scoreIndex] - 250);
      state[heatIndex] = 0;
      state[hitPulseIndex] = 1;
    }

    if (state[tapXFramesIndex] > 0) {
      state[tapXFramesIndex] -= 1;
      if (state[tapXFramesIndex] <= 0) state[moveXIndex] = 0;
    }
    if (state[tapYFramesIndex] > 0) {
      state[tapYFramesIndex] -= 1;
      if (state[tapYFramesIndex] <= 0) state[moveYIndex] = 0;
    }
    if (state[tapFireFramesIndex] > 0) {
      state[tapFireFramesIndex] -= 1;
      if (state[tapFireFramesIndex] <= 0) state[fireIndex] = 0;
    }
    if (state[tapBoostFramesIndex] > 0) {
      state[tapBoostFramesIndex] -= 1;
      if (state[tapBoostFramesIndex] <= 0) state[boostIndex] = 0;
    }

    state[frameIndex] += 1;
  }

  function uniformsFor(
    drawMode: number,
    modelX: number,
    modelY: number,
    modelZ: number,
    modelScale: number,
    modelRotation: number,
    tintR: number,
    tintG: number,
    tintB: number,
    modelVisibility: number = 1,
  ): number[] {
    return [
      state[frameIndex] / 60,
      state[playerXIndex],
      state[playerYIndex],
      state[bankIndex],
      state[boostIndex],
      state[fireIndex],
      state[shieldIndex] / 100,
      state[heatIndex],
      state[scorePulseIndex],
      Math.floor(state[scoreIndex] / 300) % 6,
      drawMode,
      modelX,
      modelY,
      modelZ,
      modelScale,
      modelRotation,
      tintR,
      tintG,
      tintB,
      state[hitPulseIndex],
      aspectScale,
      modelVisibility,
    ];
  }

  function controlEventCount(): number {
    return state[eventIndex];
  }

  function scoreText(): string {
    const score = Math.floor(safeNumber(state[scoreIndex], 0));
    const millions = Math.floor(score / 1000000);
    const thousands = Math.floor((score - millions * 1000000) / 1000);
    const remainder = score - millions * 1000000 - thousands * 1000;
    if (millions > 0) {
      let t = "" + thousands;
      if (thousands < 100) t = "0" + t;
      if (thousands < 10) t = "0" + t;
      let r = "" + remainder;
      if (remainder < 100) r = "0" + r;
      if (remainder < 10) r = "0" + r;
      return "" + millions + "," + t + "," + r;
    }
    if (thousands > 0) {
      let r = "" + remainder;
      if (remainder < 100) r = "0" + r;
      if (remainder < 10) r = "0" + r;
      return "" + thousands + "," + r;
    }
    return "" + score;
  }

  function shieldText(): string {
    return "Shield " + Math.floor(safeNumber(state[shieldIndex], 100)) + "%";
  }

  function statusText(): string {
    const wave = 1 + Math.floor((state[frameIndex] / 420) % 10);
    return "WAVE " + wave + "/10";
  }

  const device = MTLCreateSystemDefaultDevice();
  if (!device) {
    return { ready: false, beginControl, endControl, tapControl, controlEventCount, scoreText, shieldText, statusText };
  }

  view.device = device;
  view.colorPixelFormat = MTLPixelFormatBGRA8Unorm_sRGB;
  view.clearColor = MTLClearColorMake(0.002, 0.003, 0.014, 1);
  view.preferredFramesPerSecond = 60;
  view.enableSetNeedsDisplay = false;
  view.paused = false;
  view.clipsToBounds = true;

  const commandQueue = device.newCommandQueue();
  const library = device.newLibraryWithSourceOptionsError(worldShaderSource, new MTLCompileOptions());
  const playerBuffer = device.newBufferWithBytesLengthOptions(PLAYER_MODEL, PLAYER_MODEL.length * 4, 0);
  const enemyBuffer = device.newBufferWithBytesLengthOptions(ENEMY_MODEL, ENEMY_MODEL.length * 4, 0);
  const bossBuffer = device.newBufferWithBytesLengthOptions(BOSS_MODEL, BOSS_MODEL.length * 4, 0);
  const meteorBuffer = device.newBufferWithBytesLengthOptions(METEOR_MODEL, METEOR_MODEL.length * 4, 0);
  if (!commandQueue || !library || !playerBuffer || !enemyBuffer || !bossBuffer || !meteorBuffer) {
    return { ready: false, beginControl, endControl, tapControl, controlEventCount, scoreText, shieldText, statusText };
  }

  const vertexFunction = library.newFunctionWithName("world_vertex_main");
  const fragmentFunction = library.newFunctionWithName("world_fragment_main");
  if (!vertexFunction || !fragmentFunction) {
    return { ready: false, beginControl, endControl, tapControl, controlEventCount, scoreText, shieldText, statusText };
  }

  const descriptor = new MTLRenderPipelineDescriptor();
  descriptor.vertexFunction = vertexFunction;
  descriptor.fragmentFunction = fragmentFunction;
  descriptor.colorAttachments.objectAtIndexedSubscript(0).pixelFormat = view.colorPixelFormat;

  const pipelineState = device.newRenderPipelineStateWithDescriptorError(descriptor);
  if (!pipelineState) {
    return { ready: false, beginControl, endControl, tapControl, controlEventCount, scoreText, shieldText, statusText };
  }

  view.delegate = MTKViewDelegate.create(() => {
    const pass = view.currentRenderPassDescriptor;
    const drawable = view.currentDrawable;
    if (!pass || !drawable) return;

    const drawableSize = view.drawableSize;
    if (drawableSize.width > 0 && drawableSize.height > 0) {
      aspectScale = drawableSize.height / drawableSize.width;
    }

    updateSimulation(1 / 60);
    const time = state[frameIndex] / 60;
    if (state[frameIndex] % 6 === 0) {
      statusLabel.text = statusText();
      scoreLabel.text = scoreText();
      shieldLabel.text = shieldText();
    }

    const commandBuffer = commandQueue.commandBuffer();
    if (!commandBuffer) return;

    const encoder = commandBuffer.renderCommandEncoderWithDescriptor(pass);
    if (!encoder) return;

    encoder.setRenderPipelineState(pipelineState);

    const backdropUniforms = uniformsFor(0, 0, 0, 0, 1, 0, 1, 1, 1);
    encoder.setVertexBytesLengthAtIndex(backdropUniforms, backdropUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, backdropVertexCount);

    const meteorADepth = meteorDepth(0, time);
    const meteorAUniforms = uniformsFor(3, meteorWorldX(0, time, aspectScale), meteorWorldY(0, time), meteorADepth, 0.38, time * 1.15, 0.96, 0.82, 0.68, cycleVisibility(meteorRun(0, time)));
    encoder.setVertexBytesLengthAtIndex(meteorAUniforms, meteorAUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(meteorBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, METEOR_MODEL_VERTEX_COUNT);

    const meteorBDepth = meteorDepth(1, time);
    const meteorBUniforms = uniformsFor(3, meteorWorldX(1, time, aspectScale), meteorWorldY(1, time), meteorBDepth, 0.34, -time * 1.04, 0.94, 0.80, 0.66, cycleVisibility(meteorRun(1, time)));
    encoder.setVertexBytesLengthAtIndex(meteorBUniforms, meteorBUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(meteorBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, METEOR_MODEL_VERTEX_COUNT);

    const meteorCDepth = meteorDepth(2, time);
    const meteorCUniforms = uniformsFor(3, meteorWorldX(2, time, aspectScale), meteorWorldY(2, time), meteorCDepth, 0.52, time * 0.48, 0.92, 0.78, 0.64, cycleVisibility(meteorRun(2, time)));
    encoder.setVertexBytesLengthAtIndex(meteorCUniforms, meteorCUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(meteorBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, METEOR_MODEL_VERTEX_COUNT);

    const meteorDDepth = meteorDepth(3, time);
    const meteorDUniforms = uniformsFor(3, meteorWorldX(3, time, aspectScale), meteorWorldY(3, time), meteorDDepth, 0.62, -time * 0.40, 0.88, 0.72, 0.58, cycleVisibility(meteorRun(3, time)));
    encoder.setVertexBytesLengthAtIndex(meteorDUniforms, meteorDUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(meteorBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, METEOR_MODEL_VERTEX_COUNT);

    const bossDepth = enemyDepth(3, time) - 0.92;
    const bossUniforms = uniformsFor(2, enemyWorldX(3, time, aspectScale), enemyWorldY(3, time), bossDepth, 0.76, Math.sin(time * 0.42) * 0.12, 0.94, 0.18, 0.16, cycleVisibility(enemyRun(3, time)));
    encoder.setVertexBytesLengthAtIndex(bossUniforms, bossUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(bossBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, BOSS_MODEL_VERTEX_COUNT);

    const enemyADepth = enemyDepth(0, time);
    const enemyAUniforms = uniformsFor(2, enemyWorldX(0, time, aspectScale), enemyWorldY(0, time), enemyADepth, 0.38, Math.sin(time) * 0.20, 1.0, 0.14, 0.36, cycleVisibility(enemyRun(0, time)));
    encoder.setVertexBytesLengthAtIndex(enemyAUniforms, enemyAUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(enemyBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, ENEMY_MODEL_VERTEX_COUNT);

    const enemyBDepth = enemyDepth(1, time);
    const enemyBUniforms = uniformsFor(2, enemyWorldX(1, time, aspectScale), enemyWorldY(1, time), enemyBDepth, 0.36, Math.sin(time * 1.4) * 0.18, 0.86, 0.26, 1.0, cycleVisibility(enemyRun(1, time)));
    encoder.setVertexBytesLengthAtIndex(enemyBUniforms, enemyBUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(enemyBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, ENEMY_MODEL_VERTEX_COUNT);

    const enemyCDepth = enemyDepth(2, time);
    const enemyCUniforms = uniformsFor(2, enemyWorldX(2, time, aspectScale), enemyWorldY(2, time), enemyCDepth, 0.37, Math.sin(time * 1.1) * 0.16, 0.72, 0.22, 1.0, cycleVisibility(enemyRun(2, time)));
    encoder.setVertexBytesLengthAtIndex(enemyCUniforms, enemyCUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(enemyBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, ENEMY_MODEL_VERTEX_COUNT);

    for (let slot = 0; slot < 3; slot += 1) {
      const run = enemyShotRun(slot, time);
      const depth = enemyShotDepth(slot, time);
      const boltX = worldXFromClip(enemyShotClipX(slot, time), depth, aspectScale);
      const boltY = worldYFromClip(enemyShotClipY(slot, time), depth);
      const enemyBolt = uniformsFor(4, boltX, boltY, depth, 0.074 + run * 0.024, enemyShotRotation(slot, time), 1.0, 0.18, 0.12);
      encoder.setVertexBytesLengthAtIndex(enemyBolt, enemyBolt.length * 4, 0);
      encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
      encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 6);
    }

    if (state[fireIndex] > 0.5 || state[scorePulseIndex] > 0.12) {
      const playerClipX = clipXFromWorld(state[playerXIndex], playerDepth, aspectScale);
      const playerClipY = clipYFromWorld(state[playerYIndex], playerDepth);
      for (let slot = 0; slot < 7; slot += 1) {
        const depth = playerShotDepth(slot, time);
        const shotX = worldXFromClip(playerShotClipX(slot, time, playerClipX), depth, aspectScale);
        const shotY = worldYFromClip(playerShotClipY(slot, time, playerClipY), depth);
        const playerBolt = uniformsFor(5, shotX, shotY, depth, 0.045, 0, 0.26, 0.88, 1.0);
        encoder.setVertexBytesLengthAtIndex(playerBolt, playerBolt.length * 4, 0);
        encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
        encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 6);
      }
    }

    const engineClipX = clipXFromWorld(state[playerXIndex], playerDepth, aspectScale);
    const engineClipY = clipYFromWorld(state[playerYIndex] - 0.11, playerDepth);
    for (let slot = 0; slot < 3; slot += 1) {
      const offset = (slot - 1) * 0.040;
      const engineX = worldXFromClip(engineClipX + offset, playerDepth, aspectScale);
      const engineY = worldYFromClip(engineClipY - Math.abs(offset) * 0.20, playerDepth);
      const engineUniforms = uniformsFor(5, engineX, engineY, playerDepth + 0.02, 0.120 + state[boostIndex] * 0.045, 3.14159, 0.10, 0.62, 1.0);
      encoder.setVertexBytesLengthAtIndex(engineUniforms, engineUniforms.length * 4, 0);
      encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
      encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 6);
    }

    const playerUniforms = uniformsFor(1, state[playerXIndex], state[playerYIndex], playerDepth, 0.40, state[bankIndex], 0.18, 0.88, 1.0);
    encoder.setVertexBytesLengthAtIndex(playerUniforms, playerUniforms.length * 4, 0);
    encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, PLAYER_MODEL_VERTEX_COUNT);

    if (state[explosionFramesIndex] > 0) {
      const explosionRun = 1 - state[explosionFramesIndex] / explosionDurationFrames;
      const explosionFade = (1 - explosionRun) * (0.72 + explosionRun * 0.42);
      const blastUniforms = uniformsFor(
        8,
        state[explosionXIndex],
        state[explosionYIndex],
        state[explosionDepthIndex],
        0.22 + explosionRun * 0.38,
        state[explosionSeedIndex],
        1.0,
        0.42,
        0.08,
        explosionFade,
      );
      encoder.setVertexBytesLengthAtIndex(blastUniforms, blastUniforms.length * 4, 0);
      encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
      encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 6);

      const coreUniforms = uniformsFor(
        8,
        state[explosionXIndex],
        state[explosionYIndex],
        state[explosionDepthIndex] - 0.02,
        0.12 + explosionRun * 0.18,
        state[explosionSeedIndex] + 1.7,
        1.0,
        0.82,
        0.26,
        explosionFade * 0.84,
      );
      encoder.setVertexBytesLengthAtIndex(coreUniforms, coreUniforms.length * 4, 0);
      encoder.setVertexBufferOffsetAtIndex(playerBuffer, 0, 1);
      encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 6);
    }

    encoder.endEncoding();
    commandBuffer.presentDrawable(drawable);
    commandBuffer.commit();
  });

  return { ready: true, beginControl, endControl, tapControl, controlEventCount, scoreText, shieldText, statusText };
}
