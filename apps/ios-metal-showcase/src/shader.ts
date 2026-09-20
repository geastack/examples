export const orbitShaderSource = `
#include <metal_stdlib>
using namespace metal;

struct VertexOut {
  float4 position [[position]];
  float4 color;
};

struct OrbitUniforms {
  float time;
  float speed;
  float palette;
  float tilt;
};

float3 cubeCorner(uint corner)
{
  switch (corner) {
    case 0: return float3(-0.70, -0.70,  0.70);
    case 1: return float3( 0.70, -0.70,  0.70);
    case 2: return float3( 0.70,  0.70,  0.70);
    case 3: return float3(-0.70,  0.70,  0.70);
    case 4: return float3(-0.70, -0.70, -0.70);
    case 5: return float3( 0.70, -0.70, -0.70);
    case 6: return float3( 0.70,  0.70, -0.70);
    default: return float3(-0.70,  0.70, -0.70);
  }
}

uint cubeIndex(uint vertexId)
{
  const uint indices[36] = {
    0, 1, 2, 0, 2, 3,
    1, 5, 6, 1, 6, 2,
    5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7,
    3, 2, 6, 3, 6, 7,
    4, 5, 1, 4, 1, 0,
  };
  return indices[vertexId];
}

float3 rotateCube(float3 p, float time, float speed, float tilt)
{
  const float yAngle = time * (0.65 + speed * 0.45);
  const float xAngle = 0.48 + sin(time * 0.47) * 0.12 + tilt * 0.22;
  const float cy = cos(yAngle);
  const float sy = sin(yAngle);
  const float cx = cos(xAngle);
  const float sx = sin(xAngle);
  p = float3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  return float3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
}

float3 faceColor(uint face, float palette, float shade)
{
  float3 a = float3(0.12, 0.72, 1.00);
  float3 b = float3(0.19, 0.92, 0.98);
  float3 c = float3(0.92, 0.96, 0.26);
  if (palette > 0.5 && palette < 1.5) {
    a = float3(0.54, 0.42, 1.00);
    b = float3(1.00, 0.36, 0.82);
    c = float3(1.00, 0.80, 0.28);
  } else if (palette >= 1.5) {
    a = float3(0.18, 0.96, 0.64);
    b = float3(0.09, 0.64, 1.00);
    c = float3(0.98, 0.96, 0.36);
  }
  if (face == 1 || face == 4) return b * shade;
  if (face == 2 || face == 5) return c * shade;
  return a * shade;
}

vertex VertexOut orbit_vertex_main(
  uint vertexId [[vertex_id]],
  constant OrbitUniforms &uniforms [[buffer(0)]])
{
  float3 p = cubeCorner(cubeIndex(vertexId));
  p = rotateCube(p, uniforms.time + 0.02, uniforms.speed, uniforms.tilt);
  const float perspective = 1.0 / (2.65 - p.z);
  const float2 projected = p.xy * perspective * 2.08 + float2(0.0, -0.16);
  const uint face = vertexId / 6;
  const float shade = 0.78 + max(p.z, -0.4) * 0.20;
  VertexOut out;
  out.position = float4(projected, p.z * 0.18, 1.0);
  out.color = float4(faceColor(face, uniforms.palette, shade), 1.0);
  return out;
}

fragment float4 orbit_fragment_main(VertexOut input [[stage_in]])
{
  return input.color;
}
`;
