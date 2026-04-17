namespace OrderService;

public class OrderService
{
    public double CalculateTotal(double price, int quantity, double discountPercent)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be positive");
        if (discountPercent < 0 || discountPercent > 100)
            throw new ArgumentException("Discount must be between 0 and 100");

        var subtotal = price * quantity;
        var discount = subtotal * (discountPercent / 100);
        return subtotal - discount;
    }

    public string ClassifyOrder(double total)
    {
        if (total >= 1000) return "LARGE";
        if (total >= 100)  return "MEDIUM";
        return "SMALL";
    }

    public bool IsEligibleForFreeShipping(double total, bool isPremiumMember)
    {
        return isPremiumMember || total >= 50;
    }
}
