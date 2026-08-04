const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function getFailedXML() {
    const log = await prisma.integrationLog.findFirst({
        where: {
            operation: 'SYNC_VOUCHER',
            status: 'ERROR'
        },
        orderBy: { createdAt: 'desc' }
    });

    if (log && log.requestPayload) {
        console.log("Found failed XML from IntegrationLog:");
        console.log("Error:", log.responsePayload);
        console.log("=== RAW XML ===");
        console.log(log.requestPayload);
        fs.writeFileSync('failed_voucher.xml', log.requestPayload);
    } else {
        console.log("No failed integration logs found with payload.");
    }
}
getFailedXML().catch(console.error).finally(() => prisma.$disconnect());
