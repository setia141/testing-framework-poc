def calculate_total(price, quantity, discount_percent):
    if quantity <= 0:
        raise ValueError("Quantity must be positive")
    if not (0 <= discount_percent <= 100):
        raise ValueError("Discount must be between 0 and 100")
    subtotal = price * quantity
    discount = subtotal * (discount_percent / 100)
    return subtotal - discount


def classify_order(total):
    if total >= 1000:
        return "LARGE"
    if total >= 100:
        return "MEDIUM"
    return "SMALL"


def is_eligible_for_free_shipping(total, is_premium_member):
    return is_premium_member or total >= 50
