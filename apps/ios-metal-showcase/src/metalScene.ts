import {
  MTLCompileOptions,
  MTLCreateSystemDefaultDevice,
  MTLClearColorMake,
  MTLPixelFormatBGRA8Unorm_sRGB,
  MTLPrimitiveTypeTriangle,
  MTLRenderPipelineDescriptor,
} from "@geastack/apple/Metal";
import { MTKView, MTKViewDelegate } from "@geastack/apple/MetalKit";
import { orbitShaderSource } from "./shader";

const orbitVertexCount = 36;

class MetalOrbitState {
  frame = 0;
  speed = 1.0;
  palette = 0;
  tilt = 0;
  paused = false;

  update(command: string): void {
    if (command === "speed") this.speed = this.speed >= 2.0 ? 0.55 : this.speed + 0.45;
    else if (command === "palette") this.palette = (this.palette + 1) % 3;
    else if (command === "tilt") this.tilt = (this.tilt + 1) % 3;
    else if (command === "pause") this.paused = !this.paused;
  }

  nextUniforms(): number[] {
    if (!this.paused) this.frame += 1;
    return [this.frame / 60, this.speed, this.palette, this.tilt];
  }
}

const orbitState = new MetalOrbitState();

export function updateOrbitControl(command: string): void {
  orbitState.update(command);
}

export function installOrbitScene(view: MTKView): boolean {
  const device = MTLCreateSystemDefaultDevice();
  if (!device) return false;

  view.device = device;
  view.colorPixelFormat = MTLPixelFormatBGRA8Unorm_sRGB;
  view.clearColor = MTLClearColorMake(0.014, 0.018, 0.040, 1);
  view.preferredFramesPerSecond = 60;
  view.enableSetNeedsDisplay = false;
  view.paused = false;
  view.clipsToBounds = true;

  const commandQueue = device.newCommandQueue();
  const library = device.newLibraryWithSourceOptionsError(orbitShaderSource, new MTLCompileOptions());
  if (!commandQueue || !library) return false;

  const vertexFunction = library.newFunctionWithName("orbit_vertex_main");
  const fragmentFunction = library.newFunctionWithName("orbit_fragment_main");
  if (!vertexFunction || !fragmentFunction) return false;

  const descriptor = new MTLRenderPipelineDescriptor();
  descriptor.vertexFunction = vertexFunction;
  descriptor.fragmentFunction = fragmentFunction;
  descriptor.colorAttachments.objectAtIndexedSubscript(0).pixelFormat = view.colorPixelFormat;

  const pipelineState = device.newRenderPipelineStateWithDescriptorError(descriptor);
  if (!pipelineState) return false;

  view.delegate = MTKViewDelegate.create(() => {
    const pass = view.currentRenderPassDescriptor;
    const drawable = view.currentDrawable;
    if (!pass || !drawable) return;

    const commandBuffer = commandQueue.commandBuffer();
    if (!commandBuffer) return;

    const encoder = commandBuffer.renderCommandEncoderWithDescriptor(pass);
    if (!encoder) return;

    const uniforms = orbitState.nextUniforms();
    encoder.setRenderPipelineState(pipelineState);
    encoder.setVertexBytesLengthAtIndex(uniforms, uniforms.length * 4, 0);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, orbitVertexCount);
    encoder.endEncoding();
    commandBuffer.presentDrawable(drawable);
    commandBuffer.commit();
  });

  return true;
}
