"""
CraveDrop - Modern Food Delivery Web Application
Flask backend application providing both web views and RESTful API endpoints.
"""
import os
from flask import Flask, render_template, request, jsonify, abort, redirect, url_for
from models import Order
from seed_data import CATEGORIES, MENU_ITEMS, COUPONS

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'cravedrop-test-secret-key-2026')

# In-memory store for items and orders
ITEMS_STORE = {item.id: item for item in MENU_ITEMS}
ORDERS_STORE = {}

# Constants for price calculation
STANDARD_DELIVERY_FEE = 3.99
FREE_DELIVERY_THRESHOLD = 40.0
SERVICE_FEE_RATE = 0.05  # 5% service fee
TAX_RATE = 0.0825  # 8.25% sales tax


@app.route('/')
def home():
    """Render main food delivery storefront."""
    return render_template(
        'index.html',
        categories=CATEGORIES,
        initial_items=[item.to_dict() for item in MENU_ITEMS],
        coupons=COUPONS
    )


@app.route('/order/<order_id>')
def order_tracker(order_id):
    """Render the live order tracking page."""
    order = ORDERS_STORE.get(order_id)
    if not order:
        return render_template('404.html', message=f"Order {order_id} not found"), 404
    return render_template('order_tracker.html', order=order.to_dict())


# ============================================================================
# REST API Endpoints
# ============================================================================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all available food categories."""
    return jsonify({
        "success": True,
        "count": len(CATEGORIES),
        "categories": CATEGORIES
    })


@app.route('/api/menu', methods=['GET'])
def get_menu():
    """
    Get menu items with optional filtering and sorting.
    Query parameters:
      - category: filter by category id (e.g. 'pizza', 'burgers', 'all')
      - query: search term matching name or description
      - vegetarian: 'true' / '1' to filter vegetarian only
      - spicy: 'true' / '1' to filter spicy items
      - sort: 'price_asc', 'price_desc', 'rating', 'time'
    """
    category = request.args.get('category', '').strip().lower()
    search_query = request.args.get('query', '').strip().lower()
    vegetarian_only = request.args.get('vegetarian', '').lower() in ['true', '1']
    spicy_only = request.args.get('spicy', '').lower() in ['true', '1']
    sort_by = request.args.get('sort', 'popular')

    filtered = list(ITEMS_STORE.values())

    # Category filter
    if category and category != 'all':
        filtered = [item for item in filtered if item.category == category]

    # Search filter
    if search_query:
        filtered = [
            item for item in filtered
            if search_query in item.name.lower() or search_query in item.description.lower()
        ]

    # Dietary filters
    if vegetarian_only:
        filtered = [item for item in filtered if item.is_vegetarian]
    if spicy_only:
        filtered = [item for item in filtered if item.is_spicy]

    # Sorting
    if sort_by == 'price_asc':
        filtered.sort(key=lambda x: x.price)
    elif sort_by == 'price_desc':
        filtered.sort(key=lambda x: x.price, reverse=True)
    elif sort_by == 'rating':
        filtered.sort(key=lambda x: x.rating, reverse=True)
    elif sort_by == 'time':
        filtered.sort(key=lambda x: x.prep_time_minutes)
    else:  # 'popular'
        filtered.sort(key=lambda x: (x.is_bestseller, x.review_count), reverse=True)

    return jsonify({
        "success": True,
        "count": len(filtered),
        "items": [item.to_dict() for item in filtered]
    })


@app.route('/api/menu/<item_id>', methods=['GET'])
def get_menu_item(item_id):
    """Get single item by ID."""
    item = ITEMS_STORE.get(item_id)
    if not item:
        return jsonify({"success": False, "error": "Item not found"}), 404
    return jsonify({"success": True, "item": item.to_dict()})


@app.route('/api/apply-coupon', methods=['POST'])
def apply_coupon():
    """
    Validate and calculate coupon discount for an existing subtotal.
    Payload: { "code": "SAVE20", "subtotal": 35.50 }
    """
    data = request.get_json(silent=True) or {}
    code = (data.get('code') or '').strip().upper()
    try:
        subtotal = float(data.get('subtotal', 0.0))
    except (ValueError, TypeError):
        subtotal = 0.0

    if not code:
        return jsonify({"success": False, "error": "Coupon code is required"}), 400

    coupon = COUPONS.get(code)
    if not coupon:
        return jsonify({"success": False, "error": "Invalid or expired coupon code"}), 404

    min_subtotal = coupon.get('min_subtotal', 0.0)
    if subtotal < min_subtotal:
        return jsonify({
            "success": False,
            "error": f"Minimum subtotal of ${min_subtotal:.2f} required for coupon {code}"
        }), 400

    discount_amount = 0.0
    free_delivery = False

    if coupon['type'] == 'percent':
        discount_amount = round(subtotal * (coupon['value'] / 100.0), 2)
    elif coupon['type'] == 'fixed':
        discount_amount = min(coupon['value'], subtotal)
    elif coupon['type'] == 'delivery':
        free_delivery = True

    return jsonify({
        "success": True,
        "code": code,
        "description": coupon['description'],
        "discount_amount": discount_amount,
        "free_delivery": free_delivery
    })


