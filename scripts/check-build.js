const fs = require('fs');
const path = require('path');

const siteDir = path.join(__dirname, '../_site');

const SUSPICIOUS = [/\{\{.*?\}\}/, /\[object Object\]/];
const TAG_RE = [
  /<title[^>]*>(.*?)<\/title>/gi,
  /<meta[^>]*name="description"[^>]*content="([^"]*)"/gi,
  /<meta[^>]*content="([^"]*)"[^>]*name="description"/gi,
  /<meta[^>]*property="og:[^"]*"[^>]*content="([^"]*)"/gi,
  /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/gi,
];

function walkDir(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walkDir(path.join(dir, e.name)) :
    e.name.endsWith('.html') ? [path.join(dir, e.name)] : []
  );
}

if (!fs.existsSync(siteDir)) {
  console.error('_site/ not found — run bun run build first');
  process.exit(1);
}

const files = walkDir(siteDir);
const errors = [];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf-8');
  for (const re of TAG_RE) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null) {
      for (const p of SUSPICIOUS) {
        if (p.test(m[1])) {
          errors.push(`${path.relative(siteDir, file)}: "${m[1]}"`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error('Build check FAILED — unresolved templates found:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
}

console.log(`Build check passed (${files.length} HTML files checked)`);
