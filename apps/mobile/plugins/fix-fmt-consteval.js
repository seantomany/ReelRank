const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the generated Podfile to fix the fmt library's consteval
 * incompatibility with Xcode 26. After pod install, the fmt/base.h
 * header is modified to replace `consteval` with an empty expansion.
 */
module.exports = function fixFmtConsteval(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patchSnippet = `
    # [fix-fmt-consteval] Patch fmt for Xcode 26 consteval compatibility
    fmt_base_h = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      text = File.read(fmt_base_h)
      patched = text.gsub('#  define FMT_CONSTEVAL consteval', '#  define FMT_CONSTEVAL')
      if patched != text
        File.write(fmt_base_h, patched)
        Pod::UI.puts "[fix-fmt-consteval] Patched fmt/base.h to disable consteval"
      end
    end`;

      if (!podfile.includes('[fix-fmt-consteval]')) {
        const marker = 'post_install do |installer|';
        const idx = podfile.indexOf(marker);
        if (idx !== -1) {
          const insertAt = idx + marker.length;
          podfile =
            podfile.slice(0, insertAt) + '\n' + patchSnippet + podfile.slice(insertAt);
          fs.writeFileSync(podfilePath, podfile, 'utf8');
        }
      }

      return config;
    },
  ]);
};