@app.route('/api/orders', methods=['POST'])
def place_order():
    """
    Place a new food delivery order.
    Payload:
      - customer_name (str)
      - customer_phone (str)
      - delivery_address (str)
      - delivery_notes (str, optional)
      - payment_method (str)
      - items: [ { "item_id": "item-1", "quantity": 2 }, ... ]
      - coupon_code (str, optional)
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Invalid JSON body"}), 400

    customer_name = (data.get('customer_name') or '').strip()
    customer_phone = (data.get('customer_phone') or '').strip()
    delivery_address = (data.get('delivery_address') or '').strip()
    delivery_notes = (data.get('delivery_notes') or '').strip()
    payment_method = (data.get('payment_method') or 'card').strip()
    items_data = data.get('items', [])
    coupon_code = (data.get('coupon_code') or '').strip().upper()

    # Validations
    if not customer_name:
        return jsonify({"success": False, "error": "Customer name is required"}), 400
    if not customer_phone:
        return jsonify({"success": False, "error": "Customer phone number is required"}), 400
    if not delivery_address:
        return jsonify({"success": False, "error": "Delivery address is required"}), 400
    if not items_data or not isinstance(items_data, list):
        return jsonify({"success": False, "error": "Cart is empty. Please add items before checking out"}), 400

    # Process items and calculate verified prices
    processed_items = []
    subtotal = 0.0

    for it in items_data:
        item_id = it.get('item_id') or it.get('id')
        qty = int(it.get('quantity', 1))
        if qty <= 0:
            continue

        menu_item = ITEMS_STORE.get(item_id)
        if not menu_item:
            return jsonify({"success": False, "error": f"Item with ID '{item_id}' not found"}), 400

        item_total = round(menu_item.price * qty, 2)
        subtotal += item_total
        processed_items.append({
            "id": menu_item.id,
            "name": menu_item.name,
            "price": menu_item.price,
            "quantity": qty,
            "total_price": item_total,
            "image_url": menu_item.image_url
        })

    if not processed_items:
        return jsonify({"success": False, "error": "No valid items in order"}), 400

    subtotal = round(subtotal, 2)

    # Base delivery fee logic
    if subtotal >= FREE_DELIVERY_THRESHOLD:
        delivery_fee = 0.0
    else:
        delivery_fee = STANDARD_DELIVERY_FEE

    # Coupon processing
    discount = 0.0
    valid_coupon = None
    if coupon_code and coupon_code in COUPONS:
        c = COUPONS[coupon_code]
        if subtotal >= c.get('min_subtotal', 0.0):
            valid_coupon = coupon_code
            if c['type'] == 'percent':
                discount = round(subtotal * (c['value'] / 100.0), 2)
            elif c['type'] == 'fixed':
                discount = min(c['value'], subtotal)
            elif c['type'] == 'delivery':
                delivery_fee = 0.0

    service_fee = round(subtotal * SERVICE_FEE_RATE, 2)
    tax = round((subtotal - discount) * TAX_RATE, 2) if (subtotal - discount) > 0 else 0.0
    total = max(0.0, round(subtotal + delivery_fee + service_fee + tax - discount, 2))

    # Instantiate Order
    order = Order.create_new(
        customer_name=customer_name,
        customer_phone=customer_phone,
        delivery_address=delivery_address,
        delivery_notes=delivery_notes,
        payment_method=payment_method,
        items=processed_items,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        service_fee=service_fee,
        tax=tax,
        discount=discount,
        total=total,
        coupon_applied=valid_coupon
    )

    ORDERS_STORE[order.id] = order

    return jsonify({
        "success": True,
        "message": "Order successfully placed!",
        "order": order.to_dict(),
        "tracker_url": f"/order/{order.id}"
    }), 201


@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    """Retrieve order details and live delivery status."""
    order = ORDERS_STORE.get(order_id)
    if not order:
        return jsonify({"success": False, "error": "Order not found"}), 404
    return jsonify({"success": True, "order": order.to_dict()})


@app.route('/api/orders/<order_id>/advance-status', methods=['POST'])
def advance_order_status(order_id):
    """
    Testing helper endpoint to step through the order lifecycle:
    placed -> preparing -> on_the_way -> delivered
    """
    order = ORDERS_STORE.get(order_id)
    if not order:
        return jsonify({"success": False, "error": "Order not found"}), 404

    stages = ["placed", "preparing", "on_the_way", "delivered"]
    current_idx = stages.index(order.status) if order.status in stages else 0
    next_idx = min(current_idx + 1, len(stages) - 1)
    order.status = stages[next_idx]

    return jsonify({
        "success": True,
        "new_status": order.status,
        "order": order.to_dict()
    })


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404
    return render_template('404.html', message="The page you are looking for does not exist"), 404


@app.errorhandler(500)
def server_error(e):
    if request.path.startswith('/api/'):
        return jsonify({"success": False, "error": "Internal server error"}), 500
    return render_template('500.html', message="An unexpected server error occurred"), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"🚀 CraveDrop Food Delivery is running at http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
