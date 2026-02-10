import { constants as fsConstants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const extensions = [".ts", ".tsx", ".mts", ".cts"];

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  inlineSourceMap: true
};

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveWithCandidates(basePath) {
  const candidates = [
    basePath,
    ...extensions.map((ext) => `${basePath}${ext}`),
    ...extensions.map((ext) => path.join(basePath, `index${ext}`))
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const aliasedPath = await resolveWithCandidates(path.join(srcRoot, specifier.slice(2)));
    if (!aliasedPath) {
      throw new Error(`No se pudo resolver el alias ${specifier}`);
    }
    return {
      shortCircuit: true,
      url: pathToFileURL(aliasedPath).href
    };
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (!context.parentURL || !specifier.startsWith(".")) {
      throw error;
    }

    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolvedPath = await resolveWithCandidates(path.resolve(parentDir, specifier));
    if (!resolvedPath) {
      throw error;
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href
    };
  }
}

export async function load(url, context, defaultLoad) {
  if (!url.startsWith("file://") || !/\.(ts|tsx|mts|cts)$/.test(url)) {
    return defaultLoad(url, context, defaultLoad);
  }

  const filePath = fileURLToPath(url);
  const source = await readFile(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions,
    fileName: filePath
  });

  return {
    format: "module",
    shortCircuit: true,
    source: output.outputText
  };
}
