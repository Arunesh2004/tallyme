const cp = require('child_process');
const p = cp.spawn(/^win/.test(process.platform) ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'dev', '--name', 'patch_duplicate_detection_schema'], {
  env: { ...process.env, CI: undefined },
  shell: true
});

p.stdout.on('data', d => {
  const str = d.toString();
  console.log(str);
  if (str.toLowerCase().includes('fail') || str.toLowerCase().includes('yes')) {
    p.stdin.write('y\n');
  }
});

p.stderr.on('data', d => {
  console.error(d.toString());
});

p.on('close', code => {
  process.exit(code);
});
