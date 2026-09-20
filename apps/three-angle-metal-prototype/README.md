# Three ANGLE Metal Prototype

This folder is archived prototype work.

It contains the earlier reconstructed-renderer path: generated scene data,
custom Three-like shims, native glTF upload experiments, PMREM experiments, and
ANGLE/Metal host code that tried to reproduce selected Three.js behavior.

It is not the canonical path for Three.js parity.

## Do Not Use For New Parity Work

New work should happen in `examples/apps/three-angle-metal`, where upstream
Three.js owns renderer behavior and Gea supplies only the typed native
WebGL/ANGLE/Metal host surface.

This prototype is kept because it still contains useful reference material:

- ANGLE/Metal host setup experiments.
- glTF and Draco decoding experiments.
- Generated Littlest Tokyo reference data.
- Prior PMREM and texture handling investigations.

But code here should not be copied back into the canonical app unless it is
being deliberately extracted as native host infrastructure, not as reconstructed
Three.js renderer behavior.
