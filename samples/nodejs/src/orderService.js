function calculateTotal(price, quantity, discountPercent) {
    if (quantity <= 0) throw new Error("Quantity must be positive");
    if (discountPercent < 0 || discountPercent > 100) throw new Error("Discount must be between 0 and 100");
    const subtotal = price * quantity;
    const discount = subtotal * (discountPercent / 100);
    return subtotal - discount;
}

function classifyOrder(total) {
    if (total >= 1000) return "LARGE";
    if (total >= 100)  return "MEDIUM";
    return "SMALL";
}

function isEligibleForFreeShipping(total, isPremiumMember) {
    return isPremiumMember || total >= 50;
}

module.exports = { calculateTotal, classifyOrder, isEligibleForFreeShipping };
