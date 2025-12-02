// Data Menu
// Data Menu - akan diload dari Firebase
let menuData = [];

// Function untuk load menu dari Firebase
function loadMenuFromFirebase(database) {
    database.ref('menu').on('value', (snapshot) => {
        const data = snapshot.val();
        console.log('📦 Menu data from Firebase:', data);
        
        if (data) {
            // Convert object to array
            menuData = Object.entries(data)
                .map(([key, value]) => ({
                    firebaseKey: key,
                    ...value
                }));
            
            // Load images from localStorage
            const localMenu = localStorage.getItem('kantingenz_menu');
            if (localMenu) {
                const localMenuData = JSON.parse(localMenu);
                const localMenuMap = {};
                
                localMenuData.forEach(item => {
                    if (item.id) {
                        localMenuMap[item.id] = item;
                    }
                });
                
                // Merge imageBase64 from localStorage
                menuData = menuData.map(item => {
                    if (localMenuMap[item.id] && localMenuMap[item.id].imageBase64) {
                        return {
                            ...item,
                            imageBase64: localMenuMap[item.id].imageBase64
                        };
                    }
                    return item;
                });
            }
            
            console.log('✅ Menu loaded:', menuData.length, 'items');
            
            // Re-render menu jika app sudah diinisialisasi
            if (window.app) {
                window.app.renderMenu();
            }
        } else {
            console.log('⚠️ No menu data in Firebase, using default');
            loadDefaultMenu();
        }
    }, (error) => {
        console.error('❌ Error loading menu:', error);
        loadDefaultMenu();
    });
}

