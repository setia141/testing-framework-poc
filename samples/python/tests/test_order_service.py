import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src'))

from order_service import calculate_total, classify_order, is_eligible_for_free_shipping


def test_calculate_total_basic():
    assert calculate_total(10, 5, 0) == 50

def test_calculate_total_with_discount():
    assert calculate_total(100, 2, 10) == 180

def test_calculate_total_invalid_quantity():
    with pytest.raises(ValueError):
        calculate_total(10, 0, 0)

def test_classify_order_large():
    assert classify_order(1000) == "LARGE"

def test_classify_order_small():
    assert classify_order(50) == "SMALL"

def test_free_shipping_premium_member():
    assert is_eligible_for_free_shipping(10, True) is True

def test_free_shipping_high_total():
    assert is_eligible_for_free_shipping(50, False) is True
