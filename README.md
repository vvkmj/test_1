# ⚡ CraveDrop - Modern Food Delivery Web Application

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![Flask 3.0+](https://img.shields.io/badge/framework-Flask%203.0+-green.svg)](https://flask.palletsprojects.com/)
[![Tests Passing](https://img.shields.io/badge/tests-19%20passed-brightgreen.svg)](tests/test_app.py)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**CraveDrop** is a full-featured, modern food delivery web application built with Python (Flask), clean HTML5 semantic structure, and vanilla CSS & JavaScript. Designed as a complete, self-contained test repository demonstrating modern frontend aesthetics, robust backend APIs, and end-to-end checkout and delivery tracking workflows.

---

## ✨ Features

- 🍕 **Curated Artisan Menu**: Rich preloaded categories (Pizzas, Gourmet Burgers, Asian Noodles, Sushi & Poke, Tacos, Salads, Desserts, Drinks) with nutritional data, preparation times, dietary badges, and mouth-watering photography.
- 🔍 **Real-Time Client-Side Filtering & Search**: Instant dish search and filtering across categories, dietary preferences (Vegetarian, Spicy, Top-Rated 4.8+), and sorting (Popularity, Price Low/High, Rating, Prep Time).
- 🛒 **Dynamic Cart Drawer**:
  - Live subtotal, service fee, and estimated tax calculation.
  - Free delivery milestone progress tracker (unlocks free delivery over $40).
  - Quantity steppers embedded both inside the cart drawer and directly within food cards.
  - Persistent cart state using `localStorage`.
- 🎟️ **Promo & Coupon System**: Instant coupon validation and calculation (`SAVE20`, `FEAST10`, `FREESHIP`, `TEST50`).
- 💳 **Seamless Checkout Flow**: Native `<dialog>` modal with delivery address validation, instructions, and multiple payment methods.
- 📍 **Live Order Tracker & Lifecycle Simulator**:
  - Interactive multi-step order status pipeline: `Order Received` ➔ `In The Kitchen` ➔ `Out for Delivery` ➔ `Delivered`.
  - Built-in **Test Repo Status Advancement button** to step through the entire courier delivery simulation in real time.
  - Comprehensive itemized receipt and driver assignment info.
- 🧪 **Complete Test Suite**: Automated unit and integration tests covering routes, APIs, calculations, and validations via `pytest`.

---

## 📁 Project Architecture

```
test_1/
├── app.py                  # Core Flask application, routing & REST API endpoints
├── models.py               # Data models (MenuItem, CartItem, Order dataclasses)
├── seed_data.py            # Pre-seeded categories, rich dishes, and active coupon codes
├── requirements.txt        # Python dependency manifest
├── run.sh                  # One-click startup script
├── .env.example            # Environment variables configuration template
├── .gitignore              # Standard Python gitignore rules
├── templates/
│   ├── base.html           # Master layout (Navbar, Cart Drawer, Checkout Modal, Toasts)
│   ├── index.html          # Main storefront (Hero, Category Pills, Filters, Dish Grid)
│   ├── order_tracker.html  # Live order tracking and test simulator page
│   └── 404.html            # User-friendly error page
├── static/
│   ├── css/
│   │   └── style.css       # Design system (Gradients, glassmorphism, micro-animations)
│   └── js/
│       └── app.js          # Cart state machine, reactive search, coupons, checkout
└── tests/
    ├── __init__.py
    └── test_app.py         # 19 automated tests for web views and REST endpoints
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Python 3.9 or higher installed:
```bash
python3 --version
```

### 2. Setup Virtual Environment (Recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
You can run the application directly using the helper script:
```bash
./run.sh
```
Or start with python directly:
```bash
python3 app.py
```

Open your browser at: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🧪 Running Automated Tests

Run the full test suite with `pytest`:
```bash
python3 -m pytest -v
```

All 19 test cases validate:
- HTML view responses (200 OK, 404 handlers)
- Menu and category filtering APIs
- Price calculation, service fee, and tax logic
- Coupon code validations and minimum subtotal thresholds
- Order placement, payload validation, and lifecycle state transitions

---

## 🔌 REST API Reference

| Method | Endpoint | Description | Query / Body Parameters |
|---|---|---|---|
| `GET` | `/` | Web storefront view | None |
| `GET` | `/order/<order_id>` | Web live order tracking view | None |
| `GET` | `/api/categories` | List all available categories | None |
| `GET` | `/api/menu` | List menu items with filters | `?category=pizza&query=wagyu&vegetarian=1&sort=price_asc` |
| `GET` | `/api/menu/<item_id>` | Retrieve specific menu item | `item_id` (e.g. `item-1`) |
| `POST` | `/api/apply-coupon` | Validate and calculate coupon discount | `{"code": "SAVE20", "subtotal": 45.00}` |
| `POST` | `/api/orders` | Place a new order | `{"customer_name": "...", "delivery_address": "...", "items": [{"item_id": "item-1", "quantity": 2}]}` |
| `GET` | `/api/orders/<order_id>` | Fetch order details and current status | `order_id` (e.g. `CD-A1B2C3`) |
| `POST` | `/api/orders/<order_id>/advance-status` | **Test Simulator**: Advance order to next status | None |

---

## 🎟️ Active Test Promo Codes

| Code | Discount Type | Condition / Description |
|---|---|---|
| `SAVE20` | **20% OFF** | 20% discount on order subtotal |
| `FEAST10` | **$10 OFF** | Requires minimum subtotal of $30.00 |
| `FREESHIP` | **Free Delivery** | 100% discount on standard delivery fee |
| `TEST50` | **50% OFF** | Developer testing half-price discount |

---

## 💡 Testing Scenarios to Try

1. **Category & Dietary Filtering**:
   - Click **"Artisanal Pizzas"** or **"Gourmet Burgers"** to filter dishes.
   - Toggle **"🌱 Vegetarian Only"** or **"🌶️ Spicy Picks"** to see instant UI updates.
2. **Dynamic Quantity Stepper**:
   - Click `+ Add` on any dish card. Notice it turns into a `- 1 +` stepper directly on the card!
3. **Cart & Free Shipping Progress**:
   - Add items until subtotal reaches $40.00. Watch the animated progress bar unlock **FREE Delivery**!
4. **Promo Codes**:
   - Open cart, enter `SAVE20`, and click **Apply** to see discount deducted live.
5. **Checkout & Order Tracking**:
   - Click **Proceed to Checkout**, fill in details, and submit.
   - You will be redirected to the **Order Tracker**.
   - Click the **"Advance Status ⚡"** button to simulate the kitchen and driver in action!
