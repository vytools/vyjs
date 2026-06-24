// bundle-html.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

// vyjs root is always the parent of this script's esbuild/ directory
const VYJS_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Treat http/https as remote (don’t inline)
function isRemote(src) {
  return /^https?:\/\//.test(src);
}

// Async-aware replace (since String.replace can’t await)
async function replaceAsync(str, regex, asyncFn) {
  const matches = [...str.matchAll(regex)];
  if (matches.length === 0) return str;

  let result = '';
  let lastIndex = 0;

  for (const match of matches) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Add text before this match
    result += str.slice(lastIndex, matchStart);

    // Compute replacement
    const replacement = await asyncFn(...match);
    result += replacement;

    lastIndex = matchEnd;
  }

  // Add the rest of the string
  result += str.slice(lastIndex);
  return result;
}

function extractImportMap(html) {
  const regex = /<script\s+type="importmap">\s*([\s\S]*?)\s*<\/script>/i;
  const match = html.match(regex);
  if (!match) return null;

  try {
    const json = JSON.parse(match[1]);
    return json.imports || null;
  } catch (e) {
    console.error("Failed to parse importmap JSON:", e);
    return null;
  }
}

// Resolves "@vyjs/<path>" imports straight to the vyjs library root.
// e.g. @vyjs/esbuild/vydisp.js → <vyjsRoot>/esbuild/vydisp.js
//      @vyjs/js/arcs.js        → <vyjsRoot>/js/arcs.js
function buildVyjsPlugin(vyjsRoot) {
  return {
    name: 'vyjs-resolver',
    setup(build) {
      build.onResolve({ filter: /^@vyjs\// }, args => ({
        path: path.join(vyjsRoot, args.path.slice('@vyjs/'.length))
      }));
    }
  };
}

function buildPlugins(importMap, baseDir, bundleCdn, vyjsRoot) {
  const plugins = [];
  if (vyjsRoot) plugins.push(buildVyjsPlugin(vyjsRoot));
  if (importMap) {
    plugins.push({
      name: 'importmap-resolver',
      setup(build) {
        build.onResolve({ filter: /.*/ }, args => {
          for (const key in importMap) {
            const isPrefix = key.endsWith('/');
            const matches = isPrefix ? args.path.startsWith(key) : args.path === key;
            if (!matches) continue;
            const mapped = importMap[key];
            const rel = isPrefix ? args.path.slice(key.length) : '';
            if (/^https?:\/\//.test(mapped)) {
              if (bundleCdn) return { path: mapped + rel, namespace: 'http-url' };
              return { path: args.path, external: true };
            }
            return { path: path.resolve(baseDir, mapped + rel) };
          }
          return null;
        });
      }
    });
  }
  if (bundleCdn) {
    plugins.push({
      name: 'http-import',
      setup(build) {
        build.onResolve({ filter: /.*/, namespace: 'http-url' }, args => ({
          path: new URL(args.path, args.importer).toString(),
          namespace: 'http-url',
        }));
        build.onLoad({ filter: /.*/, namespace: 'http-url' }, async args => {
          const res = await fetch(args.path);
          if (!res.ok) throw new Error(`Failed to fetch ${args.path}: ${res.status}`);
          const contents = await res.text();
          return { contents, loader: 'js' };
        });
      }
    });
  }
  plugins.push({
    name: 'texture-loader',
    setup(build) {
      build.onResolve({ filter: /\.(png|jpg|jpeg)$/ }, args => ({
        path: path.resolve(args.resolveDir, args.path),
        namespace: 'texture'
      }));
      build.onLoad({ filter: /\.(png|jpg|jpeg)$/i, namespace: 'texture' }, async args => {
        const bin = await fs.readFile(args.path);
        const ext = path.extname(args.path).slice(1);
        const base64 = bin.toString('base64');
        return { contents: `export default "data:image/${ext};base64,${base64}";`, loader: 'js' };
      });
    }
  });
  return plugins;
}

async function inlineLocalScript(html, baseDir, minify, bundleCdn, vyjsRoot) {
  const importMap = extractImportMap(html);
  const plugins = buildPlugins(importMap, baseDir, bundleCdn, vyjsRoot);

  // Match any <script type="module"> block — with or without src=
  const scriptRegex = /<script\b([^>]*)type="module"([^>]*)>([\s\S]*?)<\/script>/gi;

  return replaceAsync(html, scriptRegex, async (full, before, after, content) => {
    const attrs = before + after;
    const srcMatch = attrs.match(/\bsrc="([^"]+)"/);

    if (srcMatch) {
      // External src= script
      const src = srcMatch[1];
      if (isRemote(src)) return full;
      const abs = path.resolve(baseDir, src);
      const result = await esbuild.build({
        entryPoints: [abs],
        bundle: true, format: 'esm', minify, write: false, plugins,
      });
      return `<script type="module">\n${result.outputFiles[0].text}\n</script>`;
    } else {
      // Inline script — bundle via stdin with resolveDir for relative imports
      const trimmed = content.trim();
      if (!trimmed) return full;
      const result = await esbuild.build({
        stdin: { contents: trimmed, resolveDir: baseDir, loader: 'js' },
        bundle: true, format: 'esm', minify, write: false, plugins,
      });
      return `<script type="module">\n${result.outputFiles[0].text}\n</script>`;
    }
  });
}

async function inlineLocalCSS(html, baseDir) {
  // Match: <link rel="stylesheet" ... href="...">
  // (attributes may be in any order, extra stuff allowed)
  const cssRegex =
    /<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)href=["']([^"']+)["']([^>]*)\/?>/gi;

  return replaceAsync(html, cssRegex, async (full, beforeRel, between, href, after) => {
    if (isRemote(href)) {
      // Leave remote CSS (like Bootstrap CDN) alone
      return full;
    }

    const abs = path.resolve(baseDir, href);
    const css = await fs.readFile(abs, 'utf8');

    return `<style>\n${css}\n</style>`;
  });
}

async function build() {
  let html = '';
  let outHtml = '';
  let baseDir = '';
  if (process.argv.length < 4) {
    console.log('Usage: node bundle-html.mjs input.html output.html [--no-minify] [--bundle-cdn]');
    return;
  } else {
    html = await fs.readFile(process.argv[2], 'utf8');
    outHtml = process.argv[3];
    baseDir = path.dirname(path.resolve(process.argv[2]));
  }
  const flags = process.argv.slice(4);
  const minify = !flags.includes('--no-minify');
  const bundleCdn = flags.includes('--bundle-cdn');

  if (outHtml != '') {
    let output = html;
    // 1) Inline local <script type="module" src="..."> and inline scripts
    output = await inlineLocalScript(output, baseDir, minify, bundleCdn, VYJS_ROOT);
    // 2) Inline local <link rel="stylesheet" href="...">
    output = await inlineLocalCSS(output, baseDir);
    // 3) Strip import map when CDN deps are bundled inline
    if (bundleCdn) {
      output = output.replace(/<script\s+type="importmap">[\s\S]*?<\/script>\s*/i, '');
    }
    await fs.writeFile(outHtml, output, 'utf8');
    console.log(`Bundled → ${outHtml}`);
  } else {
    console.log(`No output specified`);
  }
}

build();
