const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('.');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('accounting/shared/events/DomainEvent')) {
    content = content.replace(/['"].*?accounting[/\\]shared[/\\]events[/\\]DomainEvent['"]/g, "'@/modules/accounting/shared/events/AccountingEvents'");
    fs.writeFileSync(f, content);
    console.log('Fixed ' + f);
  }
});
