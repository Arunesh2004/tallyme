export class StudentMapper {
  static toDomain(raw: any): any {
    return { id: raw.id }; // (implementation note)
  }
  static toPersistence(domain: any): any {
    return { id: domain.id }; // (implementation note)
  }
}

export class VendorMapper {
  static toDomain(raw: any): any {
    return { id: raw.id };
  }
  static toPersistence(domain: any): any {
    return { id: domain.id };
  }
}

export class InvoiceMapper {
  static toDomain(raw: any): any {
    return { id: raw.id };
  }
  static toPersistence(domain: any): any {
    return { id: domain.id };
  }
}

export class VoucherMapper {
  static toDomain(raw: any): any {
    return { id: raw.id };
  }
  static toPersistence(domain: any): any {
    return { id: domain.id };
  }
}

export class ERPSyncMapper {
  static toDomain(raw: any): any {
    return { id: raw.id };
  }
  static toPersistence(domain: any): any {
    return { id: domain.id };
  }
}
