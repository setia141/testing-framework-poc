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
