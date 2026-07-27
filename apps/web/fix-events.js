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
let uuidImport = "import { v4 as uuidv4 } from 'uuid';\n";
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('implements DomainEvent')) {
    let modified = false;
    
    // Check if it's already importing uuid
    if (!content.includes('import { v4 as uuidv4 }')) {
      content = uuidImport + content;
      modified = true;
    }

    // Add properties to classes implementing DomainEvent
    const classRegex = /(export class \w+\s*implements DomainEvent\s*\{)/g;
    content = content.replace(classRegex, (match) => {
      modified = true;
      return match + "\n  public eventId: string = uuidv4();\n  public timestamp: Date = new Date();\n";
    });

    if (modified) {
      fs.writeFileSync(f, content);
      console.log('Added missing props to ' + f);
    }
  }
});
