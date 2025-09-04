/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import singleComponents from '../singleComponents.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const TAILWIND_INPUT = path.join(ROOT, 'src/styles/tailwind.css');
const ROUTE_CONFIG = path.join(ROOT, 'src/router/routeConfig.json');

function sh(cmd) {
  try { return execSync(cmd, { stdio: 'inherit' }); }
  catch (err) { process.exitCode = err.status || 1; throw err; }
}

function ensureFile(p) {
  if (!existsSync(p)) {
    console.error(`[build-css] Missing file: ${p}`);
    process.exit(1);
  }
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function resolveComponentPath(componentPath) {
  // Convert @/ alias to src/
  if (componentPath.startsWith('@/')) {
    return componentPath.replace('@/', 'src/');
  }
  return componentPath;
}

function createTempConfig(files, name) {
  const contentArray = Array.isArray(files) ? files : [files];
  // Normalize paths for cross-platform compatibility
  const normalizedPaths = contentArray.map(f => f.replace(/\\/g, '/'));
  return `
const plugin = require('tailwindcss/plugin');

const pxScale = (vals) =>
  Object.fromEntries(vals.map((v) => [String(v), \`\${v}px\`]));

module.exports = {
  darkMode: 'class',
  content: [${normalizedPaths.map(f => `"${f}"`).join(', ')}],
  theme: {
    extend: {
      screens: { sm: '480px', md: '768px', lg: '1010px', xl: '1365px' },
      colors: {
        primary: { DEFAULT: '#FB5BA2', dark: '#C30676' },
        accent:  { DEFAULT: '#F40793', dark: '#C30676' }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'Montserrat', 'Open Sans', 'arial', 'sans-serif']
      },
      boxShadow: {
        sidebar: '0 0 8px 0 rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: [
    plugin(function({ matchUtilities }) {
      const PB = pxScale([8, 12, 16, 22, 44, 66, 88, 120]);
      const MT = pxScale([8, 16, 24, 32, 48, 64, 120]);
      const FZ = pxScale([10, 12, 14, 16, 18, 20, 22, 24, 32]);
      const LH = pxScale([16, 20, 24, 28, 32, 40]);
      const W  = pxScale([50, 100, 150, 200, 300]);
      const H  = pxScale([50, 100, 150, 200, 300]);

      matchUtilities({
        'fs-pb': (v) => ({ paddingBottom: v }),
        'fs-mt': (v) => ({ marginTop: v }),
        'fs-fz': (v) => ({ fontSize: v }),
        'fs-lh': (v) => ({ lineHeight: v }),
        'fs-w':  (v) => ({ width: v }),
        'fs-h':  (v) => ({ height: v })
      }, { values: { ...PB, ...MT, ...FZ, ...LH, ...W, ...H } });

      matchUtilities({
        pb: (v) => ({ paddingBottom: v }),
        mt: (v) => ({ marginTop: v }),
        fz: (v) => ({ fontSize: v }),
        lh: (v) => ({ lineHeight: v }),
        w:  (v) => ({ width: v }),
        h:  (v) => ({ height: v })
      }, { values: { ...PB, ...MT, ...FZ, ...LH, ...W, ...H } });
    })
  ]
};`;
}

function buildSectionCss() {
  const routes = JSON.parse(readFileSync(ROUTE_CONFIG, 'utf8'));
  const bySection = new Map();

  for (const route of routes) {
    const section = route.section || 'misc';
    
    // Handle regular componentPath
    if (route.componentPath) {
      const comp = resolveComponentPath(route.componentPath);
      const abs = path.join(ROOT, comp);
      if (existsSync(abs)) {
        if (!bySection.has(section)) bySection.set(section, []);
        bySection.get(section).push(abs);
      } else {
        console.warn(`[build-css] WARN: missing component path for route "${route.slug}": ${abs}`);
      }
    }

    // Handle customComponentPath (role-based components)
    if (route.customComponentPath) {
      Object.values(route.customComponentPath).forEach(roleConfig => {
        if (roleConfig.componentPath) {
          const comp = resolveComponentPath(roleConfig.componentPath);
          const abs = path.join(ROOT, comp);
          if (existsSync(abs)) {
            if (!bySection.has(section)) bySection.set(section, []);
            bySection.get(section).push(abs);
          } else {
            console.warn(`[build-css] WARN: missing custom component path for route "${route.slug}": ${abs}`);
          }
        }
      });
    }
  }

  for (const [section, files] of bySection) {
    const out = path.join(BUILD_DIR, `${section}.min.css`);
    console.log(`[build-css] Building section "${section}" → ${out}`);
    
    // Create a temporary config file for this section
    const tempConfigPath = path.join(BUILD_DIR, `tailwind.${section}.config.js`);
    const tempConfig = createTempConfig(uniq(files), section);
    
    // Write temp config
    writeFileSync(tempConfigPath, tempConfig);
    
    const cmd = [
      'npx tailwindcss',
      `-i "${TAILWIND_INPUT}"`,
      `-o "${out}"`,
      `-c "${tempConfigPath}"`,
      '--minify'
    ].join(' ');
    sh(cmd);
  }
}

function buildSingleComponentCss() {
  for (const entry of singleComponents) {
    const name = entry.name || path.parse(entry.path).name;
    const compAbs = path.join(ROOT, entry.path);
    if (!existsSync(compAbs)) {
      console.warn(`[build-css] WARN: missing single component "${name}": ${compAbs}`);
      continue;
    }
    const out = path.join(BUILD_DIR, `${name}.min.css`);
    console.log(`[build-css] Building single component "${name}" → ${out}`);
    
    // Create a temporary config file for this component
    const tempConfigPath = path.join(BUILD_DIR, `tailwind.${name}.config.js`);
    const tempConfig = createTempConfig([compAbs], name);
    
    // Write temp config
    writeFileSync(tempConfigPath, tempConfig);
    
    const cmd = [
      'npx tailwindcss',
      `-i "${TAILWIND_INPUT}"`,
      `-o "${out}"`,
      `-c "${tempConfigPath}"`,
      '--minify'
    ].join(' ');
    sh(cmd);
  }
}

function main() {
  ensureFile(TAILWIND_INPUT);
  ensureFile(ROUTE_CONFIG);
  ensureDir(BUILD_DIR);

  buildSectionCss();
  buildSingleComponentCss();

  console.log('[build-css] Done.');
}

main();