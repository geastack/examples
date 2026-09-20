#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(root, "assets/models");
const outFile = path.join(root, "src/spaceModels.ts");

const models = [
  {
    exportName: "PLAYER_MODEL",
    vertexCountName: "PLAYER_MODEL_VERTEX_COUNT",
    source: "quaternius-ultimate-spaceships/player-spitfire.gltf",
    texture: "quaternius-ultimate-spaceships/player-spitfire-blue.png",
    tint: [1.08, 1.12, 1.18],
    lift: 0.14,
    textureSubdivisions: 1,
    simplifyGrid: 94,
  },
  {
    exportName: "ENEMY_MODEL",
    vertexCountName: "ENEMY_MODEL_VERTEX_COUNT",
    source: "quaternius-ultimate-spaceships/enemy-striker.gltf",
    texture: "quaternius-ultimate-spaceships/enemy-striker-red.png",
    tint: [1.16, 0.84, 0.78],
    lift: 0.14,
    textureSubdivisions: 1,
    simplifyGrid: 88,
  },
  {
    exportName: "BOSS_MODEL",
    vertexCountName: "BOSS_MODEL_VERTEX_COUNT",
    source: "quaternius-ultimate-spaceships/player-spitfire.gltf",
    texture: "quaternius-ultimate-spaceships/boss-spitfire-red.png",
    tint: [1.16, 0.82, 0.74],
    lift: 0.14,
    textureSubdivisions: 1,
    simplifyGrid: 86,
  },
  {
    exportName: "METEOR_MODEL",
    vertexCountName: "METEOR_MODEL_VERTEX_COUNT",
    source: "nasa-eros/eros.glb",
    tint: [1.05, 0.96, 0.86],
    lift: 0.48,
    textureSubdivisions: 1,
  },
];

const COMPONENT_SIZES = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

const COMPONENT_READERS = {
  5120: { bytes: 1, read: (buffer, offset) => buffer.readInt8(offset), normalize: (value) => Math.max(value / 127, -1) },
  5121: { bytes: 1, read: (buffer, offset) => buffer.readUInt8(offset), normalize: (value) => value / 255 },
  5122: { bytes: 2, read: (buffer, offset) => buffer.readInt16LE(offset), normalize: (value) => Math.max(value / 32767, -1) },
  5123: { bytes: 2, read: (buffer, offset) => buffer.readUInt16LE(offset), normalize: (value) => value / 65535 },
  5125: { bytes: 4, read: (buffer, offset) => buffer.readUInt32LE(offset), normalize: (value) => value / 4294967295 },
  5126: { bytes: 4, read: (buffer, offset) => buffer.readFloatLE(offset), normalize: (value) => value },
};

function readGlb(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("utf8", 0, 4) !== "glTF") throw new Error(`${filePath} is not a GLB file`);
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`${filePath} uses unsupported GLB version ${version}`);

  let offset = 12;
  const chunks = {};
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    chunks[type] = data;
    offset += 8 + length;
  }

  const json = JSON.parse(chunks[0x4e4f534a].toString("utf8"));
  const bin = chunks[0x004e4942];
  if (!bin) throw new Error(`${filePath} does not contain a binary chunk`);
  return { json, buffers: [bin] };
}

function dataUriBuffer(uri, filePath) {
  const marker = ";base64,";
  const markerIndex = uri.indexOf(marker);
  if (markerIndex === -1) throw new Error(`${filePath} contains an unsupported non-base64 data URI`);
  return Buffer.from(uri.slice(markerIndex + marker.length), "base64");
}

function readGltf(filePath) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const baseDir = path.dirname(filePath);
  const buffers = (json.buffers ?? []).map((buffer) => {
    if (buffer.uri?.startsWith("data:")) return dataUriBuffer(buffer.uri, filePath);
    if (buffer.uri) return fs.readFileSync(path.resolve(baseDir, buffer.uri));
    throw new Error(`${filePath} contains an unsupported buffer`);
  });
  return { json, buffers };
}

function readModel(filePath) {
  if (filePath.endsWith(".glb")) return readGlb(filePath);
  if (filePath.endsWith(".gltf")) return readGltf(filePath);
  throw new Error(`Unsupported model format: ${filePath}`);
}

