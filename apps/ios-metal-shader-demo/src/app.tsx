import { CGRectMake, CGSizeMake } from "@geastack/apple/CoreGraphics";
import {
  MTLCompileOptions,
  MTLCreateSystemDefaultDevice,
  MTLClearColorMake,
  MTLPixelFormatBGRA8Unorm_sRGB,
  MTLPrimitiveTypeTriangle,
  MTLRenderPipelineDescriptor,
} from "@geastack/apple/Metal";
import { MTKView, MTKViewDelegate } from "@geastack/apple/MetalKit";
import {
  ObjCTarget,
  ObjCTargetAction,
  UIButton,
  UIColor,
  UIFont,
  UIControlEventTouchUpInside,
  UIImage,
  UIImageView,
  UILabel,
  UIProgressView,
  UIView,
  installRootView,
} from "@geastack/apple/UIKit";
import { metalShaderLayout } from "./constants";
import { shaderDemoSource } from "./shader";

class ShaderDemoState {
  frame = 0;
  mode = 0;
  intensity = 0.48;
  hue = 0;

  nextUniforms(): number[] {
    const uniforms = [this.frame / 60, this.mode, this.intensity, this.hue];
    this.frame += 1;
    return uniforms;
  }

  cycleMode(): void {
    this.mode = (this.mode + 1) % 3;
  }

  pulse(): void {
    this.intensity = this.intensity > 0.75 ? 0.34 : this.intensity + 0.22;
  }

  cycleHue(): void {
    this.hue = (this.hue + 1) % 3;
  }
}

const shaderDemoState = new ShaderDemoState();

const retainedShaderTargets: unknown[] = [];

function addShaderAction(button: UIButton, action: () => void): void {
  const target = ObjCTarget.create(action);
  retainedShaderTargets.push(target);
  button.addTarget(target, ObjCTargetAction, UIControlEventTouchUpInside);
}

function installShaderPipeline(shaderView: MTKView, contentWidth: number): void {
  const device = MTLCreateSystemDefaultDevice();
  if (!device) {
    shaderView.addSubview(
      <UILabel
        frame={CGRectMake(20, 126, contentWidth - 40, 52)}
        text="Metal is unavailable on this device."
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(15)}
        textAlignment={1}
        numberOfLines={2}
      />,
    );
    return;
  }

  shaderView.device = device;
  shaderView.colorPixelFormat = MTLPixelFormatBGRA8Unorm_sRGB;
  shaderView.clearColor = MTLClearColorMake(0.02, 0.026, 0.045, 1);
  shaderView.preferredFramesPerSecond = 60;
  shaderView.enableSetNeedsDisplay = false;
  shaderView.paused = false;
  shaderView.clipsToBounds = true;

  const commandQueue = device.newCommandQueue();
  const library = device.newLibraryWithSourceOptionsError(shaderDemoSource, new MTLCompileOptions());
  if (!commandQueue || !library) return;

  const vertexFunction = library.newFunctionWithName("shader_demo_vertex_main");
  const fragmentFunction = library.newFunctionWithName("shader_demo_fragment_main");
  if (!vertexFunction || !fragmentFunction) return;

  const descriptor = new MTLRenderPipelineDescriptor();
  descriptor.vertexFunction = vertexFunction;
  descriptor.fragmentFunction = fragmentFunction;
  descriptor.colorAttachments.objectAtIndexedSubscript(0).pixelFormat = shaderView.colorPixelFormat;

  const pipelineState = device.newRenderPipelineStateWithDescriptorError(descriptor);
  if (!pipelineState) return;

  const drawInMTKView = (): void => {
    const pass = shaderView.currentRenderPassDescriptor;
    const drawable = shaderView.currentDrawable;
    if (!pass || !drawable) return;

    const commandBuffer = commandQueue.commandBuffer();
    if (!commandBuffer) return;

    const encoder = commandBuffer.renderCommandEncoderWithDescriptor(pass);
    if (!encoder) return;

    const uniforms = shaderDemoState.nextUniforms();
    encoder.setRenderPipelineState(pipelineState);
    encoder.setVertexBytesLengthAtIndex(uniforms, uniforms.length * 4, 0);
    encoder.drawPrimitivesVertexStartVertexCount(MTLPrimitiveTypeTriangle, 0, 3);
    encoder.endEncoding();
    commandBuffer.presentDrawable(drawable);
    commandBuffer.commit();
  };

  shaderView.delegate = MTKViewDelegate.create(drawInMTKView);
}

