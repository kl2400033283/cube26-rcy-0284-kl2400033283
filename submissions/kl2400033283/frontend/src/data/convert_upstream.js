const fs = require('fs');
const path = require('path');

function parseLine(line) {
  const res = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === ',' && !inQ) {
      res.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim().replace(/^"|"$/g, ''));
  return res;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] !== undefined ? values[i] : '';
    });
    return row;
  });
}

const upstreamDir = 'c:/Users/Brahmani Mandru/OneDrive/Documents/OneDrive/Desktop/CUBE_HACKTHON/cube26-rcy-0284-kl2400033283/data/upstream';
const outDir = 'c:/Users/Brahmani Mandru/OneDrive/Documents/OneDrive/Desktop/CUBE_HACKTHON/cube26-rcy-0284-kl2400033283/submissions/kl2400033283/frontend/src/data';

const result = {
  receiving: parseCSV(fs.readFileSync(path.join(upstreamDir, 'receiving_sample.csv'), 'utf-8')),
  prep: parseCSV(fs.readFileSync(path.join(upstreamDir, 'prep_sample.csv'), 'utf-8')),
  pack: parseCSV(fs.readFileSync(path.join(upstreamDir, 'pack_sample.csv'), 'utf-8')),
  returns: parseCSV(fs.readFileSync(path.join(upstreamDir, 'returns_sample.csv'), 'utf-8'))
};

fs.writeFileSync(path.join(outDir, 'upstream_evidence.json'), JSON.stringify(result, null, 2), 'utf-8');
console.log('Successfully created upstream_evidence.json with:');
console.log('- Receiving records:', result.receiving.length);
console.log('- Prep records:', result.prep.length);
console.log('- Pack records:', result.pack.length);
console.log('- Returns records:', result.returns.length);
