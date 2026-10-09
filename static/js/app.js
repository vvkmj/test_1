/**
 * CraveDrop - Client-side Application Controller
 * Handles interactive cart, real-time filtering, coupons, modals, and order placement.
 */

// Application State
const AppState = {
    cart: {}, // { [itemId]: { id, name, price, image_url, quantity } }
    appliedCoupon: null, // { code, discount_amount, free_delivery, description }
    activeCategory: 'all',
    searchQuery: '',
    dietaryFilters: {
        vegetarian: false,
        spicy: false,
        topRated: false
    },
    sortBy: 'popular',
    menuItems: [] // populated from DOM or API
};

// Configuration Constants
const CONFIG = {
    STANDARD_DELIVERY_FEE: 3.99,
    FREE_DELIVERY_THRESHOLD: 40.0,
    SERVICE_FEE_RATE: 0.05,
    TAX_RATE: 0.0825
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initMenuItemsFromDOM();
    loadCartFromStorage();
    initCategoryTabs();
    initSearchAndFilters();
    initCartDrawer();
    initCheckoutModal();
    renderCart();
    updateAllCardActions();
});

/* ==========================================================================
   1. Menu Initialization & Filtering
   ========================================================================== */

function initMenuItemsFromDOM() {
    const cards = document.querySelectorAll('.food-card');
    AppState.menuItems = Array.from(cards).map(card => {
        const id = card.dataset.itemId;
        const category = card.dataset.category;
        const name = card.querySelector('.food-name')?.innerText.trim() || '';
        const priceStr = card.querySelector('.food-price')?.innerText.replace('$', '').trim() || '0';
        const price = parseFloat(priceStr);
        const ratingStr = card.querySelector('.rating-num')?.innerText.trim() || '0';
        const rating = parseFloat(ratingStr);
        const prepStr = card.querySelector('.prep-pill')?.innerText.replace(/[^0-9]/g, '').trim() || '20';
        const prepTime = parseInt(prepStr, 10);
        const isVeg = !!card.querySelector('.badge-veg');
        const isSpicy = !!card.querySelector('.badge-spicy');
        const isBestseller = !!card.querySelector('.badge-bestseller');
        const img = card.querySelector('.food-img')?.src || '';

        return {
            id,
            category,
            name,
            price,
            rating,
            prepTime,
            isVeg,
            isSpicy,
            isBestseller,
            image_url: img,
            element: card
        };
    });
}

function initCategoryTabs() {
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            AppState.activeCategory = pill.dataset.category;
            applyFilters();
        });
    });
}

function initSearchAndFilters() {
    const searchInput = document.getElementById('menu-search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AppState.searchQuery = e.target.value.trim().toLowerCase();
            if (clearBtn) {
                clearBtn.style.display = AppState.searchQuery ? 'block' : 'none';
            }
            applyFilters();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            AppState.searchQuery = '';
            clearBtn.style.display = 'none';
            applyFilters();
        });
    }

    // Dietary Filter Chips
    const vegBtn = document.getElementById('filter-veg');
    const spicyBtn = document.getElementById('filter-spicy');
    const topratedBtn = document.getElementById('filter-toprated');

    if (vegBtn) {
        vegBtn.addEventListener('click', () => {
            AppState.dietaryFilters.vegetarian = !AppState.dietaryFilters.vegetarian;
            vegBtn.classList.toggle('active', AppState.dietaryFilters.vegetarian);
            applyFilters();
        });
    }

    if (spicyBtn) {
        spicyBtn.addEventListener('click', () => {
            AppState.dietaryFilters.spicy = !AppState.dietaryFilters.spicy;
            spicyBtn.classList.toggle('active', AppState.dietaryFilters.spicy);
            applyFilters();
        });
    }

    if (topratedBtn) {
        topratedBtn.addEventListener('click', () => {
            AppState.dietaryFilters.topRated = !AppState.dietaryFilters.topRated;
            topratedBtn.classList.toggle('active', AppState.dietaryFilters.topRated);
            applyFilters();
        });
    }

    // Sort Dropdown
    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', (e) => {
            AppState.sortBy = e.target.value;
            applyFilters();
        });
    }
}

