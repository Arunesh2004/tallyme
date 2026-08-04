import { GSTINNormalizer } from '../../domain/services/gstin-normalizer.service';

describe('GSTINNormalizer', () => {
  let normalizer: GSTINNormalizer;

  beforeEach(() => {
    normalizer = new GSTINNormalizer();
  });

  describe('normalize', () => {
    it('should return null for empty, null, undefined', () => {
      expect(normalizer.normalize(null)).toBeNull();
      expect(normalizer.normalize(undefined)).toBeNull();
      expect(normalizer.normalize('')).toBeNull();
      expect(normalizer.normalize('   ')).toBeNull();
    });

    it('should uppercase and remove spaces/hyphens', () => {
      expect(normalizer.normalize('27abcde1234f1z5')).toBe('27ABCDE1234F1Z5');
      expect(normalizer.normalize('27 ABCDE-1234 F1-Z5')).toBe(
        '27ABCDE1234F1Z5',
      );
    });

    it('should apply deterministic OCR substitutions on numeric positions only (O->0, I->1, S->5, Z->2)', () => {
      // 0,1 and 7,8,9,10 are numeric
      // 2,3,4,5,6,11,12,13,14 are left alone for this one-way substitution
      const corrupted = 'O7ABCDEI2S4F1Z5'; // O(0) 7 A B C D E I(1) 2 S(5) 4 F 1 Z 5
      expect(normalizer.normalize(corrupted)).toBe('07ABCDE1254F1Z5');
    });

    it('should not corrupt valid Zs or letters in PAN (position-aware safety)', () => {
      const validGstinWithZAndO = '27OISZO1234F1Z5';
      // Indices:
      // 0:2, 1:7
      // 2:O, 3:I, 4:S, 5:Z, 6:O (PAN letters, must remain untouched)
      // 7:1, 8:2, 9:3, 10:4 (PAN digits)
      // 11:F, 12:1, 13:Z, 14:5 (Must remain untouched)
      expect(normalizer.normalize(validGstinWithZAndO)).toBe('27OISZO1234F1Z5');
    });

    it('should return already normalized string untouched', () => {
      expect(normalizer.normalize('27ABCDE1234F1Z5')).toBe('27ABCDE1234F1Z5');
    });
  });
});
