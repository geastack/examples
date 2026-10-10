#!/usr/bin/env python3
"""Reproduce source inventory and descriptive size metrics without building either app."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent
ROOT = APP.parents[2]
FACTORY = ROOT / 'vendored-sources/M5StopWatch-UserDemo'
COMMIT = '6b4aa125288b6fe9dca661f10159f6e1e5ee785c'
BASE = f'https://github.com/m5stack/M5StopWatch-UserDemo/blob/{COMMIT}/'


def factory_bytes(path):
    # Diagnostic firmware patches can exist in the working tree. Evidence and
    # source-footprint comparisons always read the immutable reference commit.
    return subprocess.run(['git', '-C', str(FACTORY), 'show', f'{COMMIT}:{path}'], check=True, capture_output=True).stdout

TESTS = []
for path in sorted((APP / 'scripts').glob('*.test.mjs')):
    for match in re.finditer(r"test\('([^']+)'", path.read_text()):
        TESTS.append({'file': str(path.relative_to(APP)), 'title': match.group(1),
                      'line': path.read_text()[:match.start()].count('\n') + 1})


def evidence(path, needle):
    text = factory_bytes(path).decode('utf8')
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if needle in line:
            return {'path': path, 'line': index + 1, 'symbolOrNeedle': needle,
                    'url': BASE + path + f'#L{index + 1}',
                    'sha256': hashlib.sha256(text.encode()).hexdigest(),
                    'excerpt': '\n'.join(lines[max(0, index - 1):index + 7])}
    raise ValueError(f'Missing source evidence: {path}: {needle}')


def tests(*needles):
    return [test for test in TESTS if any(needle.lower() in test['title'].lower() for needle in needles)]


def screen(id, route, component, source, needle, states, behaviors, test_needles=(), assessment='implemented_source_mapped'):
    return {'id': id, 'geaRoute': route, 'geaComponent': component,
            'factoryEvidence': evidence(source, needle), 'states': states,
            'behaviors': behaviors, 'relatedPortableTests': tests(*test_needles),
            'assessment': assessment, 'pairedScreenshotValidation': 'pending_report_capture',
            'deviceInteractionValidation': 'requires_human_or_recorded_device_evidence'}


screens = [
    screen('startup.boot', 'boot', 'common/loading_page/boot_logo.tsx', 'main/hal/hal.h', 'class BootLogo',
           ['Starting up ...', 'V0.5'], ['Original StopWatch/Starting up .../V0.5 overlay is presented for one actual TS app frame. Earlier native HAL-initialization phase occurs before TS entry and cannot be reproduced by this component.'], ('startup presents',), assessment='artwork_implemented_startup_phase_limit'),
    screen('startup.guide', 'guide', 'apps/app_launcher/view/guide_page.tsx', 'main/apps/app_launcher/app_launcher.cpp', 'void AppLauncher::show_guide_page',
           ['first through fifth boot', 'later boots skip'], ['Original Home-chord guide artwork; boot WAV; A+B held exits guide; counter persists.'], ('native home', 'factory AP')),
    screen('launcher', 'menu', 'apps/app_launcher/view/view.tsx', 'main/apps/app_launcher/view/view.cpp', 'void LauncherView::init',
           ['AlarmClock', 'WatchFace', 'Stopwatch', 'Badge', 'IMU', 'Audio.FFT', 'LuckyWheel', 'Settings', 'finger drag', 'momentum settle'],
           ['Eight tools in installed order; centered icon and adjacent icon taps; arrows and short A/B release; circular wrap; fixed dots; curved clock; SCROLL_ONE drag limits; 33ms samples, shared input history, integer throw prediction and 200–400ms snap; dynamic title alpha.'], ('launcher', 'scroll', 'capture')),
    screen('launcher.battery', 'menu + batteryVisible', 'common/status_bar/status_bar.tsx', 'main/apps/common/status_bar/status_bar.cpp', 'void show',
           ['first popup', 'later popup', 'charging', 'not charging', 'tap hide', 'spring hide'],
           ['First launcher popup after800ms for1800ms; later6000ms; battery percentage/charging icon; top pull-down and tap hide; charging transition sampled once per second.'], ('launcher battery',)),
    screen('watch.classic', 'watch; face=0', 'apps/app_watch_face/view/classic.tsx', 'main/apps/app_watch_face/view/classic.cpp', 'void WatchFaceClassic::apply_display_mode',
           ['mode0: information and ticks', 'mode1: ticks without information', 'mode2: hands only'],
           ['Tap cycles3 modes; image hands with factory pivots; fractional hour/minute/second angles; uppercase weekday, date and time zero-to-O formatting.'], ('classic', 'factory watch dates')),
    screen('watch.number_flow', 'watch; face=1', 'apps/app_watch_face/view/number_flow.tsx', 'main/apps/app_watch_face/view/number_flow.cpp', 'void WatchFaceNumberFlow::onCreate',
           ['theme0..9', 'initial fade', 'unchanged digit', '09→10', '59→00', 'clock midnight wrap'],
           ['Independent rolling digit springs, minimum two digits, retarget velocity and wrap direction; tap cycles10 themes; date text; defaults reset when recreated.'], ('NumberFlow', 'factory springs')),
    screen('watch.big_number', 'watch; face=2', 'apps/app_watch_face/view/big_number.tsx', 'main/apps/app_watch_face/view/big_number.cpp', 'void WatchFaceBigNumber::onCreate',
           ['palette0', 'palette1', 'palette2', 'palette3'], ['Original digit artwork; tap cycles4 palettes; live hour/minute values.'], ('native button events', 'factory watch dates')),
    screen('watch.simple', 'watch; face=3', 'apps/app_watch_face/view/simple.tsx', 'main/apps/app_watch_face/view/simple.cpp', 'void WatchFaceSimple::onCreate',
           ['theme0..9', 'dot on', 'dot off', 'three-second entry hint', 'stationary hold', 'hold canceled by scroll'],
           ['Tap cycles10 themes; hold toggles second dot without also clicking; shortest-angle spring; live time/date.'], ('Simple', 'factory springs', 'factory watch dates')),
    screen('stopwatch', 'stopwatch', 'apps/app_stopwatch/view/view.tsx', 'main/apps/app_stopwatch/view/view.cpp', 'void StopwatchView::init',
           ['stopped empty', 'running', 'running with laps', 'paused', 'resumed', 'long scrolling lap history', 'reset'],
           ['A/left physical press start/pause/resume; B/right physical press lap/reset by state; monotonic hundredths; paused interval excluded; unlimited cumulative laps newest first; spring press feedback; resets on exit.'], ('stopwatch', 'lap')),
    screen('alarms.list', 'alarms', 'apps/app_alarm_clock/view/alarm_list.tsx', 'main/apps/app_alarm_clock/view/alarm_list.cpp', 'void AlarmListView::init',
           ['empty', 'multiple', 'enabled', 'disabled', 'long scrolling list'], ['Persistent daily alarms; switches; Add action; stationary hold opens delete confirmation; scrolling cancels hold.'], ('daily alarms', 'stationary alarm', 'simultaneous')),
    screen('alarms.add', 'alarm-add', 'apps/app_alarm_clock/view/add_alarm.tsx', 'main/apps/app_alarm_clock/view/add_alarm.cpp', 'void AlarmAddView::init',
           ['default07:00', 'time pickers drag', 'picker fling', 'OK', 'Home cancel'], ['Two infinite hour/minute pickers; default07:00; confirm adds enabled alarm; Home cancels.'], ('picker', 'daily alarms')),
    screen('alarms.delete', 'dialog=delete over alarms', 'common/dialog/Dialog.tsx', 'main/apps/app_alarm_clock/view/alarm_list.cpp', 'Delete this alarm?',
           ['Delete', 'Cancel'], ['Blocking Delete/Cancel dialog; persisted deletion; underlying navigation cannot act.'], ('stationary alarm', 'native button events')),
    screen('alarms.trigger', 'ringing over any app', 'apps/app_alarm_clock/view/trigger_alarm.tsx', 'main/apps/app_alarm_clock/app_alarm_clock.cpp', 'onTriggered().connect',
           ['single alert', 'simultaneous queue', 'OK dismiss', 'muted speaker'], ['Scheduled even while another app runs; blocking overlay; original sound/vibration cadence; repeated same-day suppression; sequential simultaneous alerts.'], ('daily alarms', 'simultaneous factory', 'muted')),
    screen('badge.display', 'badge', 'apps/app_badge/view/badge.tsx', 'main/apps/app_badge/view/badge.cpp', 'void BadgeView::init',
           ['no image edit hint', 'occupied slot', 'A/B previous/next occupied slot', 'last slot wraps'], ['Six persistent JPEG slots; original empty-state hint; A/B cycles occupied slots; hold requests editor.'], ('badge server', 'startup and active deletion', 'native button events')),
    screen('badge.confirm', 'dialog=badge over badge', 'common/dialog/Dialog.tsx', 'main/apps/app_badge/view/badge.cpp', 'Enter badge edit?',
           ['Edit', 'Cancel'], ['Blocking edit confirmation before starting the AP.'], ('factory AP', 'native button events')),
    screen('badge.ap_instructions', 'badge-edit', 'apps/app_badge/view/badge_editor.tsx', 'main/hal/utils/config_ap/config_ap.cpp', 'Connect to Wi-Fi:',
           ['AP ready', 'Wi-Fi start failure', 'server start failure', 'Exit requested'], ['Open MAC-suffixed M5StopWatch AP; instructions for192.168.4.1; captive redirect; editing blocks physical/app navigation; Exit replies before teardown then reloads selected image.'], ('AP edit session', 'portal close', 'captive probes')),
    screen('badge.phone', 'HTTP /', 'assets/badge-config.html', 'main/hal/utils/config_ap/assets/badge_config_ap.html', '<!doctype html>',
           ['empty slots', 'occupied thumbnails', 'selected/active tile', 'image preview', 'drag crop', 'zoom', 'background color', 'upload busy/success/error', 'delete', 'activate', 'Exit', 'mobile layout', 'desktop layout'],
           ['Original HTML editor: six slots, JPEG file chooser (3MB source cap),466² crop canvas, zoom and pointer capture, background fill, resized JPEG upload, activation/delete, inline errors and disabled busy controls, responsive layout.'], ('phone page', 'real-sized JPEG', 'empty-slot', 'portal close')),
    screen('imu', 'imu', 'apps/app_imu/view/view.tsx', 'main/apps/app_imu/view/view.cpp', 'void ImuView::init',
           ['labels on', 'labels off', 'ball moved', 'gyro size', 'orbit visible', 'orbit hidden'], ['Physical acceleration axis mapping, dead zones and bound clamps; linear interpolation; gyro magnitude controls size; independent integrated yaw orbit; tap toggles labels; state reset on entry.'], ('IMU', 'orbit unwrap')),
    screen('fft', 'fft', 'apps/app_fft/view/view.tsx', 'main/apps/app_fft/view/view.cpp', 'void FftView::init',
           ['silence', 'active spectrum', 'peak labels shown', 'peak labels hidden', 'microphone failure'], ['44100Hz capture;512-point Hann FFT/hop256;20 logarithmic bands; DC removal, learned noise floor, normalization/AGC, attack/decay; weighted groups, geometric/color motion, label toggle; DSP state survives reopen; peak interpolation deliberately retains factory raw-neighbor/normalized-center units.'], ('FFT', 'microphone', 'spectrum', 'publication')),
    screen('wheel.selection', 'wheel; wheelReady=false', 'apps/app_lucky_wheel/view/selection.tsx', 'main/apps/app_lucky_wheel/view/selection.cpp', 'void SelectionView::init',
           ['2 options', '18 options', 'finite drag endpoints', 'fling', 'OK'], ['Finite2–18 normal roller, plain numeric labels, initial2; OK builds wheel.'], ('finite picker', 'finite roller', 'neighboring launcher')),
    screen('wheel.spin', 'wheel; wheelReady=true', 'apps/app_lucky_wheel/view/wheel.tsx', 'main/apps/app_lucky_wheel/view/wheel.cpp', 'void WheelView::init',
           ['ready', 'clockwise', 'counterclockwise', 'random tap direction', 'spinning ignores extra requests', 'settled outcome'], ['Factory sector colors/number placement; A/B spin directions; tap random direction; random duration/turns/outcome bounded away from sector boundaries; cubic easing and pointer timing; resets on entry.'], ('wheel', 'outcomes')),
    screen('settings.menu', 'settings', 'apps/app_setup/view/view.tsx', 'main/apps/app_setup/app_setup.cpp', '_menu_sections =',
           ['Device', 'Time & Date', 'Firmware'], ['Brightness, Volume, Button, Set Time, Set Date, V0.5; scrolling list; Home closes worker/settings; version ten-tap easter egg.'], ('factory settings', 'accepting one', 'About')),
    screen('settings.brightness', 'brightness', 'apps/app_setup/workers/brightness.tsx', 'main/apps/app_setup/workers/device.cpp', 'BrightnessWorker::BrightnessWorker',
           ['10%', '100%', 'live drag', 'OK persist', 'Home cancel persistence'], ['Slider10–100; live display change; explicit OK persistence; cancellation does not save other workers.'], ('settings clamp', 'accepting one')),
    screen('settings.volume', 'volume', 'apps/app_setup/workers/volume.tsx', 'main/apps/app_setup/workers/device.cpp', 'VolumeWorker::VolumeWorker',
           ['0 mute', '100%', '5% steps', 'live preview', 'OK persist'], ['Slider0–100 in5-point steps; live audio volume and factory preview cadence; save only active worker.'], ('settings clamp', 'accepting one', 'muted')),
    screen('settings.button', 'button', 'apps/app_setup/workers/button.tsx', 'main/apps/app_setup/workers/device.cpp', 'ButtonWorker::ButtonWorker',
           ['SFX on/off', 'vibration on/off', 'OK persist'], ['Independent sound/vibration switches; enabled default; per-press A/B pitches and20ms feedback; explicit persistence.'], ('settings', 'physical stopwatch')),
    screen('settings.time', 'set-time', 'apps/app_setup/workers/set_time.tsx', 'main/apps/app_setup/workers/datetime.cpp', 'class SetTimeWorker::TimeAdjustView',
           ['current RTC values', 'hour/minute/second drag and fling', 'wrap', 'summary', 'OK write RTC', 'Home cancel'], ['Three infinite selectors; live summary; source picker geometry,200ms snap and shared device momentum; RTC save on OK.'], ('picker', 'factory settings')),
    screen('settings.date_year_month', 'set-date; dateStage=0', 'apps/app_setup/workers/set_date.tsx', 'main/apps/app_setup/workers/datetime.cpp', 'class SetDateWorker::DateAdjustView',
           ['year2000..2099', 'month1..12', 'summary', 'Next'], ['First staged date screen; initial RTC values; Next changes to day stage; months allocate five infinite pages from pre-style font.'], ('date selectors', 'date clamping', 'infinite page')),
    screen('settings.date_day', 'set-date; dateStage=1', 'apps/app_setup/workers/set_date.tsx', 'main/apps/app_setup/workers/datetime.cpp', 'void syncDateValidity',
           ['28/29/30/31-day ranges', 'invalid prior day clamps', 'OK write RTC'], ['Day options recreated for selected month/year; leap years; live summary; save valid date only; day uses final font when allocating pages.'], ('date selectors', 'date clamping', 'reset changes')),
    screen('settings.about', 'about', 'apps/app_setup/workers/about.tsx', 'main/apps/app_setup/workers/about.cpp', 'void AboutWorker::update',
           ['0% Complete', 'burst progress', 'progress beyond100'], ['Ten version taps enter original blue-screen joke; random1–5 step bursts,1–8 progress increments and bounded delays; no actual reboot and no100% cap.'], ('About progresses',)),
    screen('error.overlay', 'error over current route', 'common/error/ErrorMessage.tsx', 'main/hal/utils/config_ap/config_ap.cpp', 'Wi-Fi initialization failed',
           ['microphone unavailable', 'badge AP/server startup failure', 'RTC write failure', 'tap clear'], ['Gea adds dismissible service-failure feedback; factory AP errors appear in its loading message/log callbacks. Failure UI and exact error wording are not assumed pixel-equivalent.'], ('empty-slot',), assessment='intentional_error_surface_difference'),
]

# Assertions turn renamed source symbols/routes into a visible inventory failure.
for item in screens:
    if item['geaComponent']:
        assert (APP / item['geaComponent']).is_file(), item['geaComponent']

features = [
    {'id': 'global.navigation', 'factoryEvidence': evidence('main/apps/common/key_manager/key_manager.cpp', 'const KeyEvent& KeyManager::update'),
     'behavior': 'A/B short release navigate; simultaneously held A+B emits one latched Home until both released; stopwatch consumes physical press actions; touch swipe threshold60px/last pressed point; modal/editor blocks underlying handlers.',
     'gea': ['stores/WatchStore.tsx:keyDown/keyUp/pointerDown/pointerMove/pointerUp'], 'tests': tests('native navigation', 'native home', 'last-pressed', 'modal', 'AP edit')},
    {'id': 'global.audio', 'factoryEvidence': evidence('main/apps/common/audio/audio.cpp', 'play_tone'),
     'behavior': 'Original boot WAV, quantized44.1kHz PCM tones, half gain,200-sample fade, replacement/mute; factory button notes and alarm cadence; microphone30dB codec gain.',
     'gea': ['lib/audio.ts', 'worklets/spectrum.ts', 'package.json:defines'], 'tests': tests('factory tone', 'muted', 'FFT capture')},
    {'id': 'global.persistence', 'factoryEvidence': evidence('main/hal/utils/settings/settings.h', 'class Settings'),
     'behavior': 'Boot guide count, selected badge slot/images, alarms, brightness/volume and button settings persist; watch face/wheel/stopwatch presentation resets on app recreation.',
     'gea': ['lib/settings.ts', 'lib/badge.ts', 'stores/WatchStore.tsx'], 'tests': tests('persist', 'defaults', 'resumes')},
    {'id': 'badge.http_contract', 'factoryEvidence': evidence('main/hal/utils/config_ap/config_ap.cpp', 'bool start_web_server'),
     'behavior': 'GET /; GET /badge/state; GET /badge/image?slot=n; POST /badge/active?slot=n; DELETE /badge/image?slot=n; POST /upload?slot=n; POST /close; six slots; request body1..2MiB; JPEG-only upload; factory case-insensitive slot/strtoul prefixes and buffer bounds; invalid/missing slot, empty data, absent image, persistence failure; captive302 withLocation/no-cache/Connection headers.',
     'gea': ['lib/badge.ts', 'assets/badge-config.html'], 'tests': tests('badge', 'phone page', 'portal', 'captive')},
    {'id': 'renderer.output', 'factoryEvidence': evidence('main/hal/hal_display.cpp', 'lv_display_set_buffers'),
     'behavior': 'Both run466×466 logical pixels. LVGL partial-render buffer versus Gea retained native renderer; typography/AA/rounded edges/FFT raster can differ.60Hz requested rate is not a measured universal60FPS guarantee.',
     'gea': ['index.tsx', 'package.json:gea.targets.esp32'], 'tests': []},
]

inventory = {
    'schemaVersion': 1, 'referenceCommit': COMMIT, 'referenceSourceRoot': str(FACTORY.relative_to(ROOT)),
    'inventoryDefinition': 'All installed factory tool screens, common overlays, staged workers, portal controls and finite behavioral state classes. Numeric/time/sensor states are infinite: listed boundary cases are representative test classes, not an exhaustive enumeration of pixels.',
    'verificationPolicy': 'Source-mapped means code exists and source evidence was read. Related portable tests are evidence of their explicit assertions only. Paired screenshot/device validation remains separate; absence of a paired capture is never treated as visual parity.',
    'screens': screens, 'crossCuttingFeatures': features, 'testCatalog': TESTS,
    'factoryProductionInputs': [{'path': name, 'sha256': hashlib.sha256(factory_bytes(name)).hexdigest()} for name in ('sdkconfig.defaults', 'dependencies.lock', 'repos.json')],
    'dependencyPins': json.loads(factory_bytes('repos.json')),
    'phoneEditorByteIdentity': (APP / 'assets/badge-config.html').read_bytes() == factory_bytes('main/hal/utils/config_ap/assets/badge_config_ap.html'),
    'confirmedDifferences': [
        {'id': 'boot_logo_phase', 'status': 'earlier_native_phase_not_reproduced', 'screens': ['startup.boot'], 'detail': 'Original startup artwork now has a TS route and actual app frame, but factory shows it during native HAL initialization. Gea TS executes only after target/runtime initialization, so the earlier phase/timing remains distinct.'},
        
        {'id': 'raster_pixels', 'status': 'renderer_difference', 'detail': 'Different renderer/AA can change edge/text pixels even with equivalent layout/artwork and behavior.'},
        {'id': 'http_error_mime', 'status': 'backend_formatting_difference', 'detail': 'Pinned ESP-IDF 5.5.4 httpd_resp_send_err sends the custom plain message directly with text/html MIME; Gea replies preserve status/message bodies with text/plain MIME. Invalid JPG-labeled bytes are intentionally accepted, matching the factory rather than adding decoder validation.'},
        {'id': 'service_errors', 'status': 'error_surface_difference', 'screens': ['error.overlay'], 'detail': 'Gea provides dismissible service errors; original AP shows callback status messages and some HAL failures only log.'},
    ],
    'validationLimits': ['Physical button chord, audible speaker output, tactile vibration and phone captive-login experience require recorded hardware/human checks; portable mocks do not establish them.', 'No locked60FPS or paired factory-vs-Gea speed advantage is implied by source/portable tests.', 'FFT peak interpolation now retains the factory mixed units exactly; off-bin frequency labels are knowingly less accurate than the earlier corrected Gea implementation.', 'Intermittent NumberFlow static-digit omission was investigated; portable regression passes. Require final device sequence evidence before claiming resolved visual reliability.', 'Factory tracks sdkconfig.defaults and dependencies.lock; report those exact production settings and dependency pins. Do not substitute SDK defaults or a simulator configuration for device firmware.'],
    'notInstalledOrNotAFactoryScreen': [
        {'id': 'template', 'evidence': evidence('main/main.cpp', '// GetMooncake().installApp(std::make_unique<AppTemplate>());'), 'detail': 'Template QUIT demo is commented out and is not an installed factory tool.'},
        {'id': 'power_off', 'evidence': evidence('main/hal/hal_button.cpp', '// btnPwr.setRawState'), 'detail': 'No dedicated Off/shutdown UI screen or power-button polling is installed by this application. PMIC power retention/charging is hardware behavior; capture powered-off panel separately if the report covers board hardware.'},
        {'id': 'factory_reset', 'evidence': evidence('main/hal/hal.cpp', 'void Hal::factoryReset'), 'detail': 'HAL API exists but no Settings menu action invokes it; do not invent a missing factory reset screen.'},
        {'id': 'about_reboot', 'evidence': evidence('main/apps/app_setup/workers/about.cpp', 'void AboutWorker::update'), 'detail': 'Blue-screen text promises a restart, but worker never performs one.'},
    ],
}
(HERE / 'screen-test-manifest.json').write_text(json.dumps(inventory, indent=2) + '\n')
(HERE / 'source-evidence.json').write_text(json.dumps({'referenceCommit': COMMIT, 'sources': [item['factoryEvidence'] for item in screens] + [item['factoryEvidence'] for item in features]}, indent=2) + '\n')


def metric(paths, base):
    files = []
    for path in sorted(paths):
        data = factory_bytes(str(path.relative_to(FACTORY))) if base == FACTORY else path.read_bytes()
        lines = data.decode('utf8').splitlines()
        files.append({'path': str(path.relative_to(base)), 'bytes': len(data), 'physicalLines': len(lines),
                      'nonblankLines': sum(bool(line.strip()) for line in lines), 'sha256': hashlib.sha256(data).hexdigest()})
    return {'fileCount': len(files), 'bytes': sum(f['bytes'] for f in files),
            'physicalLines': sum(f['physicalLines'] for f in files), 'nonblankLines': sum(f['nonblankLines'] for f in files), 'largestFiles': sorted(files, key=lambda file: file['nonblankLines'], reverse=True)[:5], 'files': files}

factory_tracked = subprocess.run(['git', '-C', str(FACTORY), 'ls-tree', '-r', '--name-only', COMMIT, '--', 'main'], check=True, capture_output=True, text=True).stdout.splitlines()
factory_cpp = [FACTORY / name for name in factory_tracked if Path(name).suffix in ('.cpp', '.h')]
factory_app = [p for p in factory_cpp if '/main/apps/' in str(p) and 'app_template' not in p.parts] + [FACTORY / 'main/main.cpp']
factory_hal = [p for p in factory_cpp if '/main/hal/' in str(p) and 'drivers' not in p.parts and 'utils' not in p.parts]
factory_support = [p for p in factory_cpp if '/main/hal/' in str(p) and ('drivers' in p.parts or 'utils' in p.parts)]

gea_code = [p for p in APP.rglob('*') if p.suffix in ('.ts', '.tsx') and not any(part in ('node_modules', 'comparison', 'scripts', 'assets') for part in p.relative_to(APP).parts) and p.name != 'vite.config.ts']
gea_css = [p for p in APP.rglob('*.css') if not any(part in ('node_modules', 'comparison', 'assets') for part in p.relative_to(APP).parts)]
metrics = {
    'schemaVersion': 1, 'referenceCommit': COMMIT, 'factoryReadPolicy': 'Immutable git blobs at referenceCommit, excluding working-tree diagnostics/mute/capture patches.',
    'definitions': {'physicalLines': 'UTF8 splitlines count; blank/comment/string/data lines included.', 'nonblankLines': 'Physical lines containing any non-whitespace character, including comments and embedded strings. This is a source-size measure, not executable SLOC or cyclomatic complexity.', 'bytes': 'Raw UTF8 source file bytes.', 'fileCount': 'Number of source files selected by the explicitly documented scopes; hashes allow exact reproduction.'},
    'scopes': {'factoryAppCpp': metric(factory_app, FACTORY), 'factoryHalCpp': metric(factory_hal, FACTORY), 'factorySupportCpp': metric(factory_support, FACTORY), 'geaAppTsJsx': metric(gea_code, APP), 'geaAppCss': metric(gea_css, APP)},
    'scopeRules': {'factoryAppCpp': 'main/apps/**/*.{cpp,h}, excluding uninstalled app_template, plus main/main.cpp. Inline styling is included.', 'factoryHalCpp': 'main/hal direct application/board HAL .cpp/.h files; driver and utils implementation excluded here and reported separately.', 'factorySupportCpp': 'main/hal/drivers and main/hal/utils .cpp/.h; includes button, RTC, AP/HTTP and settings wrappers.', 'geaAppTsJsx': 'Application .ts/.tsx excluding scripts, comparison, node_modules, assets directory and vite.config.ts; includes stores, common, lib and worklet.', 'geaAppCss': 'Application .css excluding assets, node_modules and comparison.'},
    'interpretation': ['Compare factory application C++ against Gea TS/JSX PLUS CSS for application source footprint; C++ styling is inline while Gea styling is external.', 'HAL/support layers are reported separately rather than quietly added to one side.', 'Both depend on substantial shared frameworks/drivers. Gea native/compiler/target changes made during this port are excluded from application-file counts and must be disclosed as shared engineering work, not zero-cost savings.', 'Assets, tests, generated native code, package/build configuration and dependency code are excluded from these source-size totals.', 'Do not convert line/file counts into developer-time, maintainability, safety, cyclomatic complexity or performance claims; those require separate measurements.', 'Structure comparison: factory app/view/model/HAL ownership versus Gea component/CSS/Store/lib/worklet/shared-host ownership. Equivalent feature coverage is established by the manifest, not shorter source alone.'],
}
(HERE / 'source-metrics.json').write_text(json.dumps(metrics, indent=2) + '\n')
print(json.dumps({'screens': len(screens), 'finiteStateClasses': sum(len(s['states']) for s in screens), 'portableTests': len(TESTS), 'metrics': {key: {k: value[k] for k in ('fileCount', 'bytes', 'physicalLines', 'nonblankLines')} for key, value in metrics['scopes'].items()}}, indent=2))
