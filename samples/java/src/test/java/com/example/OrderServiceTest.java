package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {

    private final OrderService service = new OrderService();

    @Test
    void calculateTotal_basicOrder() {
        double total = service.calculateTotal(10.0, 5, 0);
        assertEquals(50.0, total);
    }

    @Test
    void calculateTotal_withDiscount() {
        double total = service.calculateTotal(100.0, 2, 10);
        assertEquals(180.0, total);
    }

    @Test
    void calculateTotal_invalidQuantity() {
        assertThrows(IllegalArgumentException.class,
            () -> service.calculateTotal(10.0, 0, 0));
    }

    @Test
    void classifyOrder_large() {
        assertEquals("LARGE", service.classifyOrder(1000));
    }

    @Test
    void classifyOrder_small() {
        assertEquals("SMALL", service.classifyOrder(50));
    }

    @Test
    void freeShipping_premiumMember() {
        assertTrue(service.isEligibleForFreeShipping(10, true));
    }

    @Test
    void freeShipping_highTotal() {
        assertTrue(service.isEligibleForFreeShipping(50, false));
    }
}
