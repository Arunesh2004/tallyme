import { FeeAllocationEngine } from './allocation.engine';

describe('FeeAllocationEngine', () => {
  let engine: FeeAllocationEngine;

  beforeEach(() => {
    engine = new FeeAllocationEngine();
  });

  it('should allocate fully when payment matches outstanding', () => {
    const payment = 1000;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(1000);
    expect(result.remainingAmount).toBe(0);
    expect(result.allocations[0].allocated).toBe(1000);
    expect(result.allocations[0].newAmountPaid).toBe(1000);
    expect(result.allocations[0].isPaid).toBe(true);
  });

  it('should allocate partially when payment is less than outstanding', () => {
    const payment = 400;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(400);
    expect(result.remainingAmount).toBe(0);
    expect(result.allocations[0].allocated).toBe(400);
    expect(result.allocations[0].newAmountPaid).toBe(400);
    expect(result.allocations[0].isPaid).toBe(false);
  });

  it('should support multiple partial payments', () => {
    const payment = 300;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '400', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(300);
    expect(result.allocations[0].newAmountPaid).toBe(700);
    expect(result.allocations[0].isPaid).toBe(false);
  });

  it('should handle overpayment by returning remaining amount', () => {
    const payment = 1200;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(1000);
    expect(result.remainingAmount).toBe(200);
    expect(result.allocations[0].allocated).toBe(1000);
    expect(result.allocations[0].isPaid).toBe(true);
  });

  it('should handle negative payment gracefully', () => {
    const payment = -100;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(0);
    expect(result.remainingAmount).toBe(-100);
    expect(result.allocations.length).toBe(0);
  });

  it('should ignore already paid outstandings', () => {
    const payment = 1000;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '1000', isPaid: true, feeHeadId: 'h1', feeHead: { name: 'Tuition', priority: 10 }, dueDate: new Date() },
      { id: '2', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h2', feeHead: { name: 'Transport', priority: 5 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(1000);
    expect(result.allocations.length).toBe(1);
    expect(result.allocations[0].outstandingFeeId).toBe('2');
  });

  it('should allocate to multiple outstandings based on priority', () => {
    const payment = 1500;
    const outstandings = [
      { id: '1', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h1', feeHead: { name: 'Low Priority', priority: 5 }, dueDate: new Date() },
      { id: '2', amount: '1000', amountPaid: '0', isPaid: false, feeHeadId: 'h2', feeHead: { name: 'High Priority', priority: 10 }, dueDate: new Date() },
    ];
    
    const result = engine.allocate(payment, outstandings);
    
    expect(result.allocatedAmount).toBe(1500);
    expect(result.remainingAmount).toBe(0);
    expect(result.allocations.length).toBe(2);
    expect(result.allocations[0].outstandingFeeId).toBe('2');
    expect(result.allocations[0].allocated).toBe(1000);
    expect(result.allocations[1].outstandingFeeId).toBe('1');
    expect(result.allocations[1].allocated).toBe(500);
  });
});
