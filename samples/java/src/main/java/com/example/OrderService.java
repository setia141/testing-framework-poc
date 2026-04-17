package com.example;

public class OrderService {

    public double calculateTotal(double price, int quantity, double discountPercent) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        if (discountPercent < 0 || discountPercent > 100) {
            throw new IllegalArgumentException("Discount must be between 0 and 100");
        }
        double subtotal = price * quantity;
        double discount = subtotal * (discountPercent / 100);
        return subtotal - discount;
    }

    public String classifyOrder(double total) {
        if (total >= 1000) return "LARGE";
        if (total >= 100)  return "MEDIUM";
        return "SMALL";
    }

    public boolean isEligibleForFreeShipping(double total, boolean isPremiumMember) {
        return isPremiumMember || total >= 50;
    }
}
