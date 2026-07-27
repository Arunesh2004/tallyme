const fs = require('fs');

const schemaPath = 'c:/Users/Administrator/.gemini/antigravity_old/scratch_old/tallyme/apps/backend/prisma/schema.prisma';

let content = fs.readFileSync(schemaPath, 'utf8');

const newModels = `
// ==========================================
// PHASE 25 ENTERPRISE SAAS
// ==========================================

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companies Company[]
  users     User[]
}

model CompanyMembership {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  role      String   @default("VIEW_ONLY")
  createdAt DateTime @default(now())

  @@unique([userId, companyId])
}

model Invite {
  id             String   @id @default(uuid())
  email          String
  organizationId String
  companyId      String?
  role           String   @default("VIEW_ONLY")
  token          String   @unique
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}

model RoleAssignment {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String
  role           String   @default("VIEW_ONLY") // ACCOUNTING_ADMIN, APPROVER, AUDITOR, VIEW_ONLY
  createdAt      DateTime @default(now())

  @@unique([userId, organizationId])
}

model AuditLog {
  id             String   @id @default(uuid())
  userId         String?
  organizationId String?
  companyId      String?
  action         String
  entity         String?
  entityId       String?
  oldValue       Json?
  newValue       Json?
  reason         String?
  ipAddress      String?
  userAgent      String?
  correlationId  String?
  timestamp      DateTime @default(now())
}
`;

content += newModels;

// Also replace Company model to include relation to Organization
content = content.replace(
`model Company {
  id       String             @id @default(uuid())
  name     String
  vouchers VoucherCandidate[]
  users    User[]
}`,
`model Company {
  id             String             @id @default(uuid())
  name           String
  organizationId String?
  organization   Organization?      @relation(fields: [organizationId], references: [id])
  vouchers       VoucherCandidate[]
  users          User[]
  memberships    CompanyMembership[]
}`
);

// Add organizationId to User
content = content.replace(
`  roleId       String
  role         Role      @relation(fields: [roleId], references: [id])
  companyId    String?
  company      Company?  @relation(fields: [companyId], references: [id])
  sessions     Session[]`,
`  roleId       String
  role         Role      @relation(fields: [roleId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  companyId    String?
  company      Company?  @relation(fields: [companyId], references: [id])
  sessions     Session[]
  memberships  CompanyMembership[]
  roleAssignments RoleAssignment[]`
);

// Add organizationId and companyId to Vendor
content = content.replace(
`  vendorCode String?   @unique
  name       String?`,
`  organizationId String?
  companyId      String?
  vendorCode String?   @unique
  name       String?`
);

// Add organizationId and companyId to Student
content = content.replace(
`  enrollmentNo    String    @unique
  admissionNumber String?   @unique`,
`  organizationId String?
  companyId      String?
  enrollmentNo    String    @unique
  admissionNumber String?   @unique`
);

// Add organizationId and companyId to Document
content = content.replace(
`  fileUrl         String
  checksum        String`,
`  organizationId String?
  companyId      String?
  fileUrl         String
  checksum        String`
);

// Add organizationId and companyId to ApprovalBatch
content = content.replace(
`  batchId       String    @unique
  createdBy     String?`,
`  organizationId String?
  companyId      String?
  batchId       String    @unique
  createdBy     String?`
);


fs.writeFileSync(schemaPath, content);
