import { installRootView } from "@geastack/apple/UIKit";
import { createNativeShowcaseRoot } from "./scene";

export function mountNativeShowcase(): void {
  installRootView(createNativeShowcaseRoot());
}
