const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to resolve via the "require" condition in package.json `exports`
// maps so we pick CommonJS builds. Needed because @supabase/supabase-js ships
// a dynamic `import()` of @opentelemetry/api in its .mjs build that Hermes
// can't parse at bundle time (release builds fail with "Invalid expression").
// The .cjs build of supabase-js uses a Hermes-safe Promise+require instead.
config.resolver.unstable_conditionNames = ['require', 'react-native'];

module.exports = config;
