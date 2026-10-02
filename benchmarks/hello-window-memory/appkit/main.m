// Floor: the cheapest possible Cocoa window with one label, no framework.
#import <Cocoa/Cocoa.h>

int main(void) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        NSWindow *window = [[NSWindow alloc]
            initWithContentRect:NSMakeRect(0, 0, 400, 300)
                      styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable
                        backing:NSBackingStoreBuffered
                          defer:NO];
        window.title = @"Hello AppKit";
        NSTextField *label = [NSTextField labelWithString:@"Hello, world!"];
        label.frame = NSMakeRect(150, 140, 100, 20);
        [window.contentView addSubview:label];
        [window center];
        [window makeKeyAndOrderFront:nil];
        [app activateIgnoringOtherApps:YES];
        [app run];
    }
    return 0;
}