function applyFilters() {
    let visibleCount = 0;
    const grid = document.getElementById('food-grid');
    const emptyState = document.getElementById('no-results-state');

    // Filter items
    const filtered = AppState.menuItems.filter(item => {
        // Category check
        if (AppState.activeCategory !== 'all' && item.category !== AppState.activeCategory) {
            return false;
        }

        // Search text check
        if (AppState.searchQuery) {
            const matchName = item.name.toLowerCase().includes(AppState.searchQuery);
            const matchDesc = item.element.querySelector('.food-description')?.innerText.toLowerCase().includes(AppState.searchQuery);
            if (!matchName && !matchDesc) return false;
        }

        // Dietary checks
        if (AppState.dietaryFilters.vegetarian && !item.isVeg) return false;
        if (AppState.dietaryFilters.spicy && !item.isSpicy) return false;
        if (AppState.dietaryFilters.topRated && item.rating < 4.8) return false;

        return true;
    });

    // Sort items
    filtered.sort((a, b) => {
        if (AppState.sortBy === 'price_asc') return a.price - b.price;
        if (AppState.sortBy === 'price_desc') return b.price - a.price;
        if (AppState.sortBy === 'rating') return b.rating - a.rating;
        if (AppState.sortBy === 'time') return a.prepTime - b.prepTime;
        // Default popular
        return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
    });

    // Update DOM order & visibility
    AppState.menuItems.forEach(item => {
        item.element.style.display = 'none';
    });

    filtered.forEach(item => {
        item.element.style.display = 'flex';
        grid.appendChild(item.element); // re-append in sorted order
        visibleCount++;
    });

    // Update count indicator
    const countIndicator = document.getElementById('items-count-label');
    if (countIndicator) {
        countIndicator.innerText = `Showing ${visibleCount} dish${visibleCount === 1 ? '' : 'es'}`;
    }

    // Toggle Empty State
    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
}

function resetAllFilters() {
    AppState.searchQuery = '';
    AppState.activeCategory = 'all';
    AppState.dietaryFilters = { vegetarian: false, spicy: false, topRated: false };
    AppState.sortBy = 'popular';

    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) searchInput.value = '';

    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    document.querySelectorAll('.category-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.category === 'all');
    });

    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) sortDropdown.value = 'popular';

    applyFilters();
}

/* ==========================================================================
   2. Cart Operations & Calculation
   ========================================================================== */

function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('cravedrop_cart');
        if (saved) {
            AppState.cart = JSON.parse(saved);
        }
        const savedCoupon = localStorage.getItem('cravedrop_coupon');
        if (savedCoupon) {
            AppState.appliedCoupon = JSON.parse(savedCoupon);
        }
    } catch (e) {
        console.warn('Could not load cart from storage', e);
        AppState.cart = {};
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('cravedrop_cart', JSON.stringify(AppState.cart));
        if (AppState.appliedCoupon) {
            localStorage.setItem('cravedrop_coupon', JSON.stringify(AppState.appliedCoupon));
        } else {
            localStorage.removeItem('cravedrop_coupon');
        }
    } catch (e) {
        console.warn('Could not persist cart to storage', e);
    }
}

function addToCart(itemId, qty = 1) {
    const itemData = AppState.menuItems.find(i => i.id === itemId);
    if (!itemData) return;

    if (AppState.cart[itemId]) {
        AppState.cart[itemId].quantity += qty;
    } else {
        AppState.cart[itemId] = {
            id: itemData.id,
            name: itemData.name,
            price: itemData.price,
            image_url: itemData.image_url,
            quantity: qty
        };
    }

    saveCartToStorage();
    renderCart();
    updateCardAction(itemId);
    animateCartCounter();
    showToast(`Added ${itemData.name} to cart!`, 'success');
}

function quickAddToCart(itemId) {
    addToCart(itemId, 1);
    openCartDrawer();
}

