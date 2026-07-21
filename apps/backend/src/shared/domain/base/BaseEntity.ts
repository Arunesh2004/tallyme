import { IClock } from '../../contracts';

export abstract class BaseEntity<TId> {
  protected readonly _id: TId;
  protected _createdAt: Date;
  protected _updatedAt: Date;

  protected constructor(id: TId, clock: IClock) {
    this._id = id;
    const now = clock.now();
    this._createdAt = now;
    this._updatedAt = now;
  }

  get id(): TId {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected markUpdated(clock: IClock): void {
    this._updatedAt = clock.now();
  }

  public equals(other?: BaseEntity<TId>): boolean {
    if (other == null) {
      return false;
    }
    return String(this._id) === String(other._id);
  }
}
