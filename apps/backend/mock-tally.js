const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  let bodyChunks = [];
  req.on('data', chunk => {
    bodyChunks.push(chunk);
  });
  req.on('end', () => {
    const bodyBuf = Buffer.concat(bodyChunks);
    const bodyStr = bodyBuf.toString('utf8');

    // ── COMPLETE RAW REQUEST DUMP ───────────────────────────────────────────
    console.log('');
    console.log('=== INCOMING HTTP REQUEST ===');
    console.log(`${req.method} ${req.url} HTTP/1.1`);
    Object.entries(req.headers).forEach(([k, v]) => console.log(`${k}: ${v}`));
    console.log('');
    console.log('--- REQUEST BODY ---');
    console.log(bodyStr);
    console.log('--- END BODY ---');
    console.log('Buffer length  :', bodyBuf.length);
    console.log('String length  :', bodyStr.length);
    console.log('Hex (0-200b)   :', bodyBuf.subarray(0, 200).toString('hex'));

    if (bodyStr.includes('<TALLYREQUEST>Export Data</TALLYREQUEST>')) {
      // Discovery request
      const responseXml = `<ENVELOPE><SVCURRENTCOMPANY>Mock Company</SVCURRENTCOMPANY></ENVELOPE>`;
      res.writeHead(200, {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(responseXml),
      });
      res.end(responseXml);
      console.log('=== RESPONSE: 200 (Discovery) ===');
      console.log(responseXml);
    } else {
      // Voucher import request
      fs.writeFileSync('transport-final.xml', bodyBuf);
      console.log('Saved body to transport-final.xml');
      const responseXml = `<ENVELOPE><CREATED>1</CREATED></ENVELOPE>`;
      res.writeHead(200, {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(responseXml),
      });
      res.end(responseXml);
      console.log('=== RESPONSE: 200 (Voucher accepted) ===');
      console.log(responseXml);
    }
  });
});

server.listen(9000, () => {
  console.log('Mock Tally server listening on port 9000');
});
