// Data Menu
const menuData = [
    {
        id: 1,
        name: 'Gorengan',
        category: 'makanan',
        price: 1000,
        discount: 0,
        image: 'image/Gorengan.jpg',
        isSelected: false
    },
    {
        id: 2,
        name: 'Cireng ayam Suwir',
        category: 'makanan',
        price: 1000,
        discount: 0,
        image: 'image/Cireng.jpg',
        isSelected: false
    },
    {
        id: 3,
        name: 'Risol Mayo',
        category: 'makanan',
        price: 3000,
        discount: 0,
        image: 'image/Risol.jpg',
        isSelected: false
    },
    {
        id: 4,
        name: 'Pop Mie',
        category: 'makanan',
        price: 6000,
        discount: 0,
        image: 'image/Pop Mie.jpg',
        isSelected: false
    },
    {
        id: 5,
        name: 'Soto',
        category: 'makanan',
        price: 5000,
        discount: 0,
        image: 'image/Soto.jpg',
        isSelected: false
    },
    {
        id: 6,
        name: 'Ayam Geprek',
        category: 'makanan',
        price: 10000,
        discount: 0,
        image: 'image/Geprek.jpg',
        isSelected: false
    },
    {
        id: 7,
        name: 'Pop Ice',
        category: 'minuman',
        price: 3000,
        discount: 0,
        image: 'image/Pop Ice.jpg',
        isSelected: false
    },
    {
        id: 8,
        name: 'Es Teh',
        category: 'minuman',
        price: 3000,
        discount: 0,
        image: 'image/Es Teh.jpg',
        isSelected: false
    },
    {
        id: 9,
        name: 'Es Jeruk',
        category: 'minuman',
        price: 4000,
        discount: 0,
        image: 'image/Es Jeruk.jpg',
        isSelected: false
    },
    {
        id: 10,
        name: 'Air Mineral',
        category: 'minuman',
        price: 3000,
        discount: 0,
        image: 'image/Air Mineral.jpg',
        isSelected: false
    },
    {
        id: 11,
        name: 'Es Drink Beng Beng',
        category: 'minuman',
        price: 4000,
        discount: 0,
        image: 'image/Drink.jpg',
        isSelected: false
    }
];

// State Management
class AppState {
    constructor() {
        this.cart = [];
        this.currentTab = 'all';
        this.searchTerm = '';
        this.paymentMethod = 'cash';
        // [ADDED] History state
        this.orderHistory = [];
        this.historyFilter = 'all';
        this.historySearch = '';
        this.isHistoryView = false;
        // [END ADDED]
        this.loadFromStorage();
    }

    loadFromStorage() {
        const savedCart = localStorage.getItem('kantingenz_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }
        
        // [ADDED] Load order history
        const savedHistory = localStorage.getItem('kantingenz_history');
        if (savedHistory) {
            this.orderHistory = JSON.parse(savedHistory);
        }
        // [END ADDED]
    }

    saveToStorage() {
        localStorage.setItem('kantingenz_cart', JSON.stringify(this.cart));
    }

    // [ADDED] Save order history to storage
    saveHistoryToStorage() {
        localStorage.setItem('kantingenz_history', JSON.stringify(this.orderHistory));
    }
    // [END ADDED]

    addToCart(item) {
        const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({ ...item, quantity: 1 });
        }
        this.saveToStorage();
        this.updateCartUI();
        this.renderMenu();
        showToast(`${item.name} ditambahkan ke keranjang!`);
    }