function updateCartItemQty(itemId, delta) {
    if (!AppState.cart[itemId]) return;

    AppState.cart[itemId].quantity += delta;
    if (AppState.cart[itemId].quantity <= 0) {
        delete AppState.cart[itemId];
        showToast('Item removed from cart');
    }

    saveCartToStorage();
    renderCart();
    updateCardAction(itemId);
}

function removeCartItem(itemId) {
    if (AppState.cart[itemId]) {
        const name = AppState.cart[itemId].name;
        delete AppState.cart[itemId];
        saveCartToStorage();
        renderCart();
        updateCardAction(itemId);
        showToast(`Removed ${name} from cart`);
    }
}

function calculateOrderTotals() {
    let subtotal = 0;
    let totalItemsCount = 0;

    Object.values(AppState.cart).forEach(item => {
        subtotal += item.price * item.quantity;
        totalItemsCount += item.quantity;
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // Delivery Fee calculation
    let deliveryFee = CONFIG.STANDARD_DELIVERY_FEE;
    if (subtotal >= CONFIG.FREE_DELIVERY_THRESHOLD || subtotal === 0) {
        deliveryFee = 0.0;
    }

    // Coupon discount calculation
    let discount = 0.0;
    if (AppState.appliedCoupon) {
        if (AppState.appliedCoupon.free_delivery) {
            deliveryFee = 0.0;
        }
        if (AppState.appliedCoupon.discount_amount) {
            discount = AppState.appliedCoupon.discount_amount;
        }
    }

    const serviceFee = subtotal > 0 ? Math.round(subtotal * CONFIG.SERVICE_FEE_RATE * 100) / 100 : 0.0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount > 0 ? Math.round(taxableAmount * CONFIG.TAX_RATE * 100) / 100 : 0.0;
    const total = Math.max(0, Math.round((subtotal + deliveryFee + serviceFee + tax - discount) * 100) / 100);

    return {
        subtotal,
        deliveryFee,
        serviceFee,
        tax,
        discount,
        total,
        totalItemsCount
    };
}

function renderCart() {
    const totals = calculateOrderTotals();
    const cartCounter = document.getElementById('cart-counter');
    const cartNavTotal = document.getElementById('cart-nav-total');
    const drawerItemCount = document.getElementById('drawer-item-count');
    const cartList = document.getElementById('cart-items-list');
    const cartFooter = document.getElementById('cart-footer');
    const emptyState = document.getElementById('empty-cart-state');
    const deliveryBanner = document.getElementById('delivery-banner');
    const freeDeliveryText = document.getElementById('free-delivery-text');
    const freeDeliveryProgress = document.getElementById('free-delivery-progress');

    // Update Nav Counter & Subtotal
    if (cartCounter) cartCounter.innerText = totals.totalItemsCount;
    if (cartNavTotal) cartNavTotal.innerText = `$${totals.total.toFixed(2)}`;
    if (drawerItemCount) drawerItemCount.innerText = `${totals.totalItemsCount} item${totals.totalItemsCount === 1 ? '' : 's'}`;

    // Delivery Threshold Progress Bar
    if (deliveryBanner && freeDeliveryProgress && freeDeliveryText) {
        if (totals.subtotal >= CONFIG.FREE_DELIVERY_THRESHOLD) {
            freeDeliveryText.innerHTML = `🎉 You unlocked <strong>FREE Delivery!</strong>`;
            freeDeliveryProgress.style.width = '100%';
        } else {
            const remaining = (CONFIG.FREE_DELIVERY_THRESHOLD - totals.subtotal).toFixed(2);
            const percent = Math.min(100, Math.round((totals.subtotal / CONFIG.FREE_DELIVERY_THRESHOLD) * 100));
            freeDeliveryText.innerHTML = `Add <strong>$${remaining}</strong> more to unlock <strong>FREE Delivery</strong>!`;
            freeDeliveryProgress.style.width = `${percent}%`;
        }
    }

    // Toggle Empty or Filled State
    const cartItems = Object.values(AppState.cart);
    if (cartItems.length === 0) {
        if (cartList) cartList.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
            if (cartList) cartList.appendChild(emptyState);
        }
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'block';

    // Render items in list
    if (cartList) {
        cartList.innerHTML = cartItems.map(item => `
            <div class="cart-item-card" data-cart-id="${item.id}">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-thumb" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'">
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-actions">
                    <div class="drawer-qty-stepper">
                        <button type="button" onclick="updateCartItemQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                        <span>${item.quantity}</span>
                        <button type="button" onclick="updateCartItemQty('${item.id}', 1)" aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="btn-remove-item" onclick="removeCartItem('${item.id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }

    // Update Summary Rows
    const subtotalEl = document.getElementById('summary-subtotal');
    const deliveryEl = document.getElementById('summary-delivery');
    const serviceEl = document.getElementById('summary-service');
    const taxEl = document.getElementById('summary-tax');
    const totalEl = document.getElementById('summary-total');
    const discountRow = document.getElementById('row-discount');
    const discountEl = document.getElementById('summary-discount');
    const discountCodeName = document.getElementById('discount-code-name');

    if (subtotalEl) subtotalEl.innerText = `$${totals.subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = totals.deliveryFee === 0 ? 'FREE' : `$${totals.deliveryFee.toFixed(2)}`;
    if (serviceEl) serviceEl.innerText = `$${totals.serviceFee.toFixed(2)}`;
    if (taxEl) taxEl.innerText = `$${totals.tax.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${totals.total.toFixed(2)}`;

    if (discountRow) {
        if (totals.discount > 0 && AppState.appliedCoupon) {
            discountRow.style.display = 'flex';
            if (discountEl) discountEl.innerText = `-$${totals.discount.toFixed(2)}`;
            if (discountCodeName) discountCodeName.innerText = AppState.appliedCoupon.code;
        } else {
            discountRow.style.display = 'none';
        }
    }
}

function updateCardAction(itemId) {
    const container = document.getElementById(`action-${itemId}`);
    if (!container) return;

    const cartItem = AppState.cart[itemId];
    if (cartItem && cartItem.quantity > 0) {
        container.innerHTML = `
            <div class="card-qty-stepper">
                <button type="button" onclick="updateCartItemQty('${itemId}', -1)" aria-label="Decrease quantity">−</button>
                <span>${cartItem.quantity}</span>
                <button type="button" onclick="updateCartItemQty('${itemId}', 1)" aria-label="Increase quantity">+</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="btn-add-cart" onclick="addToCart('${itemId}')" aria-label="Add item to cart">
                <span class="plus-icon">+</span> Add
            </button>
        `;
    }
}

function updateAllCardActions() {
    AppState.menuItems.forEach(item => {
        updateCardAction(item.id);
    });
}

function animateCartCounter() {
    const badge = document.getElementById('cart-counter');
    if (badge) {
        badge.classList.remove('bump');
        void badge.offsetWidth; // trigger reflow
        badge.classList.add('bump');
    }
}

/* ==========================================================================
   3. Coupon Handling
   ========================================================================== */

function copyCoupon(code) {
    navigator.clipboard?.writeText(code).then(() => {
        showToast(`Copied code "${code}" to clipboard!`);
    }).catch(() => {
        showToast(`Promo code: ${code}`);
    });

    const input = document.getElementById('coupon-input');
    if (input) {
        input.value = code;
    }
}

async function handleApplyCoupon() {
    const input = document.getElementById('coupon-input');
    const msg = document.getElementById('coupon-message');
    if (!input || !msg) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        msg.className = 'coupon-message error';
        msg.innerText = 'Please enter a coupon code';
        return;
    }

    const totals = calculateOrderTotals();
    if (totals.subtotal <= 0) {
        msg.className = 'coupon-message error';
        msg.innerText = 'Add items to cart before applying coupon';
        return;
    }

    msg.className = 'coupon-message';
    msg.innerText = 'Verifying coupon...';

    try {
        const response = await fetch('/api/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal: totals.subtotal })
        });
        const data = await response.json();

        if (data.success) {
            AppState.appliedCoupon = {
                code: data.code,
                discount_amount: data.discount_amount,
                free_delivery: data.free_delivery,
                description: data.description
            };
            saveCartToStorage();
            renderCart();
            msg.className = 'coupon-message success';
            msg.innerText = `✓ Applied! ${data.description}`;
            showToast(`Coupon ${code} applied successfully!`, 'success');
        } else {
            msg.className = 'coupon-message error';
            msg.innerText = data.error || 'Invalid coupon';
        }
    } catch (e) {
        msg.className = 'coupon-message error';
        msg.innerText = 'Error connecting to coupon validator';
    }
}

/* ==========================================================================
   4. Cart Drawer & Checkout Modal
   ========================================================================== */

function initCartDrawer() {
    const openBtn = document.getElementById('open-cart-btn');
    const closeBtn = document.getElementById('close-cart-btn');
    const backdrop = document.getElementById('cart-backdrop');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const proceedBtn = document.getElementById('proceed-checkout-btn');

    if (openBtn) openBtn.addEventListener('click', openCartDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    if (backdrop) backdrop.addEventListener('click', closeCartDrawer);
    if (applyCouponBtn) applyCouponBtn.addEventListener('click', handleApplyCoupon);
    if (proceedBtn) proceedBtn.addEventListener('click', openCheckoutModal);

    // Keyboard Light Dismiss
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCartDrawer();
            closeCheckoutModal();
        }
    });
}

function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

function initCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const form = document.getElementById('checkout-form');

    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);

    // Payment method selector highlight
    document.querySelectorAll('.payment-card input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
            radio.closest('.payment-card')?.classList.add('selected');
        });
    });

    // Form submission
    if (form) {
        form.addEventListener('submit', handlePlaceOrder);
    }
}

