import { Injectable } from '@nestjs/common';

@Injectable()
export class ConflictDetector {
  detect(matchedIds: string[]): string[] {
    const conflicts = [];

    if (matchedIds.length > 1) {
      const uniqueIds = Array.from(new Set(matchedIds));
      if (uniqueIds.length > 1) {
        conflicts.push('MULTIPLE_STUDENTS');
      }
    }

    return conflicts;
  }
}