export function mountMetalShaderDemo(): void {
  const layout = metalShaderLayout();
  const width = layout.width;
  const height = layout.height;
  const inset = layout.inset;
  const contentWidth = layout.contentWidth;
  const titleTop = layout.titleTop;
  const subtitleTop = layout.subtitleTop;
  const shaderTop = layout.shaderTop;
  const shaderHeight = layout.shaderHeight;
  const panelTop = layout.panelTop;

  const shaderView = (
    <MTKView
      frame={CGRectMake(inset, shaderTop, contentWidth, shaderHeight)}
      layer={{
        cornerRadius: 30,
        shadowOpacity: 0.34,
        shadowRadius: 28,
        shadowOffset: CGSizeMake(0, 16),
      }}
    />
  ) as MTKView;

  installShaderPipeline(shaderView, contentWidth);

  const wavesButton = (
    <UIButton
      frame={CGRectMake(inset + 18, shaderTop + shaderHeight - 54, 92, 34)}
      title="Waves"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(0, 0, 0, 0.24)}
      layer={{ cornerRadius: 17 }}
    />
  ) as UIButton;
  const pulseButton = (
    <UIButton
      frame={CGRectMake(inset + 120, shaderTop + shaderHeight - 54, 88, 34)}
      title="Pulse"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(0, 0, 0, 0.24)}
      layer={{ cornerRadius: 17 }}
    />
  ) as UIButton;
  const glowButton = (
    <UIButton
      frame={CGRectMake(inset + 218, shaderTop + shaderHeight - 54, 92, 34)}
      title="Glow"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(0, 0, 0, 0.24)}
      layer={{ cornerRadius: 17 }}
    />
  ) as UIButton;

  addShaderAction(wavesButton, () => shaderDemoState.cycleMode());
  addShaderAction(pulseButton, () => shaderDemoState.pulse());
  addShaderAction(glowButton, () => shaderDemoState.cycleHue());

  const root = (
    <UIView
      frame={CGRectMake(0, 0, width, height)}
      backgroundColor={UIColor.blackColor()}
      tintColor={UIColor.systemPurpleColor()}
    >
      <UILabel
        frame={CGRectMake(inset, titleTop, contentWidth, 34)}
        text="Metal Shader Lab"
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(30)}
      />
      <UILabel
        frame={CGRectMake(inset, subtitleTop, contentWidth, 36)}
        text="Buttons modulate a live procedural fragment shader."
        textColor={UIColor.colorWithRed(1, 1, 1, 0.72)}
        font={UIFont.systemFontOfSize(14)}
        numberOfLines={2}
      />
      {shaderView}
      <UILabel
        frame={CGRectMake(inset + 18, shaderTop + 18, contentWidth - 36, 26)}
        text="Fragment field"
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(21)}
      />
      <UILabel
        frame={CGRectMake(inset + 18, shaderTop + 48, contentWidth - 36, 38)}
        text="The app compiles Metal source through MTLDevice and draws through an MTKViewDelegate."
        textColor={UIColor.colorWithRed(1, 1, 1, 0.74)}
        font={UIFont.systemFontOfSize(13)}
        numberOfLines={2}
      />
      {wavesButton}
      {pulseButton}
      {glowButton}
      <UIView
        frame={CGRectMake(inset, panelTop, contentWidth, 126)}
        backgroundColor={UIColor.systemBackgroundColor()}
        layer={{
          cornerRadius: 24,
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: CGSizeMake(0, 10),
        }}
      >
        <UIView
          frame={CGRectMake(16, 20, 50, 50)}
          backgroundColor={UIColor.systemPurpleColor()}
          layer={{ cornerRadius: 16 }}
        >
          <UIImageView
            frame={CGRectMake(13, 13, 24, 24)}
            image={UIImage.systemImageNamed("sparkles")}
            tintColor={UIColor.whiteColor()}
          />
        </UIView>
        <UILabel
          frame={CGRectMake(82, 18, contentWidth - 112, 24)}
          text="Procedural color"
          textColor={UIColor.labelColor()}
          font={UIFont.boldSystemFontOfSize(18)}
        />
        <UILabel
          frame={CGRectMake(82, 44, contentWidth - 112, 38)}
          text="No texture assets. The image is all math in the fragment function."
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(13)}
          numberOfLines={2}
        />
        <UIProgressView
          frame={CGRectMake(82, 94, contentWidth - 116, 8)}
          progress={0.74}
          progressTintColor={UIColor.systemPurpleColor()}
          trackTintColor={UIColor.systemGray5Color()}
        />
      </UIView>
    </UIView>
  ) as UIView;

  installRootView(root);
}
