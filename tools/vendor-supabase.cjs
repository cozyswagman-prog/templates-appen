// Reproducible local browser SDK, pinned by package-lock.json. No CDN runtime dependency.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = path.join(root, 'node_modules/@supabase/supabase-js');
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(pkg, 'dist/umd/supabase.js'), path.join(root, 'vendor/supabase.js'));
fs.copyFileSync(path.join(pkg, 'LICENSE'), path.join(root, 'vendor/SUPABASE-LICENSE'));