function openCheckoutModal() {
    const totals = calculateOrderTotals();
    if (totals.totalItemsCount === 0) {
        showToast('Your cart is empty. Please select some food first!', 'error');
        return;
    }

    closeCartDrawer();

    const modal = document.getElementById('checkout-modal');
    const modalItemCount = document.getElementById('modal-item-count');
    const modalFinalTotal = document.getElementById('modal-final-total');

    if (modalItemCount) modalItemCount.innerText = `${totals.totalItemsCount} dishes`;
    if (modalFinalTotal) modalFinalTotal.innerText = `$${totals.total.toFixed(2)}`;

    if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal && typeof modal.close === 'function') {
        modal.close();
    }
}

async function handlePlaceOrder(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submit-order-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const spinner = submitBtn?.querySelector('.spinner');

    const customerName = form.customer_name?.value.trim();
    const customerPhone = form.customer_phone?.value.trim();
    const deliveryAddress = form.delivery_address?.value.trim();
    const deliveryNotes = form.delivery_notes?.value.trim();
    const paymentMethod = form.payment_method?.value || 'card';

    const items = Object.values(AppState.cart).map(i => ({
        item_id: i.id,
        quantity: i.quantity
    }));

    if (items.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.innerText = 'Transmitting Order...';
    if (spinner) spinner.style.display = 'inline-block';

    const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        payment_method: paymentMethod,
        items: items,
        coupon_code: AppState.appliedCoupon?.code || ''
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            // Clear cart
            AppState.cart = {};
            AppState.appliedCoupon = null;
            saveCartToStorage();
            closeCheckoutModal();

            showToast('Order confirmed! Redirecting to tracker...', 'success');
            setTimeout(() => {
                window.location.href = data.tracker_url;
            }, 700);
        } else {
            showToast(data.error || 'Failed to place order', 'error');
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.innerText = 'Place Delivery Order';
            if (spinner) spinner.style.display = 'none';
        }
    } catch (err) {
        showToast('Network error while placing order. Please try again.', 'error');
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.innerText = 'Place Delivery Order';
        if (spinner) spinner.style.display = 'none';
    }
}

/* ==========================================================================
   5. Toast Notification Component
   ========================================================================== */

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
