const fs = require('fs'); 
const files = fs.readdirSync('src').filter(f => f.startsWith('e2e-') && f.endsWith('.ts') && !f.endsWith('.spec.ts')); 
files.forEach(f => { 
  let c = fs.readFileSync('src/'+f, 'utf8'); 
  c = c.replace(/^(runE2E|bootstrap|main|runOperationsRuntime)\(\)(?:\.catch\(.*?\))?;?/gm, ''); 
  let wrapper = `
describe('${f}', () => { 
  jest.setTimeout(300000); 
  it('should execute successfully', async () => { 
    if (typeof runE2E === 'function') await runE2E(); 
    else if (typeof bootstrap === 'function') await bootstrap(); 
    else if (typeof main === 'function') await main(); 
    else if (typeof runOperationsRuntime === 'function') await runOperationsRuntime(); 
  }); 
});
`; 
  fs.writeFileSync('src/'+f.replace('.ts', '.spec.ts'), c + wrapper); 
  fs.unlinkSync('src/'+f); 
  console.log('Converted ' + f); 
});