    updateQuantity(id, change) {
        const item = this.cart.find(cartItem => cartItem.id === id);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(id);
            } else {
                this.saveToStorage();
                this.updateCartUI();
                this.renderMenu();
            }
        }
    }

    removeFromCart(id) {
        this.cart = this.cart.filter(item => item.id !== id);
        this.saveToStorage();
        this.updateCartUI();
        this.renderMenu();
        showToast('Item dihapus dari keranjang');
    }

    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    getTotalPrice() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getFilteredMenu() {
        let filtered = menuData;
        
        // Filter by category
        if (this.currentTab !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentTab);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const navCartCount = document.getElementById('navCartCount');
        const cartItems = document.getElementById('cartItems');
        const totalAmount = document.getElementById('totalAmount');
        
        const totalItems = this.getTotalItems();
        const totalPrice = this.getTotalPrice();
        
        // Update cart counts
        cartCount.textContent = totalItems;
        navCartCount.textContent = totalItems;
        
        // Update cart items
        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <h3>Keranjang Kosong</h3>
                    <p>Belum ada item di keranjang Anda</p>
                </div>
            `;
        } else {
            cartItems.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image-container">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` : ''}
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, -1)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, 1)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <button class="remove-btn" onclick="app.removeFromCart(${item.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Update total
        totalAmount.textContent = formatCurrency(totalPrice);
    }

    renderMenu() {
        const menuGrid = document.getElementById('menuGrid');
        const filteredMenu = this.getFilteredMenu();
        
        if (filteredMenu.length === 0) {
            menuGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <h3>Tidak Ada Menu</h3>
                    <p>Tidak ada menu yang cocok dengan pencarian Anda</p>
                </div>
            `;
            return;
        }
        
        menuGrid.innerHTML = filteredMenu.map(item => {
            const cartItem = this.cart.find(cartItem => cartItem.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            const isInCart = quantity > 0;
            
            return `
            <div class="menu-card ${isInCart ? 'selected' : ''}">
                <div class="menu-image-container">
                    <img src="${item.image}" alt="${item.name}" class="menu-image">
                    ${item.discount > 0 ? `
                        <div class="discount-badge">${item.discount}% Off</div>
                    ` : ''}
                </div>
                <div class="menu-content">
                    <h3 class="menu-title">${item.name}</h3>
                    <div class="menu-info">
                        <div class="menu-price">${formatCurrency(item.price)}</div>
                    </div>
                    ${isInCart ? `
                        <div class="quantity-selector">
                            <button class="qty-btn minus" onclick="app.updateQuantity(${item.id}, -1)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <span class="qty-value">${quantity}</span>
                            <button class="qty-btn plus" onclick="app.updateQuantity(${item.id}, 1)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    ` : `
                        <button class="add-to-dish-btn" onclick="app.addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                            Tambahkan Ke Keranjang
                        </button>
                    `}
                </div>
            </div>
        `;
        }).join('');
    }

    setTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn, .nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-tab="${tab}"]`).forEach(btn => {
            btn.classList.add('active');
        });
        
        this.renderMenu();
    }

    setSearchTerm(term) {
        this.searchTerm = term;
        this.renderMenu();
    }

    openCart() {
        document.getElementById('cartSidebar').classList.add('open');
        document.getElementById('cartOverlay').classList.add('open');
    }

    closeCart() {
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('open');
    }

    openCheckout() {
        if (this.cart.length === 0) {
            showToast('Keranjang masih kosong!');
            return;
        }
        
        this.updateOrderSummary();
        document.getElementById('checkoutModal').classList.add('open');
        document.getElementById('modalOverlay').classList.add('open');
        this.closeCart();
    }

    closeCheckout() {
        document.getElementById('checkoutModal').classList.remove('open');
        document.getElementById('modalOverlay').classList.remove('open');
    }

    updateOrderSummary() {
        const orderItems = document.getElementById('orderItems');
        const orderTotal = document.getElementById('orderTotal');
        
        orderItems.innerHTML = this.cart.map(item => `
            <div class="order-item">
                <span>${item.name} x${item.quantity}</span>
                <span>${formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');
        
        orderTotal.textContent = formatCurrency(this.getTotalPrice());
    }

    // [MODIFIED] Process payment with history saving
    processPayment() {
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        this.paymentMethod = paymentMethod;
        
        // Simulasi proses pembayaran
        const payBtn = document.getElementById('payBtn');
        payBtn.textContent = 'Memproses...';
        payBtn.disabled = true;
        
        setTimeout(() => {
            // [ADDED] Save to order history
            const newOrder = {
                id: 'ORD' + String(this.orderHistory.length + 1).padStart(4, '0'),
                date: new Date().toLocaleString('id-ID', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                items: [...this.cart],
                total: this.getTotalPrice(),
                status: 'diproses',
                paymentMethod: paymentMethod === 'cash' ? 'Tunai' : 'QRIS'
            };
            
            this.orderHistory.unshift(newOrder);
            this.saveHistoryToStorage();
            // [END ADDED]
            
            showToast(`Pembayaran ${paymentMethod === 'cash' ? 'Tunai' : 'QRIS'} berhasil! Total: ${formatCurrency(this.getTotalPrice())}`);
            
            // Reset cart
            this.cart = [];
            this.saveToStorage();
            this.updateCartUI();
            this.renderMenu();
            this.closeCheckout();
            
            // Reset button
            payBtn.textContent = 'Bayar';
            payBtn.disabled = false;
        }, 2000);
    }
    // [END MODIFIED]

    // [ADDED] History functions
    toggleHistoryView() {
        this.isHistoryView = !this.isHistoryView;
        const menuGrid = document.getElementById('menuGrid');
        const historySection = document.getElementById('historySection');
        const tabNav = document.querySelector('.tab-nav');
        const historyNavBtn = document.getElementById('historyNavBtn');
        
        if (this.isHistoryView) {
            menuGrid.style.display = 'none';
            historySection.style.display = 'block';
            tabNav.style.display = 'none';
            historyNavBtn.classList.add('active');
            this.renderHistory();
        } else {
            menuGrid.style.display = 'grid';
            historySection.style.display = 'none';
            tabNav.style.display = 'flex';
            historyNavBtn.classList.remove('active');
        }
    }

    getFilteredHistory() {
        let filtered = this.orderHistory;
        
        // Filter by status
        if (this.historyFilter !== 'all') {
            filtered = filtered.filter(order => order.status === this.historyFilter);
        }
        
        // Filter by search
        if (this.historySearch) {
            const searchLower = this.historySearch.toLowerCase();
            filtered = filtered.filter(order => {
                const matchId = order.id.toLowerCase().includes(searchLower);
                const matchItems = order.items.some(item => 
                    item.name.toLowerCase().includes(searchLower)
                );
                return matchId || matchItems;
            });
        }
        
        return filtered;
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        const filteredHistory = this.getFilteredHistory();
        
        if (filteredHistory.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                        <path d="M3 9h18"></path>
                        <path d="M9 21V9"></path>
                    </svg>
                    <h3>Belum Ada Riwayat</h3>
                    <p>Riwayat pesanan Anda akan muncul di sini</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = filteredHistory.map(order => `
            <div class="history-card" onclick="app.showOrderDetail('${order.id}')">
                <div class="history-card-header">
                    <div class="history-order-info">
                        <div class="history-order-id">${order.id}</div>
                        <div class="history-order-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${order.date}
                        </div>
                    </div>
                    <span class="history-status ${order.status}">${order.status}</span>
                </div>
                
                <div class="history-items-preview">
                    ${order.items.slice(0, 3).map(item => `
                        <div class="history-item">
                            <div class="history-item-name">
                                ${item.name}
                                <span class="history-item-qty">x${item.quantity}</span>
                            </div>
                            <span class="history-item-price">${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                    ${order.items.length > 3 ? `
                        <div class="history-item">
                            <div class="history-item-name">
                                +${order.items.length - 3} item lainnya
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="history-card-footer">
                    <div>
                        <span class="history-total">Total:</span>
                        <span class="history-total-amount">${formatCurrency(order.total)}</span>
                    </div>
                    <button class="history-view-detail" onclick="event.stopPropagation(); app.showOrderDetail('${order.id}')">
                        Lihat Detail
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    setHistoryFilter(filter) {
        this.historyFilter = filter;
        this.renderHistory();
    }

    setHistorySearch(term) {
        this.historySearch = term;
        this.renderHistory();
    }

    showOrderDetail(orderId) {
        const order = this.orderHistory.find(o => o.id === orderId);
        if (!order) return;
        
        const orderDetailContent = document.getElementById('orderDetailContent');
        orderDetailContent.innerHTML = `
            <div class="order-detail-header">
                <div>
                    <div class="order-detail-id">${order.id}</div>
                    <div class="history-order-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${order.date}
                    </div>
                </div>
                <span class="history-status ${order.status}">${order.status}</span>
            </div>
            
            <div class="order-detail-items">
                ${order.items.map(item => `
                    <div class="order-detail-item">
                        <div class="order-detail-item-info">
                            <div class="order-detail-item-name">${item.name}</div>
                            <div class="order-detail-item-qty">Jumlah: ${item.quantity}</div>
                        </div>
                        <div class="order-detail-item-price">${formatCurrency(item.price * item.quantity)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-detail-payment">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Metode Pembayaran: ${order.paymentMethod}
            </div>
            
            <div class="order-detail-footer">
                <span>Total Pembayaran:</span>
                <span class="total-amount">${formatCurrency(order.total)}</span>
            </div>
        `;
        
        document.getElementById('orderDetailModal').classList.add('open');
        document.getElementById('modalOverlay').classList.add('open');
    }

    closeOrderDetail() {
        document.getElementById('orderDetailModal').classList.remove('open');
        document.getElementById('modalOverlay').classList.remove('open');
    }
    // [END ADDED]
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
    }).format(amount);
}

// Variable untuk menyimpan timeout ID
let toastTimeout = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) {
        console.error('Toast element not found!');
        return;
    }
    
    // Hapus timeout yang ada jika ada notifikasi sebelumnya
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    
    // Update pesan
    toastMessage.textContent = message;
    
    // Jika notifikasi sedang ditampilkan, sembunyikan dulu
    if (toast.classList.contains('show')) {
        toast.classList.remove('show');
        // Tunggu animasi keluar selesai
        setTimeout(() => {
            toast.classList.add('show');
            toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
                toastTimeout = null;
            }, 3000);
        }, 400);
    } else {
        // Langsung tampilkan notifikasi
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toastTimeout = null;
        }, 3000);
    }
}

// Initialize App
const app = new AppState();

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initial render
    app.renderMenu();
    app.updateCartUI();
    
    // Tab navigation
    document.querySelectorAll('.tab-btn, .nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) {
                // [MODIFIED] Reset history view when switching tabs
                if (app.isHistoryView) {
                    app.toggleHistoryView();
                }
                // [END MODIFIED]
                app.setTab(tab);
            }
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        app.setSearchTerm(this.value);
    });
    
    // Cart functionality
    document.getElementById('cartBtn').addEventListener('click', () => app.openCart());
    document.getElementById('cartNavBtn').addEventListener('click', () => app.openCart());
    document.getElementById('closeCart').addEventListener('click', () => app.closeCart());
    document.getElementById('cartOverlay').addEventListener('click', () => app.closeCart());
    
    // Checkout functionality
    document.getElementById('checkoutBtn').addEventListener('click', () => app.openCheckout());
    document.getElementById('closeModal').addEventListener('click', () => app.closeCheckout());
    document.getElementById('modalOverlay').addEventListener('click', () => {
        app.closeCheckout();
        // [ADDED] Close order detail modal
        app.closeOrderDetail();
        // [END ADDED]
    });
    document.getElementById('payBtn').addEventListener('click', () => app.processPayment());
    
    // Payment method change
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const qrisCode = document.getElementById('qrisCode');
            if (this.value === 'qris') {
                qrisCode.style.display = 'block';
            } else {
                qrisCode.style.display = 'none';
            }
        });
    });
    
    // [ADDED] History functionality
    document.getElementById('historyNavBtn').addEventListener('click', () => {
        app.toggleHistoryView();
    });
    
    document.getElementById('historyStatusFilter').addEventListener('change', function() {
        app.setHistoryFilter(this.value);
    });
    
    document.getElementById('historySearchInput').addEventListener('input', function() {
        app.setHistorySearch(this.value);
    });
    
    document.getElementById('closeOrderDetailModal').addEventListener('click', () => {
        app.closeOrderDetail();
    });
    // [END ADDED]
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape key to close modals
        if (e.key === 'Escape') {
            app.closeCart();
            app.closeCheckout();
            // [ADDED] Close order detail modal
            app.closeOrderDetail();
            // [END ADDED]
        }
        
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });
    
    // Prevent form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    });
});

// Export for global access
window.app = app;
window.showToast = showToast;
window.formatCurrency = formatCurrency;