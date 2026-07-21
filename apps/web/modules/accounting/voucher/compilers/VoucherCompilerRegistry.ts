import { VoucherCompiler } from './VoucherCompiler';
import { ReceiptVoucherCompiler, PaymentVoucherCompiler, JournalVoucherCompiler } from './StandardCompilers';

export class VoucherCompilerRegistry {
  private compilers: Map<string, VoucherCompiler> = new Map();

  constructor() {
    this.register(new ReceiptVoucherCompiler());
    this.register(new PaymentVoucherCompiler());
    this.register(new JournalVoucherCompiler());
  }

  public register(compiler: VoucherCompiler): void {
    this.compilers.set(compiler.supportsType(), compiler);
  }

  public resolve(voucherType: string): VoucherCompiler {
    const compiler = this.compilers.get(voucherType);
    if (!compiler) {
      throw new Error(`UNSUPPORTED_VOUCHER_TYPE: No compiler registered for ${voucherType}`);
    }
    return compiler;
  }
}
