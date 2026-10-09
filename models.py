"""
Data models for the CraveDrop Food Delivery Application.
Provides structured representation for Menu Items, Categories, Cart Items, and Orders.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


@dataclass
class MenuItem:
    id: str
    name: str
    category: str
    price: float
    description: str
    image_url: str
    rating: float
    review_count: int
    prep_time_minutes: int
    calories: int
    is_vegetarian: bool = False
    is_spicy: bool = False
    is_bestseller: bool = False
    allergens: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class CartItem:
    menu_item_id: str
    name: str
    price: float
    quantity: int

    @property
    def total_price(self) -> float:
        return round(self.price * self.quantity, 2)

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['total_price'] = self.total_price
        return data


@dataclass
class Order:
    id: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    delivery_notes: str
    payment_method: str
    items: List[Dict]
    subtotal: float
    delivery_fee: float
    service_fee: float
    tax: float
    discount: float
    total: float
    status: str = "placed"  # placed -> preparing -> on_the_way -> delivered
    coupon_applied: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    estimated_delivery_minutes: int = 30

    @classmethod
    def create_new(
        cls,
        customer_name: str,
        customer_phone: str,
        delivery_address: str,
        delivery_notes: str,
        payment_method: str,
        items: List[Dict],
        subtotal: float,
        delivery_fee: float,
        service_fee: float,
        tax: float,
        discount: float,
        total: float,
        coupon_applied: Optional[str] = None
    ) -> 'Order':
        order_code = f"CD-{uuid.uuid4().hex[:6].upper()}"
        return cls(
            id=order_code,
            customer_name=customer_name,
            customer_phone=customer_phone,
            delivery_address=delivery_address,
            delivery_notes=delivery_notes,
            payment_method=payment_method,
            items=items,
            subtotal=round(subtotal, 2),
            delivery_fee=round(delivery_fee, 2),
            service_fee=round(service_fee, 2),
            tax=round(tax, 2),
            discount=round(discount, 2),
            total=round(total, 2),
            coupon_applied=coupon_applied,
            status="placed"
        )

    def to_dict(self) -> Dict:
        return asdict(self)