function readBufferView(glb, index) {
  const view = glb.json.bufferViews[index];
  const buffer = glb.buffers[view.buffer ?? 0];
  const start = view.byteOffset ?? 0;
  return buffer.slice(start, start + view.byteLength);
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function decodePng(buffer) {
  if (buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("Unsupported texture format");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`Unsupported PNG texture: bitDepth=${bitDepth} colorType=${colorType}`);
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    inflated.copy(current, 0, inputOffset, inputOffset + stride);
    inputOffset += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 1) current[x] = (current[x] + left) & 255;
      else if (filter === 2) current[x] = (current[x] + up) & 255;
      else if (filter === 3) current[x] = (current[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) current[x] = (current[x] + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * bytesPerPixel;
      const target = (y * width + x) * 4;
      pixels[target] = current[source];
      pixels[target + 1] = current[source + 1];
      pixels[target + 2] = current[source + 2];
      pixels[target + 3] = colorType === 6 ? current[source + 3] : 255;
    }

    current.copy(previous);
  }

  return { width, height, pixels };
}

function textureFor(glb, textureIndex) {
  glb.textureCache ??= new Map();
  if (glb.textureCache.has(textureIndex)) return glb.textureCache.get(textureIndex);
  const texture = glb.json.textures?.[textureIndex];
  const image = texture ? glb.json.images?.[texture.source] : undefined;
  if (!image || image.mimeType !== "image/png" || image.bufferView === undefined) return undefined;
  const decoded = decodePng(readBufferView(glb, image.bufferView));
  glb.textureCache.set(textureIndex, decoded);
  return decoded;
}

function sampleTexture(texture, uv) {
  if (!texture || !uv) return [1, 1, 1];
  const wrappedU = ((uv[0] % 1) + 1) % 1;
  const wrappedV = ((uv[1] % 1) + 1) % 1;
  const x = Math.min(texture.width - 1, Math.max(0, Math.floor(wrappedU * texture.width)));
  const y = Math.min(texture.height - 1, Math.max(0, Math.floor(wrappedV * texture.height)));
  const offset = (y * texture.width + x) * 4;
  return [
    texture.pixels[offset] / 255,
    texture.pixels[offset + 1] / 255,
    texture.pixels[offset + 2] / 255,
  ];
}

function readAccessor(glb, index) {
  const accessor = glb.json.accessors[index];
  const view = glb.json.bufferViews[accessor.bufferView];
  const component = COMPONENT_READERS[accessor.componentType];
  const components = COMPONENT_SIZES[accessor.type];
  if (!component || !components) throw new Error(`Unsupported accessor ${index}`);

  const buffer = glb.buffers[view.buffer ?? 0];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? component.bytes * components;
  const values = [];
  for (let row = 0; row < accessor.count; row += 1) {
    const base = start + row * stride;
    const item = [];
    for (let col = 0; col < components; col += 1) {
      const raw = component.read(buffer, base + col * component.bytes);
      item.push(accessor.normalized ? component.normalize(raw) : raw);
    }
    values.push(components === 1 ? item[0] : item);
  }
  return values;
}

function identityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function multiplyMatrix(a, b) {
  const out = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[row * 4 + col] =
        a[row * 4] * b[col] +
        a[row * 4 + 1] * b[4 + col] +
        a[row * 4 + 2] * b[8 + col] +
        a[row * 4 + 3] * b[12 + col];
    }
  }
  return out;
}

function matrixFromNode(node) {
  if (node.matrix) {
    return [
      node.matrix[0], node.matrix[4], node.matrix[8], node.matrix[12],
      node.matrix[1], node.matrix[5], node.matrix[9], node.matrix[13],
      node.matrix[2], node.matrix[6], node.matrix[10], node.matrix[14],
      node.matrix[3], node.matrix[7], node.matrix[11], node.matrix[15],
    ];
  }

  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;

  return [
    (1 - 2 * (yy + zz)) * sx, (2 * (xy - wz)) * sy, (2 * (xz + wy)) * sz, tx,
    (2 * (xy + wz)) * sx, (1 - 2 * (xx + zz)) * sy, (2 * (yz - wx)) * sz, ty,
    (2 * (xz - wy)) * sx, (2 * (yz + wx)) * sy, (1 - 2 * (xx + yy)) * sz, tz,
    0, 0, 0, 1,
  ];
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
    matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
    matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11],
  ];
}

