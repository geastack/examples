// App-local nativeSources currently cannot point at package files. Keep this
// wrapper thin; the ANGLE/WebGL implementation lives in the shared package.
#include "../../../node_modules/@geastack/native-webgl-angle/native/angle_webgl_host.mm"
