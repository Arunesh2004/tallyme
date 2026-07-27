const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('apps/backend/src', (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix syntax errors introduced
  content = content.replace(/inputContext: \(/g, "inputContext: ");
  content = content.replace(/decision: \(/g, "decision: ");
  content = content.replace(/decision: \(\{/g, "decision: {"); // In case it replaced `decision: {` -> `decision: ({`
  
  // Actually, wait, it replaced all `decision:` with `decision: (`
  // Let's just fix it by replacing `decision: \(` with `decision: ` globally unless followed by a closing paren.
  content = content.replace(/inputContext: \(/g, "inputContext: ");
  content = content.replace(/decision: \(/g, "decision: ");

  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }
});
