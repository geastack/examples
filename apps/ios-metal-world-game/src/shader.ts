export const worldShaderSource = `
#include <metal_stdlib>
using namespace metal;

struct ModelVertex {
  packed_float3 position;
  packed_float3 color;
  packed_float3 normal;
};

struct VertexOut {
  float4 position [[position]];
  float4 color;
  float2 local;
  float mode;
};

struct WorldUniforms {
  float time;
  float playerX;
  float playerY;
  float bank;
  float boost;
  float fire;
  float shield;
  float heat;
  float scorePulse;
  float wave;
  float drawMode;
  float modelX;
  float modelY;
  float modelZ;
  float modelScale;
  float modelRotation;
  float tintR;
  float tintG;
  float tintB;
  float hitPulse;
  float aspectScale;
  float modelVisibility;
};

float hash11(float n)
{
  return fract(sin(n) * 43758.5453123);
}

float2 rotate2(float2 p, float angle)
{
  const float s = sin(angle);
  const float c = cos(angle);
  return float2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float3 rotateX(float3 p, float angle)
{
  const float2 yz = rotate2(p.yz, angle);
  return float3(p.x, yz.x, yz.y);
}

float3 rotateY(float3 p, float angle)
{
  const float2 xz = rotate2(p.xz, angle);
  return float3(xz.x, p.y, xz.y);
}

float3 rotateZ(float3 p, float angle)
{
  const float2 xy = rotate2(p.xy, angle);
  return float3(xy.x, xy.y, p.z);
}

float2 quadCorner(uint corner, float2 a, float2 b, float2 c, float2 d)
{
  switch (corner) {
    case 0: return a;
    case 1: return b;
    case 2: return c;
    case 3: return c;
    case 4: return d;
    default: return a;
  }
}

VertexOut makeQuad(uint corner, float2 a, float2 b, float2 c, float2 d, float4 color, float depth)
{
  VertexOut out;
  out.position = float4(quadCorner(corner, a, b, c, d), depth, 1.0);
  out.color = color;
  switch (corner) {
    case 0: out.local = float2(-1.0, -1.0); break;
    case 1: out.local = float2(1.0, -1.0); break;
    case 2: out.local = float2(1.0, 1.0); break;
    case 3: out.local = float2(1.0, 1.0); break;
    case 4: out.local = float2(-1.0, 1.0); break;
    default: out.local = float2(-1.0, -1.0); break;
  }
  out.mode = 0.0;
  return out;
}

float2 projectWorld(float3 p, constant WorldUniforms &u)
{
  const float focal = 1.22;
  const float depth = max(p.z, 0.42);
  return float2(p.x * focal * max(u.aspectScale, 0.01) / depth, p.y * focal / depth);
}

float clipDepth(float z)
{
  return clamp((z - 0.75) / 10.5, 0.02, 0.98);
}

VertexOut gradient(uint corner, constant WorldUniforms &u)
{
  const float4 top = float4(0.002, 0.004, 0.018 + u.hitPulse * 0.024, 1.0);
  const float4 bottom = float4(0.006 + u.boost * 0.010, 0.012, 0.040 + u.heat * 0.026, 1.0);
  const float4 color = corner == 1 || corner == 2 || corner == 3 ? top : bottom;
  return makeQuad(corner, float2(-1.0, -1.0), float2(-1.0, 1.0), float2(1.0, 1.0), float2(1.0, -1.0), color, 0.99);
}

VertexOut starfield(uint vertexId, constant WorldUniforms &u)
{
  const uint starId = vertexId / 6;
  const uint corner = vertexId % 6;
  const float seed = float(starId) + 41.0;
  const float speed = 0.018 + hash11(seed * 9.1) * 0.034 + u.boost * 0.020;
  const float travel = fract(hash11(seed * 4.7) + u.time * speed);
  const float wrapFade = smoothstep(0.02, 0.10, travel) * (1.0 - smoothstep(0.90, 0.995, travel));
  const float depth = 10.8 - travel * 9.35;
  const float near = 1.0 - clamp((depth - 1.45) / 9.35, 0.0, 1.0);
  const float worldX = (hash11(seed * 7.3) * 2.0 - 1.0) * 6.9 - u.playerX * (0.18 + near * 0.50);
  const float worldY = (hash11(seed * 13.7) * 2.0 - 1.0) * 7.8 - u.playerY * 0.10;
  const float2 projected = projectWorld(float3(worldX, worldY, depth), u);
  const float x = projected.x;
  const float y = projected.y;
  const float twinkle = 0.55 + 0.45 * sin(u.time * 5.1 + seed * 1.7);
  const float width = 0.00055 + near * 0.0019;
  const float length = width * (1.0 + u.boost * near * 0.42);
  const float warmth = hash11(seed * 5.9);
  const float3 starColor = mix(float3(0.72, 0.82, 1.0), float3(1.0, 0.88, 0.68), warmth * 0.24);
  const float4 color = float4(starColor * (0.30 + near * 0.44 + twinkle * 0.32) * wrapFade, 1.0);
  VertexOut out = makeQuad(
    corner,
    float2(x - width, y - length),
    float2(x + width, y - length),
    float2(x + width, y + length),
    float2(x - width, y + length),
    color,
    0.94);
  out.mode = 6.0;
  return out;
}

VertexOut nebulaVertex(uint vertexId, constant WorldUniforms &u)
{
  const uint cloudId = vertexId / 6;
  const uint corner = vertexId % 6;
  const float seed = float(cloudId) + 13.0;
  const float drift = u.time * (0.004 + hash11(seed * 6.2) * 0.004);
  const float x = (hash11(seed * 2.7) * 2.0 - 1.0) * 1.18 + sin(drift + seed) * 0.035;
  const float y = (hash11(seed * 4.1) * 2.0 - 1.0) * 1.22 + cos(drift * 1.7 + seed) * 0.040;
  const float radiusX = 0.22 + hash11(seed * 9.3) * 0.36;
  const float radiusY = 0.18 + hash11(seed * 7.8) * 0.30;
  const float warmth = hash11(seed * 12.1);
  const float3 blue = float3(0.020, 0.105, 0.26);
  const float3 violet = float3(0.13, 0.040, 0.20);
  const float3 color = mix(blue, violet, warmth) * (0.32 + hash11(seed * 5.9) * 0.20);
  VertexOut out = makeQuad(
    corner,
    float2(x - radiusX, y - radiusY),
    float2(x + radiusX, y - radiusY),
    float2(x + radiusX, y + radiusY),
    float2(x - radiusX, y + radiusY),
    float4(color, 1.0),
    0.97);
  out.mode = 7.0;
  return out;
}

VertexOut backdropVertex(uint vertexId, constant WorldUniforms &u)
{
  if (vertexId < 6) return gradient(vertexId, u);
  return starfield(vertexId - 6, u);
}

float3 orientedLocal(float3 p, float drawMode)
{
  float3 local = float3(p.x * 1.10, p.z * 0.98, p.y * 0.62);
  if (drawMode == 1.0) local = float3(p.z * 1.42, p.x * 1.04, p.y * 0.64);
  if (drawMode == 2.0) local = float3(p.z * 1.34, p.x * 1.02, p.y * 0.62);
  if (drawMode == 3.0) local = float3(p.x, p.y, p.z);
  return local;
}

float3 orientedNormal(float3 n, float drawMode)
{
  float3 normal = normalize(float3(n.x * 1.10, n.z * 0.98, n.y * 0.62));
  if (drawMode == 1.0) normal = normalize(float3(n.z * 1.42, n.x * 1.04, n.y * 0.64));
  if (drawMode == 2.0) normal = normalize(float3(n.z * 1.34, n.x * 1.02, n.y * 0.62));
  if (drawMode == 3.0) normal = normalize(float3(n.x, n.y, n.z));
  return normal;
}

float3 surfaceDetail(float3 base, float3 sourcePosition, float3 normal, float drawMode, constant WorldUniforms &u)
{
  float3 detailed = base;

  if (drawMode == 3.0) {
    const float crater = smoothstep(0.80, 1.0, abs(sin(dot(sourcePosition, float3(19.0, 31.0, 23.0)))));
    const float ridge = smoothstep(0.65, 1.0, abs(dot(normal, normalize(sourcePosition + float3(0.02, 0.11, -0.03)))));
    detailed *= 0.80 + ridge * 0.22 - crater * 0.16;
    detailed = mix(detailed, float3(0.34, 0.30, 0.27), crater * 0.20);
  } else {
    const float cockpit = (1.0 - smoothstep(0.00, 0.06, abs(sourcePosition.x))) *
      smoothstep(0.18, 0.36, sourcePosition.z + 0.50) *
      (1.0 - smoothstep(-0.16, 0.04, sourcePosition.y));
    if (drawMode == 1.0) {
      detailed = mix(detailed * 1.34, float3(0.76, 0.88, 1.0), 0.28);
      detailed = mix(detailed, float3(0.56, 0.78, 0.94), 0.050);
    }
    if (drawMode == 2.0) {
      detailed = mix(detailed * 1.08, float3(1.00, 0.24, 0.16), 0.075);
    }
    detailed = mix(detailed, float3(0.12, 0.78, 1.0) * (0.72 + u.boost * 0.16), cockpit * 0.38);
  }

  return clamp(detailed, float3(0.0), float3(1.25));
}

VertexOut modelVertex(uint vertexId, constant WorldUniforms &u, device const ModelVertex *modelVertices)
{
  const ModelVertex source = modelVertices[vertexId];
  float3 local = orientedLocal(source.position, u.drawMode);
  float3 normal = orientedNormal(source.normal, u.drawMode);

  if (u.drawMode == 1.0) {
    const float playerHeading = 1.5708;
    local = rotateZ(local, playerHeading + u.bank * 0.26);
    normal = rotateZ(normal, playerHeading + u.bank * 0.26);
  } else if (u.drawMode == 2.0) {
    const float enemyHeading = -1.5708;
    const float enemyBank = enemyHeading + sin(u.time * 1.6 + u.modelRotation) * 0.08;
    local = rotateZ(local, enemyBank);
    local = rotateY(local, u.modelRotation * 0.25);
    normal = rotateZ(normal, enemyBank);
    normal = rotateY(normal, u.modelRotation * 0.25);
  } else {
    local = rotateX(local, u.modelRotation * 0.73);
    local = rotateY(local, u.modelRotation);
    normal = rotateX(normal, u.modelRotation * 0.73);
    normal = rotateY(normal, u.modelRotation);
  }

  const float wobble = sin(u.time * 2.2 + source.position.y * 6.0) * 0.012 * (u.drawMode == 1.0 ? 1.0 : 0.25);
  float3 world = float3(u.modelX + (local.x + wobble) * u.modelScale, u.modelY + local.y * u.modelScale, u.modelZ + local.z * u.modelScale);
  const float2 screen = projectWorld(world, u);

  const float3 tint = float3(u.tintR, u.tintG, u.tintB);
  const float3 key = normalize(float3(-0.35, 0.78, -0.50));
  const float3 rim = normalize(float3(0.46, 0.18, -0.86));
  const float lit = 0.68 + max(dot(normal, key), 0.0) * 0.42 + max(dot(normal, rim), 0.0) * 0.20;
  const float panel = 1.0;
  const float boostGlow = u.drawMode == 1.0 ? u.boost * 0.12 + u.fire * 0.06 : 0.0;
  const float enemyGlow = u.drawMode == 2.0 ? 0.14 + u.scorePulse * 0.12 : 0.0;
  const float meteorNoise = sin(source.position.x * 37.0 + source.position.y * 29.0 + source.position.z * 23.0);
  const float meteorShade = u.drawMode == 3.0 ? 0.76 + max(normal.y, -0.2) * 0.18 + meteorNoise * 0.070 : panel;
  const float hitFlash = u.drawMode == 1.0 ? u.hitPulse * 0.28 : 0.0;
  const float tintMix = u.drawMode == 1.0 ? 0.015 : (u.drawMode == 2.0 ? 0.025 : 0.02);
  const float3 bakedTexture = surfaceDetail(float3(source.color), source.position, normal, u.drawMode, u);
  const float3 color = mix(bakedTexture * meteorShade, tint, tintMix) * (lit + boostGlow + enemyGlow + hitFlash);

  VertexOut out;
  out.position = float4(screen, clipDepth(world.z), 1.0);
  out.color = float4(color * u.modelVisibility, u.modelVisibility);
  out.local = float2(0.0, 0.0);
  out.mode = u.drawMode;
  return out;
}

VertexOut boltVertex(uint vertexId, constant WorldUniforms &u)
{
  const uint corner = vertexId % 6;
  const float2 center = projectWorld(float3(u.modelX, u.modelY, u.modelZ), u);
  if (u.drawMode == 8.0) {
    const float radius = u.modelScale / max(u.modelZ, 0.55);
    const float2 blastRadius = float2(radius * max(u.aspectScale, 0.01), radius);
    VertexOut out = makeQuad(
      corner,
      center + float2(-blastRadius.x, -blastRadius.y),
      center + float2(blastRadius.x, -blastRadius.y),
      center + float2(blastRadius.x, blastRadius.y),
      center + float2(-blastRadius.x, blastRadius.y),
      float4(u.tintR, u.tintG, u.tintB, u.modelVisibility),
      clipDepth(u.modelZ) - 0.020);
    out.mode = 8.0;
    return out;
  }
  const float width = u.modelScale * (u.drawMode == 5.0 ? 0.18 : 0.24) / max(u.modelZ, 0.55);
  const float height = u.modelScale * (u.drawMode == 5.0 ? 0.70 : 0.52) / max(u.modelZ, 0.55);
  const float2 dir = normalize(float2(sin(u.modelRotation), cos(u.modelRotation)));
  const float2 side = float2(dir.y, -dir.x);
  const float2 a = center - side * width - dir * height;
  const float2 b = center + side * width - dir * height;
  const float2 c = center + side * width * 0.55 + dir * height;
  const float2 d = center - side * width * 0.55 + dir * height;
  const float3 tint = float3(u.tintR, u.tintG, u.tintB);
  const float pulse = 0.74 + 0.26 * sin(u.time * 22.0 + u.modelZ);
  const float4 color = float4(tint * pulse, 1.0);
  VertexOut out = makeQuad(corner, a, b, c, d, color, clipDepth(u.modelZ) - 0.012);
  out.mode = u.drawMode;
  return out;
}

vertex VertexOut world_vertex_main(
  uint vertexId [[vertex_id]],
  constant WorldUniforms &uniforms [[buffer(0)]],
  device const ModelVertex *modelVertices [[buffer(1)]])
{
  if (uniforms.drawMode < 0.5) return backdropVertex(vertexId, uniforms);
  if (uniforms.drawMode == 4.0 || uniforms.drawMode == 5.0 || uniforms.drawMode == 8.0) return boltVertex(vertexId, uniforms);
  return modelVertex(vertexId, uniforms, modelVertices);
}

fragment float4 world_fragment_main(VertexOut input [[stage_in]])
{
  if (input.mode < 0.5) {
    return float4(input.color.rgb, 1.0);
  }
  if (input.mode == 4.0 || input.mode == 5.0) {
    const float dist = length(input.local);
    if (dist > 1.0) discard_fragment();
    const float core = smoothstep(1.0, 0.05, dist);
    const float hot = smoothstep(0.34, 0.0, dist);
    return float4(input.color.rgb * (0.38 + core * 0.95) + hot * 0.42, 1.0);
  }
  if (input.mode == 6.0) {
    const float core = smoothstep(1.0, 0.10, length(input.local));
    if (core <= 0.01) discard_fragment();
    return float4(input.color.rgb * core, 1.0);
  }
  if (input.mode == 7.0) {
    const float d = length(input.local);
    if (d > 1.0) discard_fragment();
    const float core = smoothstep(1.0, 0.0, d);
    return float4(input.color.rgb * (0.18 + core * 0.82), 1.0);
  }
  if (input.mode == 8.0) {
    const float d = length(input.local);
    if (input.color.a < 0.18) discard_fragment();
    if (d > 1.0) discard_fragment();
    const float angle = atan2(input.local.y, input.local.x);
    const float ring = smoothstep(0.78, 0.34, d) * (1.0 - smoothstep(0.42, 0.82, d));
    const float core = smoothstep(0.48, 0.0, d);
    const float shock = smoothstep(0.78, 0.64, d) * (1.0 - smoothstep(0.70, 0.92, d));
    const float shards = smoothstep(0.82, 1.0, abs(sin(angle * 9.0 + input.color.a * 5.7))) * (1.0 - smoothstep(0.18, 0.96, d));
    const float explosionPower = core * 1.28 + ring * 0.76 + shock * 0.58 + shards * 0.64;
    if (explosionPower < 0.18) discard_fragment();
    const float3 flame = mix(input.color.rgb, float3(1.0, 0.88, 0.30), core + shock * 0.34);
    const float visiblePower = smoothstep(0.18, 1.0, explosionPower);
    return float4(flame * (0.32 + visiblePower * 1.18), 1.0);
  }
  if (input.color.a < 0.03) discard_fragment();
  return float4(input.color.rgb, 1.0);
}
`;
