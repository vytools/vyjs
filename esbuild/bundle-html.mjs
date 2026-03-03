// bundle-html.js
import fs from 'fs/promises';
import path from 'path';
import esbuild from 'esbuild';

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

async function inlineLocalScript(html, baseDir) {
  const importMap = extractImportMap(html);

  const scriptRegex =
    /<script\b([^>]*?)type="module"([^>]*?)\ssrc="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/gi;

  return replaceAsync(html, scriptRegex, async (full, beforeType, between, src, after, inner) => {
    if (isRemote(src)) return full;

    const abs = path.resolve(baseDir, src);

    // Build esbuild plugins for importmap resolution
    const plugins = [];
    if (importMap) {
      plugins.push({
        name: 'importmap-resolver',
        setup(build) {
          build.onResolve({ filter: /.*/ }, args => {
            for (const key in importMap) {
              if (args.path === key || args.path.startsWith(key)) {
                const rel = args.path.replace(key, '');
                const resolvedPath = path.resolve(baseDir, importMap[key] + rel);
                return { path: resolvedPath };
              }
            }
            return null;
          });
        }
      });
    }
    plugins.push({
      name: "texture-loader",
      setup(build) {

        build.onResolve({ filter: /\.(png|jpg|jpeg)$/ }, args => {
          return {
            path: path.resolve(args.resolveDir, args.path),
            namespace: 'texture'
          };
        });

        build.onLoad({ filter: /\.(png|jpg|jpeg)$/i, namespace: 'texture' }, async args => {
          const bin = await fs.readFile(args.path);
          const ext = path.extname(args.path).slice(1);
          const base64 = bin.toString('base64');
          const dataURL = `data:image/${ext};base64,${base64}`;
          return {
            contents: `export default "${dataURL}";`,
            loader: 'js'
          };
        });

      }
    });

    const result = await esbuild.build({
      entryPoints: [abs],
      bundle: true,
      format: 'esm',
      minify: true,
      write: false,
      plugins,
    });

    const js = result.outputFiles[0].text;

    return `<script type="module">\n${js}\n</script>`;
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
    console.log('Usage: node bundle-html.js input.html/.js output.html');
    return;
  } else if (process.argv[2].endsWith('.html')) {
    html = await fs.readFile(process.argv[2], 'utf8');
    outHtml = process.argv[3];
    baseDir = path.dirname(process.argv[2]);
  } else {
    let HTML = await fs.readFile('vydisp.html', 'utf8');
    html = HTML.replace('__SCRIPT__','<script type="module" src="'+process.argv[2]+'"></script>')
    outHtml = process.argv[3];
  }

  if (outHtml != '') {
    let output = html;
    // 1) Inline local <script type="module" src="...">
    output = await inlineLocalScript(output, baseDir);
    // 2) Inline local <link rel="stylesheet" href="...">
    output = await inlineLocalCSS(output, baseDir);
    await fs.writeFile(outHtml, output, 'utf8');
    console.log(`Bundled → ${outHtml}`);
  } else {
    console.log(`No output specified`);
  }
}

build();