function normalizeVector(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function interpolate(a, b, c, weights) {
  return [
    a[0] * weights[0] + b[0] * weights[1] + c[0] * weights[2],
    a[1] * weights[0] + b[1] * weights[1] + c[1] * weights[2],
    a[2] * weights[0] + b[2] * weights[1] + c[2] * weights[2],
  ];
}

function interpolateUv(a, b, c, weights) {
  return [
    a[0] * weights[0] + b[0] * weights[1] + c[0] * weights[2],
    a[1] * weights[0] + b[1] * weights[1] + c[1] * weights[2],
  ];
}

function interpolateVertex(triangle, weights) {
  const [a, b, c] = triangle.vertices;
  const uv = interpolateUv(a.uv, b.uv, c.uv, weights);
  const texture = a.texture ?? b.texture ?? c.texture;
  return {
    position: interpolate(a.position, b.position, c.position, weights),
    normal: normalizeVector(interpolate(a.normal, b.normal, c.normal, weights)),
    uv,
    texture,
    textureColor: sampleTexture(texture, uv),
  };
}

function subdivideTriangle(triangle, steps) {
  if (steps <= 1) return [triangle];
  const vertexAt = (i, j) => {
    const b = i / steps;
    const c = j / steps;
    return interpolateVertex(triangle, [1 - b - c, b, c]);
  };
  const triangles = [];
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps - i; j += 1) {
      const a = vertexAt(i, j);
      const b = vertexAt(i + 1, j);
      const c = vertexAt(i, j + 1);
      triangles.push({ vertices: [a, b, c] });
      if (j < steps - i - 1) {
        const d = vertexAt(i + 1, j + 1);
        triangles.push({ vertices: [b, d, c] });
      }
    }
  }
  return triangles;
}

function bakeTextureDetail(triangles, subdivisions) {
  if (subdivisions <= 1) return triangles;
  return triangles.flatMap((triangle) => subdivideTriangle(triangle, subdivisions));
}

function transformDirection(matrix, direction) {
  const [x, y, z] = direction;
  return normalizeVector([
    matrix[0] * x + matrix[1] * y + matrix[2] * z,
    matrix[4] * x + matrix[5] * y + matrix[6] * z,
    matrix[8] * x + matrix[9] * y + matrix[10] * z,
  ]);
}

function normalizeTriangles(triangles, lift) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const triangle of triangles) {
    for (const vertex of triangle.vertices) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], vertex.position[axis]);
        max[axis] = Math.max(max[axis], vertex.position[axis]);
      }
    }
  }

  const center = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const scale = 1 / Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

  for (const triangle of triangles) {
    for (const vertex of triangle.vertices) {
      vertex.position = [
        (vertex.position[0] - center[0]) * scale,
        (vertex.position[1] - min[1]) * scale - lift,
        (vertex.position[2] - center[2]) * scale,
      ];
    }
  }
  return triangles;
}

function sortTriangles(triangles) {
  triangles.sort((a, b) => {
    const aDepth = a.vertices.reduce((sum, vertex) => sum + vertex.position[2] + vertex.position[1] * 0.44, 0);
    const bDepth = b.vertices.reduce((sum, vertex) => sum + vertex.position[2] + vertex.position[1] * 0.44, 0);
    return aDepth - bDepth;
  });
  return triangles;
}

function triangleArea(triangle) {
  const [a, b, c] = triangle.vertices.map((vertex) => vertex.position);
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  return Math.hypot(cross[0], cross[1], cross[2]) * 0.5;
}

function keepLargestTriangles(triangles, budget) {
  if (!budget || triangles.length <= budget) return triangles;
  return triangles
    .map((triangle, index) => ({ triangle, index, area: triangleArea(triangle) }))
    .sort((a, b) => (b.area - a.area) || (a.index - b.index))
    .slice(0, budget)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.triangle);
}

function addToVector(target, source, weight = 1) {
  target[0] += source[0] * weight;
  target[1] += source[1] * weight;
  target[2] += source[2] * weight;
}

function divideVector(source, count) {
  return [source[0] / count, source[1] / count, source[2] / count];
}