// Default menu jika Firebase gagal
function loadDefaultMenu() {
    menuData = [
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
}

// State Management
class AppState {
    constructor() {
        this.cart = [];
        this.currentTab = 'all';
        this.searchTerm = '';
        this.paymentMethod = 'cash';
        this.orderHistory = [];
        this.historyFilter = 'all';
        this.historySearch = '';
        this.isHistoryView = false;

        // Initialize Firebase
        this.initFirebase();

        this.loadFromStorage();
    }

    // Firebase initialization
initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyDbGs_Keddw75h57BuvGsvgSVv_P56CGXs",
        authDomain: "kantingenz.firebaseapp.com",
        databaseURL: "https://kantingenz-default-rtdb.firebaseio.com",
        projectId: "kantingenz",
        storageBucket: "kantingenz.firebasestorage.app",
        messagingSenderId: "120272911912",
        appId: "1:120272911912:web:d6dc29cc3306cc91903f1d",
        measurementId: "G-ZVR4FHJT3J"
    };

    try {
        firebase.initializeApp(firebaseConfig);
        this.database = firebase.database();

        // Load orders from Firebase
        this.loadOrdersFromFirebase();
        
        // 🔥 TAMBAHKAN INI: Load menu from Firebase
        loadMenuFromFirebase(this.database);

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        showToast('Menggunakan penyimpanan lokal.');
        loadDefaultMenu(); // Load default menu jika Firebase gagal
    }
}

    // Load orders from Firebase
    loadOrdersFromFirebase() {
        // Gunakan syntax compat mode
        this.database.ref('orders').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array and sort by timestamp (newest first)
                this.orderHistory = Object.entries(data)
                    .map(([key, value]) => ({ firebaseKey: key, ...value }))
                    .sort((a, b) => b.timestamp - a.timestamp);

                // Save to localStorage as backup
                this.saveHistoryToStorage();

                // Update UI if in history view
                if (this.isHistoryView) {
                    this.renderHistory();
                }

                console.log('✅ Orders loaded from Firebase:', this.orderHistory.length);
            }
        }, (error) => {
            console.error('❌ Error loading orders from Firebase:', error);
            // Load from localStorage as fallback
            const savedHistory = localStorage.getItem('kantingenz_history');
            if (savedHistory) {
                this.orderHistory = JSON.parse(savedHistory);
            }
        });
    }
    loadFromStorage() {
        const savedCart = localStorage.getItem('kantingenz_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }

        // Load order history from localStorage (as backup)
        const savedHistory = localStorage.getItem('kantingenz_history');
        if (savedHistory && this.orderHistory.length === 0) {
            this.orderHistory = JSON.parse(savedHistory);
        }
    }

    saveToStorage() {
        localStorage.setItem('kantingenz_cart', JSON.stringify(this.cart));
    }

    saveHistoryToStorage() {
        localStorage.setItem('kantingenz_history', JSON.stringify(this.orderHistory));
    }

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
        
        // 🔥 PERBAIKAN: Handle berbagai sumber gambar
        let imageSource = '';
        if (item.imageBase64) {
            imageSource = item.imageBase64;
        } else if (item.image) {
            imageSource = item.image;
        } else if (item.imageUrl) {
            imageSource = item.imageUrl;
        } else {
            imageSource = 'image/placeholder.jpg'; // fallback
        }

        return `
        <div class="menu-card ${isInCart ? 'selected' : ''}">
            <div class="menu-image-container">
                <img src="${imageSource}" alt="${item.name}" class="menu-image" onerror="this.src='image/placeholder.jpg'">
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

    // Process payment with Firebase integration
    // Process payment with Firebase integration
    processPayment() {
        const customerNameInput = document.getElementById('customerName');
        const nameError = document.getElementById('nameError');
        const customerName = customerNameInput.value.trim();

        if (!customerName) {
            customerNameInput.classList.add('input-error');
            nameError.style.display = 'flex';

            customerNameInput.style.animation = 'shake 0.3s';
            setTimeout(() => {
                customerNameInput.style.animation = '';
            }, 300);

            return;
        }

        customerNameInput.classList.remove('input-error');
        nameError.style.display = 'none';

        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        this.paymentMethod = paymentMethod;

        const payBtn = document.getElementById('payBtn');
        payBtn.textContent = 'Memproses...';
        payBtn.disabled = true;

        setTimeout(async () => {
            // Hitung order number berdasarkan length saat ini
            const orderNumber = this.orderHistory.length + 1;

            const newOrder = {
                id: 'ORD' + String(orderNumber).padStart(4, '0'),
                customerName: customerName,
                date: new Date().toLocaleString('id-ID', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                timestamp: Date.now(),
                items: [...this.cart],
                total: this.getTotalPrice(),
                status: 'diproses',
                paymentMethod: paymentMethod === 'cash' ? 'Tunai' : 'QRIS'
            };

            try {
                // Save to Firebase dengan compat mode
                await this.database.ref('orders').push(newOrder);

                console.log('✅ Order berhasil disimpan ke Firebase');
                showToast(`Terima kasih ${customerName}! Pembayaran berhasil. Order ID: ${newOrder.id}`);

            } catch (error) {
                console.error('❌ Error menyimpan ke Firebase:', error);

                // Fallback: save to localStorage jika Firebase gagal
                this.orderHistory.unshift(newOrder);
                this.saveHistoryToStorage();

                showToast(`Terima kasih ${customerName}! Pembayaran berhasil (tersimpan lokal). Order ID: ${newOrder.id}`);
            }

            // Reset cart
            this.cart = [];
            this.saveToStorage();
            this.updateCartUI();
            this.renderMenu();
            this.closeCheckout();

            // Reset form
            customerNameInput.value = '';
            document.querySelector('input[name="payment"][value="cash"]').checked = true;
            document.getElementById('qrisCode').style.display = 'none';

            // Reset button
            payBtn.textContent = 'Bayar';
            payBtn.disabled = false;
        }, 2000);
    }
    // History functions
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
                const matchName = order.customerName && order.customerName.toLowerCase().includes(searchLower);
                const matchItems = order.items.some(item =>
                    item.name.toLowerCase().includes(searchLower)
                );
                return matchId || matchName || matchItems;
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
                        ${order.customerName ? `
                            <div style="font-size: 14px; color: #6b7280; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span style="font-weight: 500;">${order.customerName}</span>
                            </div>
                        ` : ''}
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
                    ${order.customerName ? `
                        <div style="font-size: 14px; color: #6b7280; display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span style="font-weight: 600; color: #1f2937;">${order.customerName}</span>
                        </div>
                    ` : ''}
                    <div class="history-order-date" style="margin-top: 6px;">
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
document.addEventListener('DOMContentLoaded', function () {
    // Initial render
    app.renderMenu();
    app.updateCartUI();

    // Tab navigation
    document.querySelectorAll('.tab-btn, .nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            if (tab) {
                // Reset history view when switching tabs
                if (app.isHistoryView) {
                    app.toggleHistoryView();
                }
                app.setTab(tab);
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function () {
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
        app.closeOrderDetail();
    });
    document.getElementById('payBtn').addEventListener('click', () => app.processPayment());

    // Payment method change
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const qrisCode = document.getElementById('qrisCode');
            if (this.value === 'qris') {
                qrisCode.style.display = 'block';
            } else {
                qrisCode.style.display = 'none';
            }
        });
    });

    // Customer name input validation
    document.getElementById('customerName').addEventListener('input', function () {
        if (this.value.trim()) {
            this.classList.remove('input-error');
            document.getElementById('nameError').style.display = 'none';
        }
    });

    // History functionality
    document.getElementById('historyNavBtn').addEventListener('click', () => {
        app.toggleHistoryView();
    });

    document.getElementById('historyStatusFilter').addEventListener('change', function () {
        app.setHistoryFilter(this.value);
    });

    document.getElementById('historySearchInput').addEventListener('input', function () {
        app.setHistorySearch(this.value);
    });

    document.getElementById('closeOrderDetailModal').addEventListener('click', () => {
        app.closeOrderDetail();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Escape key to close modals
        if (e.key === 'Escape') {
            app.closeCart();
            app.closeCheckout();
            app.closeOrderDetail();
        }

        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Prevent form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
        });
    });
});

// Export for global access
window.app = app;
window.showToast = showToast;
window.formatCurrency = formatCurrency;