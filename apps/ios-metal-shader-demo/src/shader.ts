export const shaderDemoSource = `
#include <metal_stdlib>
using namespace metal;

struct ShaderVertexOut {
  float4 position [[position]];
  float2 uv;
  float4 controls;
};

struct ShaderUniforms {
  float time;
  float mode;
  float intensity;
  float hue;
};

vertex ShaderVertexOut shader_demo_vertex_main(
  uint vertexId [[vertex_id]],
  constant ShaderUniforms &uniforms [[buffer(0)]])
{
  const float2 positions[3] = {
    float2(-1.0, -1.0),
    float2( 3.0, -1.0),
    float2(-1.0,  3.0),
  };
  ShaderVertexOut out;
  out.position = float4(positions[vertexId], 0.0, 1.0);
  out.uv = positions[vertexId] * 0.5 + 0.5;
  out.controls = float4(uniforms.time, uniforms.mode, uniforms.intensity, uniforms.hue);
  return out;
}

fragment float4 shader_demo_fragment_main(ShaderVertexOut input [[stage_in]])
{
  float2 p = input.uv * 2.0 - 1.0;
  float t = input.controls.x;
  float mode = input.controls.y;
  float intensity = input.controls.z;
  float hue = input.controls.w;
  float2 drift = float2(sin(t * 0.73 + hue), cos(t * 0.61 - hue)) * (0.08 + intensity * 0.04);
  float2 q = p + drift;
  if (mode > 0.5 && mode < 1.5) {
    float angle = atan2(q.y, q.x) + sin(t * 0.8) * 0.35;
    float radius = length(q);
    q = float2(cos(angle), sin(angle)) * radius;
  } else if (mode >= 1.5) {
    q += normalize(q + 0.0001) * sin(length(q) * 12.0 - t * 2.4) * 0.07;
  }
  float wave = sin(q.x * (6.4 + intensity * 2.8) + t * 1.4) + cos(q.y * 8.5 - t * 1.1);
  float rings = sin(length(q) * (17.0 + intensity * 6.0) - t * 2.1);
  float glint = smoothstep(0.04, 0.0, abs(length(q - float2(0.26 + sin(t) * 0.08, -0.22)) - (0.32 + intensity * 0.12)));
  float3 colorA = float3(0.04, 0.78, 1.00);
  float3 colorB = mix(float3(0.93, 0.30, 1.00), float3(0.20, 0.96, 0.64), smoothstep(0.0, 2.0, hue));
  float3 colorC = mix(float3(1.00, 0.86, 0.24), float3(1.00, 0.44, 0.18), smoothstep(0.0, 2.0, hue));
  float mixer = smoothstep(-1.35, 1.35, wave + rings * 0.44);
  float3 color = mix(colorA, colorB, mixer);
  color = mix(color, colorC, glint);
  color += float3(0.06, 0.03, 0.11) * (1.0 - length(q));
  return float4(pow(saturate(color), float3(0.82)), 1.0);
}
`;