function simplifyTriangles(triangles, simplify) {
  const grid = typeof simplify === "number" ? simplify : simplify?.positionGrid;
  const uvGrid = typeof simplify === "object" ? simplify.uvGrid ?? 0 : 0;
  const colorGrid = typeof simplify === "object" ? simplify.colorGrid ?? 0 : 0;
  if (!grid || grid <= 0) return triangles;

  const clusters = new Map();
  const triangleKeys = [];
  const keyFor = (vertex) => {
    const parts = [
      Math.round(vertex.position[0] * grid),
      Math.round(vertex.position[1] * grid),
      Math.round(vertex.position[2] * grid),
    ];
    if (uvGrid > 0) {
      parts.push(
        Math.round((vertex.uv?.[0] ?? 0) * uvGrid),
        Math.round((vertex.uv?.[1] ?? 0) * uvGrid),
      );
    }
    if (colorGrid > 0) {
      parts.push(
        Math.round(vertex.textureColor[0] * colorGrid),
        Math.round(vertex.textureColor[1] * colorGrid),
        Math.round(vertex.textureColor[2] * colorGrid),
      );
    }
    return parts.join(":");
  };

  for (const triangle of triangles) {
    const keys = [];
    for (const vertex of triangle.vertices) {
      const key = keyFor(vertex);
      keys.push(key);
      let cluster = clusters.get(key);
      if (!cluster) {
        cluster = { count: 0, position: [0, 0, 0], normal: [0, 0, 0], textureColor: [0, 0, 0] };
        clusters.set(key, cluster);
      }
      cluster.count += 1;
      addToVector(cluster.position, vertex.position);
      addToVector(cluster.normal, vertex.normal);
      addToVector(cluster.textureColor, vertex.textureColor);
    }
    triangleKeys.push(keys);
  }

  const vertices = new Map();
  for (const [key, cluster] of clusters) {
    vertices.set(key, {
      position: divideVector(cluster.position, cluster.count),
      normal: normalizeVector(divideVector(cluster.normal, cluster.count)),
      uv: [0, 0],
      texture: undefined,
      textureColor: divideVector(cluster.textureColor, cluster.count),
    });
  }

  const deduped = new Set();
  const simplified = [];
  for (const keys of triangleKeys) {
    if (keys[0] === keys[1] || keys[1] === keys[2] || keys[0] === keys[2]) continue;
    const dedupeKey = keys.join("|");
    if (deduped.has(dedupeKey)) continue;
    deduped.add(dedupeKey);
    const triangle = { vertices: keys.map((key) => vertices.get(key)) };
    if (triangleArea(triangle) < 0.000003) continue;
    simplified.push(triangle);
  }
  return simplified;
}

function vertexColor(normal, position, textureColor, tint) {
  const side = Math.max(0, normal[0] * -0.25 + normal[1] * 0.70 + normal[2] * 0.52);
  const altitude = Math.max(0, Math.min(1, position[1] + 0.5));
  const shade = 0.72 + side * 0.22 + altitude * 0.08;
  const average = (textureColor[0] + textureColor[1] + textureColor[2]) / 3;
  return tint.map((channel, index) => {
    const saturated = average + (textureColor[index] - average) * 1.18;
    const accent = Math.max(0, 1 - average) * channel * 0.08;
    return Math.max(0.025, Math.min(1.18, saturated * shade + accent));
  });
}

function collectMesh(glb, meshIndex, matrix, triangles) {
  const mesh = glb.json.meshes?.[meshIndex];
  for (const primitive of mesh?.primitives ?? []) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      const positions = readAccessor(glb, primitive.attributes.POSITION);
      const normals = primitive.attributes.NORMAL !== undefined
        ? readAccessor(glb, primitive.attributes.NORMAL)
        : positions.map(() => [0, 1, 0]);
      const uvs = primitive.attributes.TEXCOORD_0 !== undefined
        ? readAccessor(glb, primitive.attributes.TEXCOORD_0)
        : [];
      const indices = primitive.indices !== undefined
        ? readAccessor(glb, primitive.indices)
        : positions.map((_, index) => index);
      const material = glb.json.materials?.[primitive.material ?? 0];
      const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index;
      const texture = glb.textureOverride ?? (textureIndex !== undefined ? textureFor(glb, textureIndex) : undefined);

      for (let index = 0; index + 2 < indices.length; index += 3) {
        triangles.push({
          vertices: [indices[index], indices[index + 1], indices[index + 2]].map((vertexIndex) => ({
            position: transformPoint(matrix, positions[vertexIndex]),
            normal: transformDirection(matrix, normals[vertexIndex]),
            uv: uvs[vertexIndex] ?? [0, 0],
            texture,
            textureColor: sampleTexture(texture, uvs[vertexIndex]),
          })),
        });
      }
    }
}

function collectNode(glb, nodeIndex, parentMatrix, triangles) {
  const node = glb.json.nodes?.[nodeIndex];
  if (!node) return;
  const matrix = multiplyMatrix(parentMatrix, matrixFromNode(node));
  if (node.mesh !== undefined) collectMesh(glb, node.mesh, matrix, triangles);
  for (const child of node.children ?? []) collectNode(glb, child, matrix, triangles);
}

