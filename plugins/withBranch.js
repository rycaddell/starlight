const { withDangerousMod, withAppDelegate } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Branch.io config plugin for Expo SDK 54 / RN 0.81.
 *
 * Replaces @config-plugins/react-native-branch, which inserts RCTBridge references
 * incompatible with Expo SDK 54 / RN 0.81.
 *
 * A) Adds `#import "RNBranch.h"` to the iOS bridging header
 * B) Adds `RNBranch.initSession(...)` in AppDelegate.didFinishLaunchingWithOptions
 * C) Adds Branch calls to the existing open-url and continue-userActivity handlers in AppDelegate
 */

// ─── A) Bridging Header ────────────────────────────────────────────────────────

function withBranchBridgingHeader(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const projectName = cfg.modRequest.projectName;
      const projectDir = path.join(platformProjectRoot, projectName);

      let headerPath = null;
      try {
        const files = fs.readdirSync(projectDir);
        const header = files.find((f) => f.endsWith('-Bridging-Header.h'));
        if (header) headerPath = path.join(projectDir, header);
      } catch (e) {
        // projectDir may not exist in CI — skip gracefully
      }

      if (!headerPath || !fs.existsSync(headerPath)) {
        console.warn('[withBranch] Bridging header not found — skipping import injection.');
        return cfg;
      }

      let contents = fs.readFileSync(headerPath, 'utf8');
      const importLine = '#import "RNBranch.h"';
      if (!contents.includes(importLine)) {
        contents = contents.trimEnd() + '\n' + importLine + '\n';
        fs.writeFileSync(headerPath, contents);
        console.log('[withBranch] Added RNBranch.h import to bridging header.');
      }

      return cfg;
    },
  ]);
}

// ─── B) AppDelegate: initSession ──────────────────────────────────────────────

const INIT_SESSION_CALL =
  '    RNBranch.initSession(launchOptions: launchOptions, isReferrable: true)';

function withBranchInitSession(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes('RNBranch.initSession')) {
      return cfg; // idempotent
    }

    const returnLine =
      'return super.application(application, didFinishLaunchingWithOptions: launchOptions)';

    if (contents.includes(returnLine)) {
      // Strategy 1: existing override has the return line — insert before it
      contents = contents.replace(
        returnLine,
        `${INIT_SESSION_CALL}\n    ${returnLine}`
      );
    } else {
      // Strategy 2: no override exists — add the entire method after the AppDelegate opening brace
      const classOpenMatch = contents.match(/^(public\s+)?class AppDelegate[^\n]*\{[ \t]*\n/m);
      if (!classOpenMatch) {
        console.warn('[withBranch] Cannot find AppDelegate class declaration. Skipping initSession injection.');
        return cfg;
      }
      const insertAt = classOpenMatch.index + classOpenMatch[0].length;
      const method = [
        '  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {',
        INIT_SESSION_CALL,
        '    return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        '  }\n',
      ].join('\n');
      contents = contents.slice(0, insertAt) + method + contents.slice(insertAt);
    }

    cfg.modResults.contents = contents;
    console.log('[withBranch] Injected RNBranch.initSession into AppDelegate.');
    return cfg;
  });
}

// ─── C) AppDelegate: patch existing open-url and continue-userActivity handlers ──

function withBranchLinkHandlers(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Patch the existing open url handler in AppDelegate to also call Branch.
    // The generated AppDelegate already has RCTLinkingManager in this method.
    const openUrlRCT =
      'return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)';
    if (!contents.includes('RNBranch.application(app, open:') && contents.includes(openUrlRCT)) {
      contents = contents.replace(
        openUrlRCT,
        `RNBranch.application(app, open: url, options: options)\n    ${openUrlRCT}`
      );
      console.log('[withBranch] Injected RNBranch open URL call into AppDelegate.');
    }

    // Patch the existing continue userActivity handler to also call Branch.
    const continueRCT =
      'let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)';
    if (!contents.includes('RNBranch.continue(userActivity)') && contents.includes(continueRCT)) {
      contents = contents.replace(
        continueRCT,
        `RNBranch.continue(userActivity)\n    ${continueRCT}`
      );
      console.log('[withBranch] Injected RNBranch continue userActivity call into AppDelegate.');
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── Compose ──────────────────────────────────────────────────────────────────

function withBranch(config) {
  config = withBranchBridgingHeader(config);
  config = withBranchInitSession(config);
  config = withBranchLinkHandlers(config);
  return config;
}

module.exports = withBranch;
