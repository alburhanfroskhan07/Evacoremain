import { pathToFileURL, fileURLToPath } from "node:url";
import { join, resolve as pathResolve, dirname } from "node:path";
import { existsSync } from "node:fs";

const ROOT = process.cwd();

function resolvePath(p) {
  const candidates = [p, `${p}.js`, join(p, "index.js")];
  return candidates.find((c) => existsSync(c)) || p;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export default {};",
      shortCircuit: true,
    };
  }
  if (specifier === "next/server") {
    return { url: pathToFileURL(join(ROOT, "node_modules/next/server.js")).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return { url: pathToFileURL(resolvePath(join(ROOT, specifier.slice(2)))).href, shortCircuit: true };
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    return { url: pathToFileURL(resolvePath(pathResolve(parentDir, specifier))).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}