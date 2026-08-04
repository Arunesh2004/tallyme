const fs = require('fs');
const data = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
const lines = Object.entries(data)
  .map(([file, cov]) => ({file, pct: cov.statements.pct}))
  .filter(x => x.pct < 80)
  .sort((a,b) => a.pct - b.pct)
  .slice(0, 30);
console.table(lines);
