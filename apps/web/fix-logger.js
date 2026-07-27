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
  let modified = false;
  
  // Replace logger.error('msg', { error }) with logger.error({ error }, 'msg')
  const regexError = /logger\.error\(\s*(['"`].*?['"`])\s*,\s*(\{.*?\})\s*\)/g;
  if (regexError.test(content)) {
    content = content.replace(regexError, "logger.error($2, $1)");
    modified = true;
  }
  
  // Replace logger.info('msg', { obj }) with logger.info({ obj }, 'msg')
  const regexInfo = /logger\.info\(\s*(['"`].*?['"`])\s*,\s*(\{.*?\})\s*\)/g;
  if (regexInfo.test(content)) {
    content = content.replace(regexInfo, "logger.info($2, $1)");
    modified = true;
  }

  // Replace logger.warn('msg', { obj }) with logger.warn({ obj }, 'msg')
  const regexWarn = /logger\.warn\(\s*(['"`].*?['"`])\s*,\s*(\{.*?\})\s*\)/g;
  if (regexWarn.test(content)) {
    content = content.replace(regexWarn, "logger.warn($2, $1)");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(f, content);
    console.log('Fixed logger in ' + f);
  }
});
