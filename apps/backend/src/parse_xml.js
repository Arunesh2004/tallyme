const fs = require('fs');

const xml = fs.readFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\2c91d3b5-aba8-4de8-9ed8-d8a42e25c220\\scratch\\tally_vouchers.xml', 'utf16le');

const purchaseRegex = /<VOUCHER VCHTYPE="Purchase".*?<\/VOUCHER>/gs;
let match;
while ((match = purchaseRegex.exec(xml)) !== null) {
  const vch = match[0];
  console.log("=== VOUCHER ===");
  console.log(vch.match(/<DATE>.*?<\/DATE>/)?.[0]);
  console.log(vch.match(/<VOUCHERNUMBER>.*?<\/VOUCHERNUMBER>/)?.[0]);
  console.log(vch.match(/<PARTYLEDGERNAME>.*?<\/PARTYLEDGERNAME>/)?.[0]);
  const ledgers = [...vch.matchAll(/<ALLLEDGERENTRIES\.LIST>.*?<\/ALLLEDGERENTRIES\.LIST>/gs)].map(m => {
    return {
      name: m[0].match(/<LEDGERNAME>(.*?)<\/LEDGERNAME>/)?.[1],
      amount: m[0].match(/<AMOUNT>(.*?)<\/AMOUNT>/)?.[1]
    }
  });
  console.log("=== LEDGERS ===");
  console.log(JSON.stringify(ledgers, null, 2));
}

