# Phase 133 Student Master Setup

## 1. Database Inspection Summary
The `Student` schema requires `firstName`, `lastName`, and `admissionNumber`. For the UAT dry run to successfully bypass manual review, the extracted name from the email must exist in the database.

## 2. UAT Student Preparation Script
This script safely injects a single marked UAT student and the necessary Ledger Mapping Configuration into the database without modifying core logic.

**File:** `seed-uat-student.ts`
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding UAT Student Data...');
  
  // Create UAT Student
  const student = await prisma.student.upsert({
    where: { enrollmentNo: 'UAT-ENR-001' },
    update: {},
    create: {
      enrollmentNo: 'UAT-ENR-001',
      admissionNumber: 'ADM-UAT-1001',
      firstName: 'Arunesh',
      lastName: 'UAT Student',
      status: 'ACTIVE'
    }
  });
  console.log(`Student created: ${student.firstName} ${student.lastName} (${student.admissionNumber})`);

  // Create Ledger Mapping Configuration
  const mapping = await prisma.ledgerMappingConfiguration.create({
    data: {
      bankLedger: 'HDFC Bank UAT',
      feeCategories: {
        "RAZORPAY": "Razorpay Clearing A/c",
        "PAYU": "PayU Clearing A/c",
        "NEFT": "HDFC Bank UAT"
      }
    }
  });
  console.log('Ledger Mapping Configuration created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```
**Command:** `npx ts-node seed-uat-student.ts`
