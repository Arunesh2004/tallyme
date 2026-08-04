const fs = require('fs');
const logContent = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/3c6acac6-401c-44c8-8ff4-a37ea1c39409/.system_generated/tasks/task-157.log', 'utf8');

const lines = logContent.split('\n');
const invoices = [];
let currentInvoice = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Processing Image')) {
        const match = line.match(/Processing Image (\d+)\/\d+: (.*)/);
        if (match) {
            currentInvoice = {
                imageIndex: match[1],
                filename: match[2],
                logs: []
            };
            invoices.push(currentInvoice);
        }
    }
    
    if (currentInvoice) {
        if (line.includes('VendorSlipWorker') || line.includes('GeminiVisionOCRProvider') || line.includes('VoucherCandidate') || line.includes('VendorMatchingEngine') || line.includes('InvoiceCandidate created:')) {
            currentInvoice.logs.push(line);
        }
    }
}

fs.writeFileSync('invoice_traces.json', JSON.stringify(invoices, null, 2));
console.log('Done writing invoice_traces.json');
