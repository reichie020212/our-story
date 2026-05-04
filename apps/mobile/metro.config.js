// Metro config for the OurStory mobile app inside a pnpm workspaces
// monorepo. Standard Expo monorepo recipe per
// https://docs.expo.dev/guides/monorepos/, plus an explicit
// nodeModulesPaths so Metro can resolve workspace packages
// (@our-story/api-types, etc.) from the hoisted root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Append the workspace root to whatever defaults Expo already set up
// (rather than replacing them) so Metro keeps watching all the paths
// it needs PLUS our shared packages/.
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
