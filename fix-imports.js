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

  // Fix PrismaService imports
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\/prisma\/prisma\.service'/g, "from '../../../infrastructure/prisma/prisma.service'");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/infrastructure\/prisma\/prisma\.module'/g, "from '../../infrastructure/prisma/prisma.module'");
  
  // Fix AuditModule imports
  content = content.replace(/from '\.\.\/audit\/audit\.module'/g, "from '../../audit/audit.module'");
  content = content.replace(/from '\.\.\/tally-connector\/tally-connector\.module'/g, "from '../../tally-connector/tally-connector.module'");

  // Fix client usage
  content = content.replace(/this\.prisma\.client/g, "this.prisma");
  content = content.replace(/const client = this\.prisma\.client;/g, "const client = this.prisma;");
  content = content.replace(/this\.prisma\.client\./g, "this.prisma.");

  // Fix unknown error
  content = content.replace(/error\.message/g, "(error as any).message");

  // Fix logAction
  content = content.replace(/logAction\(/g, "log(");

  // Fix some parameter types
  content = content.replace(/catch \(error\)/g, "catch (error: any)");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }
});
