import { Injectable } from '@nestjs/common';
import { IPasswordHasher } from '../interfaces/password-hasher.interface';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    // Infrastructure abstraction implemented here.
    // Actual bcrypt call omitted as per milestone limits.
    return `hashed_${password}`;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return `hashed_${password}` === hash;
  }
}
