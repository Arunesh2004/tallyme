const fs = require('fs');

const xml = fs.readFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\2c91d3b5-aba8-4de8-9ed8-d8a42e25c220\\scratch\\tally_vouchers.xml', 'utf16le');

const matches = xml.match(/<VOUCHERNUMBER>(.*?)<\/VOUCHERNUMBER>/g);
console.log("Vouchers:", matches);

const match2 = xml.match(/<PARTYLEDGERNAME>(.*?)<\/PARTYLEDGERNAME>/g);
console.log("Parties:", match2);

const match3 = xml.match(/<VOUCHER VCHTYPE="(.*?)"/g);
console.log("Voucher types:", match3);
