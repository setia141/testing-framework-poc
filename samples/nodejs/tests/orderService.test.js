const { calculateTotal, classifyOrder, isEligibleForFreeShipping } = require('../src/orderService');

test('calculateTotal basic', () => {
    expect(calculateTotal(10, 5, 0)).toBe(50);
});

test('calculateTotal with discount', () => {
    expect(calculateTotal(100, 2, 10)).toBe(180);
});

test('calculateTotal invalid quantity throws', () => {
    expect(() => calculateTotal(10, 0, 0)).toThrow();
});

test('classifyOrder large', () => {
    expect(classifyOrder(1000)).toBe('LARGE');
});

test('classifyOrder small', () => {
    expect(classifyOrder(50)).toBe('SMALL');
});

test('free shipping for premium member', () => {
    expect(isEligibleForFreeShipping(10, true)).toBe(true);
});

test('free shipping for high total', () => {
    expect(isEligibleForFreeShipping(50, false)).toBe(true);
});

test('calculateTotal negative discount throws', () => {
    expect(() => calculateTotal(10, 5, -1)).toThrow("Discount must be between 0 and 100");
});

test('calculateTotal discount over 100 throws', () => {
    expect(() => calculateTotal(10, 5, 101)).toThrow("Discount must be between 0 and 100");
});

test('calculateTotal discount exactly 100 does not throw', () => {
    expect(calculateTotal(10, 5, 100)).toBe(0);
});

test('calculateTotal invalid quantity error message', () => {
    expect(() => calculateTotal(10, 0, 0)).toThrow("Quantity must be positive");
});

test('classifyOrder medium lower boundary', () => {
    expect(classifyOrder(100)).toBe('MEDIUM');
});

test('classifyOrder medium upper boundary', () => {
    expect(classifyOrder(999)).toBe('MEDIUM');
});

test('no free shipping for low total non-premium', () => {
    expect(isEligibleForFreeShipping(10, false)).toBe(false);
});
