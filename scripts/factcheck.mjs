#!/usr/bin/env node
// ============================================================================
// QFC26 · scripts/factcheck.mjs
// ----------------------------------------------------------------------------
// Prepara il materiale per la verifica visiva delle quote di ogni sollevatore.
// Per ogni codice (o uno specifico) estrae le pagine di catalogo mappate in
// PDF_SCHEDE e produce, in factcheck/<codice>/:
//   - page-N.png   (immagine ad alta risoluzione da ISPEZIONARE visivamente)
//   - text.txt     (layer testo grezzo, utile per i valori "facili")
//
// Richiede poppler (pdftoppm, pdftotext):
//   macOS:  brew install poppler
//   Linux:  apt-get install poppler-utils
//
// Uso:
//   node scripts/factcheck.mjs            # tutti i modelli
//   node scripts/factcheck.mjs 13169      # solo un codice
// ============================================================================
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDFDIR = path.join(ROOT, 'public');
const OUTDIR = path.join(ROOT, 'factcheck');
const DPI = 150;

// Legge la mappa PDF_SCHEDE direttamente da src/App.jsx (fonte unica).
function readSchede() {
  const app = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  const block = app.slice(app.indexOf('const PDF_SCHEDE'), app.indexOf('};', app.indexOf('const PDF_SCHEDE')));
  const schede = {};
  for (const m of block.matchAll(/'([^']+)':\s*\{\s*file:\s*'([^']+)',\s*pages:\s*\[(\d+),\s*(\d+)\]/g)) {
    schede[m[1]] = { file: m[2], pages: [parseInt(m[3]), parseInt(m[4])] };
  }
  return schede;
}

function have(bin) {
  try { execFileSync('which', [bin]); return true; } catch { return false; }
}

function main() {
  const only = process.argv[2] || null;
  if (!have('pdftoppm') || !have('pdftotext')) {
    console.error('Mancano pdftoppm/pdftotext. Installa poppler:  brew install poppler  (macOS)  /  apt-get install poppler-utils (Linux)');
    process.exit(1);
  }
  const schede = readSchede();
  const codes = only ? [only] : Object.keys(schede);
  for (const cod of codes) {
    const sc = schede[cod];
    if (!sc) { console.error(`Codice ${cod} non in PDF_SCHEDE`); continue; }
    const src = path.join(PDFDIR, sc.file);
    if (!fs.existsSync(src)) { console.error(`PDF mancante in public/: ${sc.file}`); continue; }
    const dir = path.join(OUTDIR, cod);
    fs.mkdirSync(dir, { recursive: true });
    for (const pg of sc.pages) {
      execFileSync('pdftoppm', ['-png', '-r', String(DPI), '-f', String(pg), '-l', String(pg), src, path.join(dir, `page-${pg}`)]);
    }
    const txt = execFileSync('pdftotext', ['-f', String(sc.pages[0]), '-l', String(sc.pages[1]), src, '-'], { encoding: 'utf8' });
    fs.writeFileSync(path.join(dir, 'text.txt'), txt);
    console.log(`✓ ${cod} → factcheck/${cod}/ (pagine ${sc.pages.join(',')})`);
  }
  console.log('\nFatto. Apri i PNG in factcheck/<codice>/ e leggi le quote reali,');
  console.log('poi aggiorna src/data/factcheck.json e gli override in src/data/geometry.js.');
}
main();
