// scripts/package-php.mjs — Zero-Node Static + PHP Packaging for cPanel
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-php');

console.log('🚀 Packaging Guardian Wallet Zero-Node Stack for cPanel (LiteSpeed + PHP)...');
console.log('Subdomain: guardianwallet.devcenterpoint.com');

// 1. Clean output
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

// 2. Build Static Frontend
console.log('🔨 Building Static Next.js frontend (output: export)...');
execSync('npm --prefix web run build', { cwd: rootDir, stdio: 'inherit' });

// 3. Copy Static Frontend into root of dist-php
console.log('📦 Copying static web export into bundle root...');
const webOut = path.join(rootDir, 'web', 'out');
cpSync(webOut, outDir, { recursive: true });

// 3b. Duplicate _next as assets/ and rewrite references to bypass LiteSpeed _next blocking
console.log('🛡️  Creating assets/ mirror to prevent LiteSpeed hidden-folder block...');
const nextDir = path.join(outDir, '_next');
const assetsDir = path.join(outDir, 'assets');
if (existsSync(nextDir)) {
  cpSync(nextDir, assetsDir, { recursive: true });
}

// Replace /_next/ with /assets/ across exported HTML/JS/CSS files
function replaceNextInDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceNextInDir(full);
    } else if (/\.(html|js|txt|css|webmanifest)$/i.test(entry.name)) {
      let content = readFileSync(full, 'utf8');
      if (content.includes('/_next/')) {
        content = content.replaceAll('/_next/', '/assets/');
        writeFileSync(full, content, 'utf8');
      }
    }
  }
}
replaceNextInDir(outDir);

// 4. Copy PHP Backend into api/
console.log('📦 Copying PHP backend into api/...');
const apiDest = path.join(outDir, 'api');
mkdirSync(apiDest, { recursive: true });
cpSync(path.join(rootDir, 'api'), apiDest, { recursive: true });

// 5. Generate LiteSpeed / Apache .htaccess
console.log('📝 Generating high-performance LiteSpeed .htaccess...');
const htaccess = `# LiteSpeed & Apache Directives for Guardian Wallet
# Zero Node.js processes, 0% idle CPU, instant static asset delivery

Options -Indexes
RewriteEngine On

# Ensure proper MIME types for CSS, JS, fonts, icons, manifest
AddType text/css .css
AddType application/javascript .js
AddType application/manifest+json .webmanifest
AddType image/svg+xml .svg
AddType font/woff2 .woff2
AddType font/woff .woff

# 1. Route /api requests to PHP micro-router
RewriteRule ^api/(.*)$ api/index.php [QSA,L]
RewriteRule ^api$ api/index.php [QSA,L]

# 2. LiteSpeed hidden folder bypass: transparently route /_next to /assets
RewriteRule ^_next/(.*)$ assets/$1 [QSA,L]

# 3. Serve existing files directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 4. Client-side route fallback to index.html (ONLY for HTML page navigation, NEVER for missing static assets!)
RewriteCond %{REQUEST_URI} !\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|gif|ico|webmanifest|json|php)$ [NC]
RewriteRule ^ index.html [L]
`;
writeFileSync(path.join(outDir, '.htaccess'), htaccess, 'utf8');

// 6. Generate .env template
console.log('📝 Generating .env config with Gemini API key...');
const envContent = `# Guardian Wallet Configuration
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite

# Blockchain (Base Sepolia)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
EXPLORER=https://sepolia.basescan.org

# Set VAULT_ADDRESS to run live, or leave blank to run simulated mode
VAULT_ADDRESS=
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
OWNER_ADDRESS=0x0000000000000000000000000000000000000001
AGENT_PK=

# Caps (6 decimals: 50 USDC single, 150 USDC daily)
PER_TX_CAP=50000000
DAILY_CAP=150000000
`;
writeFileSync(path.join(outDir, '.env'), envContent, 'utf8');

// 7. Compress into guardianwallet-php.zip using Python POSIX zip packager
console.log('🗜️  Compressing into guardianwallet-php.zip with POSIX forward slashes...');
const zipScript = path.join(rootDir, 'scripts', 'zip-dist.py');
execSync(`python "${zipScript}" "${outDir}" "${path.join(rootDir, 'guardianwallet-php.zip')}"`, { cwd: rootDir, stdio: 'inherit' });

console.log('✅ Zero-Node deployment package created at guardianwallet-php.zip!');
