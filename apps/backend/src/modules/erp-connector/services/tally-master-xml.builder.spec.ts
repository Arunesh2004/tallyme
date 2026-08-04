import { Test, TestingModule } from '@nestjs/testing';
import { TallyMasterXmlBuilder } from './tally-master-xml.builder';
import { ConfigCompanyResolver } from './company-resolver.service';

describe('TallyMasterXmlBuilder', () => {
  let builder: TallyMasterXmlBuilder;
  let companyResolver: any;

  beforeEach(async () => {
    companyResolver = {
      resolveCompanyName: jest.fn().mockResolvedValue('Acme Corp & Co'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyMasterXmlBuilder,
        { provide: ConfigCompanyResolver, useValue: companyResolver },
      ],
    }).compile();

    builder = module.get<TallyMasterXmlBuilder>(TallyMasterXmlBuilder);
  });

  describe('escapeXml', () => {
    it('should escape special characters', async () => {
      // Testing indirectly via a build method
      const xml = await builder.buildCreateGroupXml('Tom & Jerry <Cats> "Friends" \'Yes\'');
      expect(xml).toContain('Tom &amp; Jerry &lt;Cats&gt; &quot;Friends&quot; &apos;Yes&apos;');
    });
  });

  describe('getStaticVariables', () => {
    it('should inject resolved company name', async () => {
      const xml = await builder.buildReadLedgersXml('comp-1');
      expect(xml).toContain('<SVCURRENTCOMPANY>Acme Corp &amp; Co</SVCURRENTCOMPANY>');
    });

    it('should handle unresolved company name', async () => {
      companyResolver.resolveCompanyName.mockResolvedValue(null);
      const xml = await builder.buildReadLedgersXml('comp-1');
      expect(xml).not.toContain('<SVCURRENTCOMPANY>');
    });
  });

  describe('buildCreateGroupXml', () => {
    it('should build valid Tally group creation XML', async () => {
      const xml = await builder.buildCreateGroupXml('New Group', 'Sundry Creditors');
      expect(xml).toContain('<GROUP NAME="New Group" ACTION="Create">');
      expect(xml).toContain('<PARENT>Sundry Creditors</PARENT>');
    });
  });

  describe('buildCreateLedgerXml', () => {
    it('should build valid Tally ledger creation XML', async () => {
      const xml = await builder.buildCreateLedgerXml('New Ledger', 'Cash in Hand');
      expect(xml).toContain('<LEDGER NAME="New Ledger" ACTION="Create">');
      expect(xml).toContain('<PARENT>Cash in Hand</PARENT>');
    });
  });

  describe('buildCreateCostCategoryXml', () => {
    it('should build valid Tally cost category XML', async () => {
      const xml = await builder.buildCreateCostCategoryXml('Projects');
      expect(xml).toContain('<COSTCATEGORY NAME="Projects" ACTION="Create">');
    });
  });

  describe('buildCreateCostCentreXml', () => {
    it('should build valid Tally cost centre XML without parent', async () => {
      const xml = await builder.buildCreateCostCentreXml('Project A', 'Projects');
      expect(xml).toContain('<COSTCENTRE NAME="Project A" ACTION="Create">');
      expect(xml).toContain('<CATEGORY>Projects</CATEGORY>');
      expect(xml).not.toContain('<PARENT>');
    });

    it('should build valid Tally cost centre XML with parent', async () => {
      const xml = await builder.buildCreateCostCentreXml('Phase 1', 'Projects', 'Project A');
      expect(xml).toContain('<PARENT>Project A</PARENT>');
    });
  });
});
