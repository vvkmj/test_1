"""
Unit and integration tests for CraveDrop food delivery application.
Tests cover web routes, REST API endpoints, pricing calculations, validations, and order tracking.
"""
import pytest
from app import app, ORDERS_STORE


@pytest.fixture
def client():
    """Create test client with fresh test environment."""
    app.config['TESTING'] = True
    ORDERS_STORE.clear()
    with app.test_client() as client:
        yield client


class TestWebViews:
    """Tests for HTML templates and web views."""

    def test_home_page_renders_successfully(self, client):
        response = client.get('/')
        assert response.status_code == 200
        html = response.data.decode('utf-8')
        assert 'Crave' in html
        assert 'Drop' in html
        assert 'Artisan Cravings' in html
        assert 'Explore By Category' in html
        assert 'Black Truffle Wagyu' in html

    def test_404_view_for_invalid_page(self, client):
        response = client.get('/non-existent-page')
        assert response.status_code == 404
        html = response.data.decode('utf-8')
        assert '404' in html
        assert 'Not Found' in html

    def test_order_tracker_page_not_found(self, client):
        response = client.get('/order/CD-NONEXISTENT')
        assert response.status_code == 404


class TestApiMenuAndCategories:
    """Tests for menu and category REST endpoints."""

    def test_get_categories(self, client):
        response = client.get('/api/categories')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['count'] > 0
        assert any(c['id'] == 'pizza' for c in data['categories'])

    def test_get_all_menu_items(self, client):
        response = client.get('/api/menu')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['count'] >= 10
        assert len(data['items']) == data['count']

    def test_filter_menu_by_category(self, client):
        response = client.get('/api/menu?category=pizza')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert all(item['category'] == 'pizza' for item in data['items'])

    def test_filter_menu_by_search_query(self, client):
        response = client.get('/api/menu?query=truffle')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert any('truffle' in item['name'].lower() for item in data['items'])

    def test_filter_menu_by_dietary_vegetarian(self, client):
        response = client.get('/api/menu?vegetarian=1')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert all(item['is_vegetarian'] is True for item in data['items'])

    def test_filter_menu_sort_price_asc(self, client):
        response = client.get('/api/menu?sort=price_asc')
        assert response.status_code == 200
        data = response.get_json()
        prices = [item['price'] for item in data['items']]
        assert prices == sorted(prices)

    def test_get_single_item_valid(self, client):
        response = client.get('/api/menu/item-1')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['item']['id'] == 'item-1'
        assert 'Margherita' in data['item']['name']

    def test_get_single_item_invalid(self, client):
        response = client.get('/api/menu/unknown-item-999')
        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False


class TestApiCoupons:
    """Tests for coupon code validation and calculation."""

    def test_apply_valid_percent_coupon(self, client):
        response = client.post('/api/apply-coupon', json={
            'code': 'SAVE20',
            'subtotal': 50.0
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['discount_amount'] == 10.0  # 20% of 50.0

    def test_apply_valid_freeship_coupon(self, client):
        response = client.post('/api/apply-coupon', json={
            'code': 'FREESHIP',
            'subtotal': 25.0
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['free_delivery'] is True

    def test_apply_coupon_under_minimum_subtotal(self, client):
        response = client.post('/api/apply-coupon', json={
            'code': 'FEAST10',  # requires min $30
            'subtotal': 15.0
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Minimum subtotal' in data['error']

    def test_apply_invalid_coupon(self, client):
        response = client.post('/api/apply-coupon', json={
            'code': 'BOGUS99',
            'subtotal': 50.0
        })
        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False


class TestApiOrdersAndLifecycle:
    """Tests for order creation, calculation, validation, and status tracking."""

    def test_place_order_success(self, client):
        payload = {
            'customer_name': 'Sarah Connor',
            'customer_phone': '(555) 987-6543',
            'delivery_address': '100 Sunset Blvd, Los Angeles, CA',
            'delivery_notes': 'Please ring gate buzzer 102',
            'payment_method': 'card',
            'items': [
                {'item_id': 'item-1', 'quantity': 2},  # 15.99 * 2 = 31.98
                {'item_id': 'item-3', 'quantity': 1}   # 18.95 * 1 = 18.95
            ],
            'coupon_code': 'SAVE20'
        }
        response = client.post('/api/orders', json=payload)
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        order = data['order']
        assert order['id'].startswith('CD-')
        assert order['customer_name'] == 'Sarah Connor'
        assert order['status'] == 'placed'
        assert order['subtotal'] == pytest.approx(50.93, 0.01)
        assert order['discount'] == pytest.approx(10.19, 0.01)
        assert order['total'] > 0

        # Verify we can fetch the order via API
        order_id = order['id']
        fetch_resp = client.get(f'/api/orders/{order_id}')
        assert fetch_resp.status_code == 200
        assert fetch_resp.get_json()['order']['id'] == order_id

        # Verify web tracker renders
        page_resp = client.get(f'/order/{order_id}')
        assert page_resp.status_code == 200
        assert order_id in page_resp.data.decode('utf-8')

    def test_advance_order_status_simulation(self, client):
        # Create an order first
        create_resp = client.post('/api/orders', json={
            'customer_name': 'Test User',
            'customer_phone': '1234567890',
            'delivery_address': '456 Test Ave',
            'items': [{'item_id': 'item-1', 'quantity': 1}]
        })
        order_id = create_resp.get_json()['order']['id']

        # Advance status: placed -> preparing
        adv1 = client.post(f'/api/orders/{order_id}/advance-status')
        assert adv1.status_code == 200
        assert adv1.get_json()['new_status'] == 'preparing'

        # Advance status: preparing -> on_the_way
        adv2 = client.post(f'/api/orders/{order_id}/advance-status')
        assert adv2.status_code == 200
        assert adv2.get_json()['new_status'] == 'on_the_way'

        # Advance status: on_the_way -> delivered
        adv3 = client.post(f'/api/orders/{order_id}/advance-status')
        assert adv3.status_code == 200
        assert adv3.get_json()['new_status'] == 'delivered'

    def test_place_order_validation_empty_cart(self, client):
        response = client.post('/api/orders', json={
            'customer_name': 'Test User',
            'customer_phone': '1234567890',
            'delivery_address': '456 Test Ave',
            'items': []
        })
        assert response.status_code == 400
        assert 'Cart is empty' in response.get_json()['error']

    def test_place_order_validation_missing_name(self, client):
        response = client.post('/api/orders', json={
            'customer_name': '',
            'customer_phone': '1234567890',
            'delivery_address': '456 Test Ave',
            'items': [{'item_id': 'item-1', 'quantity': 1}]
        })
        assert response.status_code == 400
        assert 'Customer name is required' in response.get_json()['error']
