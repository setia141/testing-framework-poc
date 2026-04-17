using Xunit;

namespace OrderService.Tests;

public class OrderServiceTests
{
    private readonly OrderService _service = new();

    [Fact]
    public void CalculateTotal_Basic() =>
        Assert.Equal(50, _service.CalculateTotal(10, 5, 0));

    [Fact]
    public void CalculateTotal_WithDiscount() =>
        Assert.Equal(180, _service.CalculateTotal(100, 2, 10));

    [Fact]
    public void CalculateTotal_InvalidQuantity_Throws() =>
        Assert.Throws<ArgumentException>(() => _service.CalculateTotal(10, 0, 0));

    [Fact]
    public void ClassifyOrder_Large() =>
        Assert.Equal("LARGE", _service.ClassifyOrder(1000));

    [Fact]
    public void ClassifyOrder_Small() =>
        Assert.Equal("SMALL", _service.ClassifyOrder(50));

    [Fact]
    public void FreeShipping_PremiumMember() =>
        Assert.True(_service.IsEligibleForFreeShipping(10, true));

    [Fact]
    public void FreeShipping_HighTotal() =>
        Assert.True(_service.IsEligibleForFreeShipping(50, false));
}