function asteroidPoint(row, col, rows, cols) {
  const theta = (row / rows) * Math.PI;
  const phi = (col / cols) * Math.PI * 2;
  const ring = Math.sin(theta);
  const baseY = Math.cos(theta);
  const noise =
    Math.sin(row * 2.71 + col * 1.37) * 0.10 +
    Math.sin(row * 5.11 - col * 2.23) * 0.055 +
    Math.cos(row * 1.93 + col * 4.77) * 0.045;
  const radius = 0.48 * (1 + noise);
  const x = Math.cos(phi) * ring * radius * (1 + Math.sin(phi * 3.0) * 0.08);
  const y = baseY * radius + 0.50;
  const z = Math.sin(phi) * ring * radius * (1 + Math.cos(phi * 2.0) * 0.10);
  const normal = normalizeVector([x * 1.05, y - 0.50, z * 1.05]);
  const sun = Math.max(0, normal[0] * -0.36 + normal[1] * 0.55 + normal[2] * 0.42);
  const crater =
    Math.abs(Math.sin(x * 31.0 + z * 19.0 + y * 17.0)) > 0.90 ? 0.18 : 0;
  const shade = 0.32 + sun * 0.48 - crater;
  const warmth = 0.78 + Math.sin(phi * 2.0 + row * 0.43) * 0.08;
  const color = [
    shade * warmth,
    shade * (0.92 + Math.sin(row * 1.4) * 0.04),
    shade * 0.84,
  ];
  return {
    position: [x, y, z],
    normal,
    color: color.map((channel) => Math.max(0.08, Math.min(0.86, channel))),
  };
}

function proceduralAsteroidModel() {
  const rows = 24;
  const cols = 32;
  const values = [];
  const pushVertex = (vertex) => values.push(...vertex.position, ...vertex.color, ...vertex.normal);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const nextCol = (col + 1) % cols;
      const a = asteroidPoint(row, col, rows, cols);
      const b = asteroidPoint(row + 1, col, rows, cols);
      const c = asteroidPoint(row, nextCol, rows, cols);
      const d = asteroidPoint(row + 1, nextCol, rows, cols);
      pushVertex(a);
      pushVertex(b);
      pushVertex(c);
      pushVertex(c);
      pushVertex(b);
      pushVertex(d);
    }
  }
  return values.map((value) => Number(value.toFixed(5)));
}

function triangulatedModel({ source, texture, procedural, tint, lift, textureSubdivisions = 1, triangleBudget, simplifyGrid }) {
  if (procedural === "asteroid") return proceduralAsteroidModel();

  const glb = readModel(path.join(assetRoot, source));
  if (texture) glb.textureOverride = decodePng(fs.readFileSync(path.join(assetRoot, texture)));
  const triangles = [];
  const scene = glb.json.scenes?.[glb.json.scene ?? 0] ?? glb.json.scenes?.[0];
  for (const nodeIndex of scene?.nodes ?? []) {
    collectNode(glb, nodeIndex, identityMatrix(), triangles);
  }

  const values = [];
  const normalized = normalizeTriangles(triangles, lift);
  const simplified = simplifyTriangles(normalized, simplifyGrid);
  const budgeted = keepLargestTriangles(simplified, triangleBudget);
  const preparedTriangles = sortTriangles(bakeTextureDetail(budgeted, textureSubdivisions));
  for (const triangle of preparedTriangles) {
    for (const vertex of triangle.vertices) {
      const color = vertexColor(vertex.normal, vertex.position, vertex.textureColor, tint);
      values.push(...vertex.position, ...color, ...vertex.normal);
    }
  }
  return values.map((value) => Number(value.toFixed(5)));
}

function formatNumberArray(values) {
  const perLine = 12;
  const lines = [];
  for (let index = 0; index < values.length; index += perLine) {
    lines.push(`  ${values.slice(index, index + perLine).join(", ")}`);
  }
  return `[\n${lines.join(",\n")}\n]`;
}

const output = [
  "// Generated by scripts/generate-space-models.mjs from checked-in space model assets.",
  "// Sources: apps/ios-metal-world-game/assets/models/quaternius-ultimate-spaceships/SOURCE.md",
  "//          apps/ios-metal-world-game/assets/models/nasa-eros/SOURCE.md",
  "",
  'export const SPACE_MODEL_SOURCE = "Quaternius Ultimate Spaceships + NASA Eros";',
  'export const SPACE_MODEL_LICENSE = "Quaternius Ultimate Spaceships CC0; NASA VTAD credited";',
  "",
];

for (const model of models) {
  const values = triangulatedModel(model);
  output.push(`export const ${model.exportName}: number[] = ${formatNumberArray(values)};`);
  output.push("");
  output.push(`export const ${model.vertexCountName} = ${values.length / 9};`);
  output.push("");
}

fs.writeFileSync(outFile, `${output.join("\n").trimEnd()}\n`);
console.log(`wrote ${path.relative(process.cwd(), outFile)}`);
