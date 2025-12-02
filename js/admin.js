// Firebase Configuration - FIXED VERSION
const firebaseConfig = {
    apiKey: "AIzaSyDbGs_Keddw75h57BuvGsvgSVv_P56CGXs",
    authDomain: "kantingenz.firebaseapp.com",
    databaseURL: "https://kantingenz-default-rtdb.firebaseio.com",
    projectId: "kantingenz",
    storageBucket: "kantingenz.appspot.com",
    messagingSenderId: "120272911912",
    appId: "1:120272911912:web:d6dc29cc3306cc91903f1d",
    measurementId: "G-ZVR4FHJT3J"
};



// Initialize Firebase
let database;
let storage;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    }
    database = firebase.database();
    console.log('Database reference created');

    storage = firebase.storage();
    console.log('Storage reference created');
} catch (error) {
    console.error('Firebase initialization error:', error);
    database = null;
    storage = null;
}

// Check Authentication
function checkAuth() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // User is not signed in, redirect to login
            window.location.href = 'login.html';
        } else {
            console.log('User authenticated:', user.email);
            // Update user info in sidebar
            const userName = document.querySelector('.user-name');
            const userEmail = document.querySelector('.user-email');
            if (userName && userEmail) {
                userName.textContent = user.displayName || 'Admin User';
                userEmail.textContent = user.email;
            }
        }
    });
}

// Call checkAuth immediately
checkAuth();

// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.sidebarOpen = true;
        this.isMobile = false;
        this.orders = [];
        this.menu = [];
        this.stats = {
            totalOrders: 0,
            totalRevenue: 0,
            totalMenu: 0,
            totalCustomers: 0
        };

        this.salesChart = null;
        this.isProcessingMenu = false;
        this.ordersRef = null;
        this.menuRef = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkMobile();
        this.initializeData();
        this.renderCurrentPage();
        this.startRealTimeUpdates();

        // Setup menu modal setelah DOM ready
        setTimeout(() => {
            this.setupMenuModal();
        }, 100);
    }

    // Firebase Data Management
    loadOrdersFromFirebase() {
        if (!database) {
            console.error('Database not available, loading from localStorage');
            this.loadOrdersFromStorage();
            return;
        }

        console.log('🔥 Setting up Firebase listener for orders...');

        if (this.ordersRef) {
            this.ordersRef.off();
        }

        this.ordersRef = database.ref('orders');

        this.ordersRef.on('value', (snapshot) => {
            console.log('🔥 Firebase listener triggered!');
            const data = snapshot.val();
            console.log('📦 Raw data from Firebase:', data);

            if (data) {
                const newOrders = Object.entries(data)
                    .map(([key, value]) => ({ firebaseKey: key, ...value }))
                    .sort((a, b) => b.timestamp - a.timestamp);

                // Cek apakah ada perubahan sebelum memperbarui
                if (JSON.stringify(newOrders) !== JSON.stringify(this.orders)) {
                    this.orders = newOrders;
                    console.log('📦 Processed orders:', this.orders);
                    this.updateStats();
                    this.renderCurrentPage();
                    console.log('Orders loaded from Firebase:', this.orders.length);
                }
            } else {
                console.log('📭 No data in Firebase');
                this.orders = [];
                this.updateStats();
                this.renderCurrentPage();
            }
        }, (error) => {
            console.error('❌ Error loading orders from Firebase:', error);
            this.showToast('Gagal memuat pesanan dari database, menggunakan data lokal');
            this.loadOrdersFromStorage();
        });
    }

    loadOrdersFromStorage() {
        try {
            const savedOrders = localStorage.getItem('kantingenz_orders');
            if (savedOrders) {
                this.orders = JSON.parse(savedOrders);
                this.updateStats();
                this.renderCurrentPage();
            }
        } catch (error) {
            console.error('Error loading orders from storage:', error);
        }
    }
    loadMenuFromStorage() {
    try {
        const savedMenu = localStorage.getItem('kantingenz_menu');
        if (savedMenu) {
            return JSON.parse(savedMenu);
        }
    } catch (error) {
        console.error('Error loading menu from storage:', error);
    }
    return null;
}

loadMenuFromFirebase() {
    if (!database) {
        console.error('Database not available, loading default menu');
        this.loadDefaultMenu();
        this.updateStats();
        this.renderCurrentPage();
        return;
    }

    console.log('🔥 Setting up Firebase listener for menu...');

    if (this.menuRef) {
        this.menuRef.off();
    }

    this.menuRef = database.ref('menu');

    this.menuRef.on('value', (snapshot) => {
        console.log('🔥 Menu listener triggered!');
        const data = snapshot.val();
        console.log('🍔 Raw menu data from Firebase:', data);

        if (data) {
            // Load dari localStorage untuk mendapatkan imageBase64
            const localMenu = this.loadMenuFromStorage();
            const localMenuMap = {};
            
            if (localMenu) {
                localMenu.forEach(item => {
                    if (item.id) {
                        localMenuMap[item.id] = item;
                    }
                });
            }

            const newMenu = Object.entries(data)
                .map(([key, value]) => {
                    const menuItem = { firebaseKey: key, ...value };
                    
                    // Ambil imageBase64 dari localStorage jika ada
                    if (localMenuMap[menuItem.id] && localMenuMap[menuItem.id].imageBase64) {
                        menuItem.imageBase64 = localMenuMap[menuItem.id].imageBase64;
                    }
                    
                    return menuItem;
                });

            // Cek apakah ada perubahan sebelum memperbarui
            if (JSON.stringify(newMenu) !== JSON.stringify(this.menu)) {
                this.menu = newMenu;
                console.log('🍔 Processed menu:', this.menu);
                this.updateStats();
                this.renderCurrentPage();
                console.log('Menu loaded from Firebase:', this.menu.length);
            }
        } else {
            console.log('📭 No menu data in Firebase, loading default menu');
            this.loadDefaultMenu();
            this.saveMenuToFirebase();
        }
    }, (error) => {
        console.error('❌ Error loading menu from Firebase:', error);
        this.showToast('Gagal memuat menu dari database, menggunakan menu default');
        this.loadDefaultMenu();
        this.updateStats();
        this.renderCurrentPage();
    });
}

    saveOrderToFirebase(order) {
        if (!database) {
            console.error('Database not available, saving to localStorage');
            this.saveOrdersToStorage();
            return Promise.resolve();
        }

        if (order.firebaseKey) {
            return database.ref('orders/' + order.firebaseKey).update(order);
        } else {
            return database.ref('orders').push(order);
        }
    }

    saveOrdersToStorage() {
        try {
            localStorage.setItem('kantingenz_orders', JSON.stringify(this.orders));
        } catch (error) {
            console.error('Error saving orders to storage:', error);
        }
    }

    saveMenuToFirebase() {
        if (!database) {
            console.error('Database not available, saving to localStorage');
            this.saveMenuToStorage();
            return Promise.resolve();
        }

        // Create a copy of menu without base64 images to save to Firebase
        const menuToSave = this.menu.map(item => {
            const itemCopy = { ...item };
            // Remove base64 image data to save storage space
            if (itemCopy.imageBase64) {
                delete itemCopy.imageBase64;
            }
            return itemCopy;
        });

        const menuObject = {};
        menuToSave.forEach(item => {
            if (item.firebaseKey) {
                menuObject[item.firebaseKey] = item;
            } else {
                menuObject[item.id] = item;
            }
        });

        return database.ref('menu').set(menuObject);
    }

    saveMenuToStorage() {
        try {
            localStorage.setItem('kantingenz_menu', JSON.stringify(this.menu));
        } catch (error) {
            console.error('Error saving menu to storage:', error);
        }
    }

    deleteMenuFromFirebase(menuId) {
        if (!database) {
            console.error('Database not available');
            return Promise.resolve();
        }

        const menuItem = this.menu.find(item => item.id === menuId);
        if (menuItem && menuItem.firebaseKey) {
            return database.ref('menu/' + menuItem.firebaseKey).remove();
        }
        return Promise.resolve();
    }

    // FIXED: Fungsi saveNewMenuToFirebase yang diperbaiki
  async saveNewMenuToFirebase(menuData) {
    if (!database) {
        throw new Error('Database tidak tersedia');
    }

    // Nonaktifkan sementara listener untuk mencegah duplikasi
    if (this.menuRef) {
        this.menuRef.off();
    }

    try {
        const newMenuRef = database.ref('menu').push();
        menuData.firebaseKey = newMenuRef.key;

        // Simpan imageBase64 ke variabel sementara
        const imageBase64 = menuData.imageBase64;

        // Create a copy without base64 image to save to Firebase
        const menuDataToSave = { ...menuData };
        if (menuDataToSave.imageBase64) {
            delete menuDataToSave.imageBase64;
        }

        await newMenuRef.set(menuDataToSave);

        // Kembalikan imageBase64 ke menuData
        if (imageBase64) {
            menuData.imageBase64 = imageBase64;
        }

        // Add the full menu data with image to local array
        this.menu.push(menuData);

        // Save to localStorage to persist images - PENTING!
        this.saveMenuToStorage();

        console.log('✅ Menu saved successfully with image');

        // Aktifkan kembali listener
        this.loadMenuFromFirebase();
        
        this.showToast('Menu berhasil ditambahkan!');
    } catch (error) {
        console.error('Error saving menu:', error);
        this.showToast('Gagal menambahkan menu: ' + error.message);
        
        // Aktifkan kembali listener jika terjadi error
        this.loadMenuFromFirebase();
        throw error;
    }
}
    // FIXED: Function to convert image to base64 instead of uploading to Firebase Storage
    async convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = error => {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    // Mobile Detection
    checkMobile() {
        this.isMobile = window.innerWidth < 1024;
        if (this.isMobile) {
            this.sidebarOpen = false;
        } else {
            this.sidebarOpen = true;
        }
        this.updateSidebarState();
    }

    // Event Listeners
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.checkMobile();
        });

        const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileCloseBtn = document.getElementById('mobileCloseBtn');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.openMobileSidebar();
            });
        }

        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.showPage(page);
            });
        });

        this.setupDropdowns();

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch(e.target.value);
                }
            });
        }

        const orderStatusFilter = document.getElementById('orderStatusFilter');
        if (orderStatusFilter) {
            orderStatusFilter.addEventListener('change', () => {
                this.renderOrders();
            });
        }

        const menuCategoryFilter = document.getElementById('menuCategoryFilter');
        if (menuCategoryFilter) {
            menuCategoryFilter.addEventListener('change', () => {
                this.renderMenu();
            });
        }

        this.setupForms();

        // Setup logout buttons
        document.querySelectorAll('.user-logout, .dropdown-item.logout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });

        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
    }

    setupDropdowns() {
        const dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');

        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const dropdownType = toggle.dataset.dropdownToggle;
                this.toggleDropdown(dropdownType);
            });
        });
    }

    setupForms() {
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
    }

    setupMenuModal() {
        const addMenuBtn = document.querySelector('#menuPage .page-header .btn-primary');
        if (addMenuBtn) {
            addMenuBtn.onclick = (e) => {
                e.preventDefault();
                this.showAddMenuModal();
            };
        }
    }

    showAddMenuModal() {
        if (this.isProcessingMenu || document.getElementById('addMenuModal')) {
            console.log('Modal already exists or processing, skipping...');
            return;
        }

        const modalHtml = `
            <div class="menu-modal-overlay" onclick="dashboard.closeMenuModal(event)">
                <div class="menu-modal" onclick="event.stopPropagation()">
                    <div class="menu-modal-header">
                        <h3>Tambah Menu Baru</h3>
                        <button class="close-btn" onclick="dashboard.closeMenuModal(event)">×</button>
                    </div>
                    <form id="addMenuForm" class="menu-modal-body">
                        <div class="form-section">
                            <div class="image-upload-section">
                                <label>Gambar Menu</label>
                                <div class="image-upload-area" id="imageUploadArea">
                                    <div class="upload-placeholder">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                        </svg>
                                        <p>Klik atau drag gambar ke sini</p>
                                        <span>Format: JPG, PNG (Max 5MB)</span>
                                    </div>
                                    <img id="imagePreview" class="image-preview" style="display: none;">
                                    <input type="file" id="menuImage" accept="image/*" style="display: none;">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nama Menu <span class="required">*</span></label>
                                    <input type="text" id="menuName" required placeholder="Contoh: Nasi Goreng Spesial">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Kategori <span class="required">*</span></label>
                                    <select id="menuCategory" required>
                                        <option value="">Pilih Kategori</option>
                                        <option value="makanan">Makanan</option>
                                        <option value="minuman">Minuman</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Harga (Rp) <span class="required">*</span></label>
                                    <input type="number" id="menuPrice" required placeholder="25000" min="0">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Deskripsi <span class="required">*</span></label>
                                <textarea id="menuDescription" required rows="3" placeholder="Deskripsi menu..."></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Waktu Persiapan <span class="required">*</span></label>
                                    <input type="text" id="menuPrepTime" required placeholder="15 menit">
                                </div>
                                <div class="form-group">
                                    <label>Rating</label>
                                    <input type="number" id="menuRating" step="0.1" min="0" max="5" placeholder="4.5">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Diskon (%)</label>
                                    <input type="number" id="menuDiscount" step="1" min="0" max="100" placeholder="0">
                                </div>
                                <div class="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" id="menuIsPopular">
                                        <span>Menu Populer</span>
                                    </label>
                                </div>
                            </div>

                            <div class="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" id="menuIsSelected">
                                    <span>Menu Terpilih</span>
                                </label>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="dashboard.closeMenuModal(event)">Batal</button>
                            <button type="submit" class="btn-primary" id="submitMenuBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Simpan Menu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        modalContainer.id = 'addMenuModal';
        document.body.appendChild(modalContainer);

        this.setupImageUpload();
        this.setupAddMenuForm();
        this.injectMenuModalStyles();
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const fileInput = document.getElementById('menuImage');
        const imagePreview = document.getElementById('imagePreview');

        // FIXED: Prevent event propagation to avoid closing modal when clicking upload area
        uploadArea.onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    this.showToast('Ukuran gambar maksimal 5MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    uploadArea.querySelector('.upload-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };

        // Drag and drop
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('drag-over');
        };

        uploadArea.ondragleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
        };

        uploadArea.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        };
    }

    // FIXED: setupAddMenuForm yang diperbaiki
    setupAddMenuForm() {
        const form = document.getElementById('addMenuForm');
        const submitBtn = document.getElementById('submitMenuBtn');

        form.onsubmit = async (e) => {
            e.preventDefault();

            if (this.isProcessingMenu) {
                console.log('Already processing menu, skipping...');
                return;
            }

            this.isProcessingMenu = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Menyimpan...
            `;

            try {
                const menuData = {
                    id: Date.now(),
                    name: document.getElementById('menuName').value,
                    category: document.getElementById('menuCategory').value,
                    price: parseInt(document.getElementById('menuPrice').value),
                    description: document.getElementById('menuDescription').value,
                    prepTime: document.getElementById('menuPrepTime').value,
                    rating: parseFloat(document.getElementById('menuRating').value) || 4.5,
                    discount: parseInt(document.getElementById('menuDiscount').value) || 0,
                    isPopular: document.getElementById('menuIsPopular').checked,
                    isSelected: document.getElementById('menuIsSelected').checked,
                    status: 'available',
                    timestamp: Date.now()
                };

                // Convert image to base64 if exists
                const fileInput = document.getElementById('menuImage');
                if (fileInput.files[0]) {
                    menuData.imageBase64 = await this.convertImageToBase64(fileInput.files[0]);
                }

                // PERBAIKAN: Hanya simpan ke Firebase, biarkan listener yang update array lokal
                await this.saveNewMenuToFirebase(menuData);

                // Tidak perlu memanggil render di sini karena listener akan melakukannya
                this.closeMenuModal(event);
                this.showPage('menu');
            } catch (error) {
                console.error('Error adding menu:', error);
                this.showToast('Gagal menambahkan menu: ' + error.message);
            } finally {
                this.isProcessingMenu = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Simpan Menu
                `;
            }
        };
    }

    closeMenuModal(event) {
        if (event) {
            event.stopPropagation();
        }
        const modal = document.getElementById('addMenuModal');
        if (modal) {
            modal.remove();
        }
        this.isProcessingMenu = false;
    }

    injectMenuModalStyles() {
        if (document.getElementById('menuModalStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'menuModalStyles';
        styles.textContent = `
            .menu-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 9999 !important;
                animation: fadeIn 0.2s ease;
            }

            .menu-modal {
                background: #ffffff !important;
                border-radius: 12px !important;
                width: 90% !important;
                max-width: 700px !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                animation: slideUp 0.3s ease;
                position: relative !important;
                margin: 0 !important;
                transform: none !important;
                border: 1px solid #e5e7eb !important;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { 
                    transform: translateY(20px) !important; 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) !important; 
                    opacity: 1; 
                }
            }

            .menu-modal-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 24px !important;
                border-bottom: 1px solid #e5e7eb !important;
                position: sticky !important;
                top: 0 !important;
                background: #ffffff !important;
                z-index: 10 !important;
                border-radius: 12px 12px 0 0 !important;
            }

            .menu-modal-header h3 {
                margin: 0 !important;
                font-size: 1.5rem !important;
                font-weight: 600 !important;
                color: #374151 !important;
            }

            .close-btn {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                color: #6b7280 !important;
                width: 32px !important;
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 6px !important;
                transition: all 0.2s !important;
            }

            .close-btn:hover {
                background: #f3f4f6 !important;
                color: #374151 !important;
            }

            .menu-modal-body {
                padding: 24px !important;
            }

            .form-section {
                display: flex !important;
                flex-direction: column !important;
                gap: 20px !important;
            }

            .image-upload-section {
                margin-bottom: 8px !important;
            }

            .image-upload-section label {
                display: block !important;
                margin-bottom: 8px !important;
                font-weight: 500 !important;
                color: #374151 !important;
            }

            .image-upload-area {
                border: 2px dashed #d1d5db !important;
                border-radius: 8px !important;
                padding: 32px !important;
                text-align: center !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                position: relative !important;
                min-height: 200px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #f9fafb !important;
            }

            .image-upload-area:hover {
                border-color: #3b82f6 !important;
                background: #eff6ff !important;
            }

            .image-upload-area.drag-over {
                border-color: #3b82f6 !important;
                background: #dbeafe !important;
            }

            .upload-placeholder {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .upload-placeholder svg {
                color: #9ca3af !important;
            }

            .upload-placeholder p {
                margin: 0 !important;
                font-weight: 500 !important;
                color: #374151 !important;
            }

            .upload-placeholder span {
                font-size: 0.875rem !important;
                color: #6b7280 !important;
            }

            .image-preview {
                max-width: 100% !important;
                max-height: 300px !important;
                border-radius: 8px !important;
                object-fit: contain !important;
            }

            .form-row {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 16px !important;
            }

            .form-group {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
            }

            .form-group label {
                font-size: 0.875rem !important;
                font-weight: 500 !important;
                color: #374151 !important;
            }

            .required {
                color: #ef4444 !important;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                padding: 10px 12px !important;
                border: 1px solid #d1d5db !important;
                border-radius: 6px !important;
                font-size: 0.875rem !important;
                transition: all 0.2s !important;
                background: #ffffff !important;
                color: #374151 !important;
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none !important;
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            }

            .form-group textarea {
                resize: vertical !important;
                font-family: inherit !important;
            }

            .checkbox-group label {
                flex-direction: row !important;
                align-items: center !important;
                gap: 8px !important;
                cursor: pointer !important;
            }

            .checkbox-group input[type="checkbox"] {
                width: 18px !important;
                height: 18px !important;
                cursor: pointer !important;
            }

            .modal-footer {
                display: flex !important;
                justify-content: flex-end !important;
                gap: 12px !important;
                padding: 20px 24px !important;
                border-top: 1px solid #e5e7eb !important;
                position: sticky !important;
                bottom: 0 !important;
                background: #ffffff !important;
                border-radius: 0 0 12px 12px !important;
            }

            .spinner {
                animation: spin 1s linear infinite !important;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .menu-modal {
                    width: 95% !important;
                    max-height: 95vh !important;
                    margin: 20px !important;
                }

                .form-row {
                    grid-template-columns: 1fr !important;
                }

                .menu-modal-body {
                    padding: 16px !important;
                }
            }

            .menu-modal-overlay * {
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(styles);
    }

    // Tambahan fungsi yang diperlukan
    handleOutsideClick(e) {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        const toggles = document.querySelectorAll('[data-dropdown-toggle]');

        let clickedOutside = true;

        toggles.forEach(toggle => {
            if (toggle.contains(e.target)) {
                clickedOutside = false;
            }
        });

        if (clickedOutside) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });

            toggles.forEach(toggle => {
                toggle.classList.remove('active');
            });
        }
    }

handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        const auth = firebase.auth();
        auth.signOut().then(() => {
            this.showToast('Berhasil logout');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }).catch((error) => {
            console.error('Logout error:', error);
            this.showToast('Gagal logout');
        });
    }
}

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.updateSidebarState();
    }

    openMobileSidebar() {
        this.sidebarOpen = true;
        this.updateSidebarState();
    }

    closeMobileSidebar() {
        this.sidebarOpen = false;
        this.updateSidebarState();
    }

    updateSidebarState() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (sidebar) {
            if (this.isMobile) {
                if (this.sidebarOpen) {
                    sidebar.classList.add('active');
                    mobileOverlay.classList.add('active');
                } else {
                    sidebar.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                }
            } else {
                if (this.sidebarOpen) {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('expanded');
                } else {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('expanded');
                }
            }
        }
    }

    toggleDropdown(type) {
        const dropdownMenus = {
            'notifications': 'notificationsMenu',
            'user': 'userMenu'
        };

        const dropdown = document.getElementById(dropdownMenus[type]);
        const toggle = document.querySelector(`[data-dropdown-toggle="${type}"]`);

        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu !== dropdown) {
                menu.classList.remove('show');
            }
        });

        document.querySelectorAll('[data-dropdown-toggle]').forEach(btn => {
            if (btn !== toggle) {
                btn.classList.remove('active');
            }
        });

        if (dropdown && toggle) {
            dropdown.classList.toggle('show');
            toggle.classList.toggle('active');
        }
    }

    showPage(page) {
        console.log('🔄 Navigating to page:', page);

        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-page="${page}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentPage = page;
        this.renderCurrentPage();

        if (this.isMobile) {
            this.closeMobileSidebar();
        }
    }

    renderCurrentPage() {
        console.log('🖼️ Rendering current page:', this.currentPage);

        switch (this.currentPage) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'orders':
                this.renderOrders();
                break;
            case 'menu':
                this.renderMenu();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    initializeData() {
        console.log('🔥 Initializing data from Firebase...');
        this.loadOrdersFromFirebase();
        this.loadMenuFromFirebase();
    }

    // UPDATED: loadDefaultMenu dengan menu baru
    loadDefaultMenu() {
        this.menu = [
            {
                id: 1,
                name: 'Gorengan',
                category: 'makanan',
                price: 1000,
                discount: 0,
                image: 'image/Gorengan.jpg',
                isSelected: false,
                rating: 4.6,
                prepTime: '10 menit',
                emoji: '🍟',
                isPopular: false,
                status: 'available'
            },
            {
                id: 2,
                name: 'Cireng ayam Suwir',
                category: 'makanan',
                price: 1000,
                discount: 0,
                image: 'image/Cireng.jpg',
                isSelected: false,
                rating: 4.6,
                prepTime: '10 menit',
                emoji: '🍟',
                isPopular: false,
                status: 'available'
            },
            {
                id: 3,
                name: 'Risol Mayo',
                category: 'makanan',
                price: 3000,
                discount: 0,
                image: 'image/Risol.jpg',
                isSelected: false,
                rating: 4.5,
                prepTime: '15 menit',
                emoji: '🥟',
                isPopular: false,
                status: 'available'
            },
            {
                id: 4,
                name: 'Pop Mie',
                category: 'makanan',
                price: 6000,
                discount: 0,
                image: 'image/Pop Mie.jpg',
                isSelected: false,
                rating: 4.3,
                prepTime: '5 menit',
                emoji: '🍜',
                isPopular: false,
                status: 'available'
            },
            {
                id: 5,
                name: 'Soto',
                category: 'makanan',
                price: 5000,
                discount: 0,
                image: 'image/Soto.jpg',
                isSelected: false,
                rating: 4.7,
                prepTime: '15 menit',
                emoji: '🍲',
                isPopular: false,
                status: 'available'
            },
            {
                id: 6,
                name: 'Ayam Geprek',
                category: 'makanan',
                price: 10000,
                discount: 0,
                image: 'image/Geprek.jpg',
                isSelected: false,
                rating: 4.8,
                prepTime: '20 menit',
                emoji: '🍗',
                isPopular: true,
                status: 'available'
            },
            {
                id: 7,
                name: 'Pop Ice',
                category: 'minuman',
                price: 3000,
                discount: 0,
                image: 'image/Pop Ice.jpg',
                isSelected: false,
                rating: 4.4,
                prepTime: '5 menit',
                emoji: '🧊',
                isPopular: false,
                status: 'available'
            },
            {
                id: 8,
                name: 'Es Teh',
                category: 'minuman',
                price: 3000,
                discount: 0,
                image: 'image/Es Teh.jpg',
                isSelected: false,
                rating: 4.5,
                prepTime: '5 menit',
                emoji: '🧋',
                isPopular: true,
                status: 'available'
            },
            {
                id: 9,
                name: 'Es Jeruk',
                category: 'minuman',
                price: 4000,
                discount: 0,
                image: 'image/Es Jeruk.jpg',
                isSelected: false,
                rating: 4.6,
                prepTime: '5 menit',
                emoji: '🍊',
                isPopular: false,
                status: 'available'
            },
            {
                id: 10,
                name: 'Air Mineral',
                category: 'minuman',
                price: 3000,
                discount: 0,
                image: 'image/Air Mineral.jpg',
                isSelected: false,
                rating: 4.2,
                prepTime: '2 menit',
                emoji: '💧',
                isPopular: false,
                status: 'available'
            },
            {
                id: 11,
                name: 'Es Drink Beng Beng',
                category: 'minuman',
                price: 4000,
                discount: 0,
                image: 'image/Drink.jpg',
                isSelected: false,
                rating: 4.3,
                prepTime: '5 menit',
                emoji: '🥤',
                isPopular: false,
                status: 'available'
            }
        ];
    }

    updateStats() {
        this.stats.totalOrders = this.orders.length;
        this.stats.totalRevenue = this.orders.reduce((total, order) => total + order.total, 0);
        this.stats.totalMenu = this.menu.length;
        this.stats.totalCustomers = new Set(this.orders.map(order => order.customerPhone)).size;

        this.updateBadges();
    }

    updateBadges() {
        const ordersBadge = document.getElementById('ordersBadge');
        const MenungguOrders = this.orders.filter(order => order.status === 'Menunggu').length;

        if (ordersBadge) {
            if (MenungguOrders > 0) {
                ordersBadge.textContent = MenungguOrders;
                ordersBadge.style.display = 'block';
            } else {
                ordersBadge.style.display = 'none';
            }
        }

        const notificationDot = document.querySelector('.notification-dot');
        if (notificationDot) {
            if (MenungguOrders > 0) {
                notificationDot.style.display = 'block';
            } else {
                notificationDot.style.display = 'none';
            }
        }
    }

    renderDashboard() {
        console.log('🖼️ Rendering dashboard');
        this.updateStatCards();
        this.renderRecentOrders();
        this.setupQuickActions();
    }

    setupQuickActions() {
        const actionButtons = document.querySelectorAll('.action-btn');

        if (actionButtons.length >= 1) {
            actionButtons[0].onclick = (e) => {
                e.preventDefault();
                this.showPage('menu');
                this.showToast('Silakan buat pesanan baru');
            };
        }

        if (actionButtons.length >= 2) {
            actionButtons[1].onclick = (e) => {
                e.preventDefault();
                this.showPage('menu');
            };
        }

        if (actionButtons.length >= 3) {
            actionButtons[2].onclick = (e) => {
                e.preventDefault();
                this.showPage('analytics');
            };
        }

        if (actionButtons.length >= 4) {
            actionButtons[3].onclick = (e) => {
                e.preventDefault();
                this.showPage('settings');
            };
        }
    }

    updateStatCards() {
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length >= 4) {
            statValues[0].textContent = this.stats.totalOrders;
            statValues[1].textContent = this.formatCurrency(this.stats.totalRevenue);
            statValues[2].textContent = this.stats.totalMenu;
            statValues[3].textContent = this.stats.totalCustomers;
        }
    }

    renderRecentOrders() {
        const recentOrdersContainer = document.querySelector('.recent-orders');
        if (!recentOrdersContainer) return;

        const recentOrders = this.orders.slice(0, 3);

        if (recentOrders.length === 0) {
            recentOrdersContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>Belum ada pesanan</p>
                </div>
            `;
        } else {
            recentOrdersContainer.innerHTML = recentOrders.map(order => `
                <div class="recent-order-item">
                    <div class="recent-order-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                    <div class="recent-order-info">
                        <div class="recent-order-id">${order.id}</div>
                        <div class="recent-order-customer">${order.customerName}</div>
                    </div>
                    <div class="recent-order-amount">${this.formatCurrency(order.total)}</div>
                    <span class="recent-order-status ${order.status}">${this.getStatusText(order.status)}</span>
                </div>
            `).join('');

            const viewAllBtn = document.querySelector('.btn-link');
            if (viewAllBtn && viewAllBtn.textContent.includes('Lihat Semua')) {
                viewAllBtn.onclick = (e) => {
                    e.preventDefault();
                    this.showPage('orders');
                };
            }
        }
    }

    renderOrders() {
        console.log('🖼️ Rendering orders page. Current orders:', this.orders.length);

        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        console.log('🔍 Filter status:', statusFilter);

        let filteredOrders = this.orders;

        if (statusFilter !== 'all') {
            filteredOrders = this.orders.filter(order => order.status === statusFilter);
        }

        console.log('✅ Filtered orders:', filteredOrders.length);

        const tbody = document.querySelector('.orders-table tbody');
        if (!tbody) {
            console.error('❌ Table body element not found');
            return;
        }

        if (filteredOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                        Tidak ada pesanan yang cocok dengan filter
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filteredOrders.map(order => `
                <tr>
                    <td>
                        <div class="order-id">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            ${order.id}
                        </div>
                    </td>
                    <td>
                        <div class="customer-info">
                            <div class="customer-name">${order.customerName}</div>
                            <div class="customer-phone">${order.customerPhone || '-'}</div>
                        </div>
                    </td>
                    <td>${order.items.length} item</td>
                    <td class="amount">${this.formatCurrency(order.total)}</td>
                    <td><span class="payment-method ${order.paymentMethod}">${this.getPaymentMethodText(order.paymentMethod)}</span></td>
                    <td>
                        <select class="status-select ${order.status}" onchange="dashboard.updateOrderStatus('${order.id}', this.value)">
                            <option value="Menunggu" ${order.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                            <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
                            <option value="Siap Diambil" ${order.status === 'Siap Diambil' ? 'selected' : ''}>Siap Diambil</option>
                            <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                        </select>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="dashboard.showOrderDetail('${order.id}')" title="Detail">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    getPaymentMethodText(method) {
        const methodMap = {
            'cash': 'Tunai',
            'tunai': 'Tunai',
            'qris': 'QRIS',
            'QRIS': 'QRIS'
        };
        return methodMap[method] || method;
    }

    renderMenu() {
        console.log('🖼️ Rendering menu page. Current menu:', this.menu.length);

        const categoryFilter = document.getElementById('menuCategoryFilter')?.value || 'all';
        console.log('🔍 Filter category:', categoryFilter);

        let filteredMenu = this.menu;

        if (categoryFilter !== 'all') {
            filteredMenu = this.menu.filter(item => item.category === categoryFilter);
        }

        console.log('✅ Filtered menu:', filteredMenu.length);

        const menuGrid = document.querySelector('.menu-grid');
        if (!menuGrid) {
            console.error('❌ Menu grid element not found');
            return;
        }

        if (filteredMenu.length === 0) {
            menuGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                        <path d="M2 17L12 22L22 17"></path>
                        <path d="M2 12L12 17L22 12"></path>
                    </svg>
                    <p>Tidak ada menu yang cocok dengan filter</p>
                </div>
            `;
        } else {
            menuGrid.innerHTML = filteredMenu.map(item => `
                <div class="menu-card">
                    ${item.imageBase64 ? `
                        <div class="menu-image-container">
                            <img src="${item.imageBase64}" alt="${item.name}" class="menu-image">
                        </div>
                    ` : ''}
                    ${item.image ? `
                        <div class="menu-image-container">
                            <img src="${item.image}" alt="${item.name}" class="menu-image" onerror="this.parentElement.style.display='none'">
                        </div>
                    ` : ''}
                    ${item.imageUrl ? `
                        <div class="menu-image-container">
                            <img src="${item.imageUrl}" alt="${item.name}" class="menu-image" onerror="this.parentElement.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="menu-header">
                        ${item.emoji ? `<div class="menu-emoji">${item.emoji}</div>` : ''}
                        <div class="menu-info">
                            <h3>${item.name}</h3>
                            <span class="menu-category">${item.category}</span>
                        </div>
                        <div class="menu-rating">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            ${item.rating}
                        </div>
                    </div>
                    <div class="menu-body">
                        ${item.description ? `<p class="menu-description">${item.description}</p>` : ''}
                        <div class="menu-meta">
                            <div class="menu-price">
                                ${item.discount > 0 ? `
                                    <span class="original-price">${this.formatCurrency(item.price)}</span>
                                    <span class="discounted-price">${this.formatCurrency(item.price - (item.price * item.discount / 100))}</span>
                                ` : `
                                    <span>${this.formatCurrency(item.price)}</span>
                                `}
                            </div>
                            <div class="menu-time">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${item.prepTime}
                            </div>
                        </div>
                        ${item.discount > 0 ? `
                            <div class="menu-discount">
                                <span class="discount-badge">${item.discount}% OFF</span>
                            </div>
                        ` : ''}
                        ${item.isSelected ? `
                            <div class="menu-selected">
                                <span class="selected-badge">Terpilih</span>
                            </div>
                        ` : ''}
                        <div class="menu-actions">
                            <button class="btn-secondary btn-sm" onclick="dashboard.editMenu(${item.id})">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="dashboard.toggleMenuStatus(${item.id})">
                                ${item.status === 'available' ? 'Nonaktif' : 'Aktif'}
                            </button>
                            <button class="btn-secondary btn-sm" onclick="dashboard.deleteMenu(${item.id})">Hapus</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    renderAnalytics() {
        console.log('🖼️ Rendering analytics page');

        const topMenuContainer = document.querySelector('.top-menu-list');
        if (topMenuContainer) {
            const topMenu = this.getTopMenu();
            topMenuContainer.innerHTML = topMenu.map((item, index) => `
                <div class="top-menu-item">
                    <div class="top-menu-rank">${index + 1}</div>
                    <div class="top-menu-name">${item.name}</div>
                    <div class="top-menu-sales">${item.sales}x</div>
                </div>
            `).join('');
        }

        this.updateSalesChart();
    }

    renderSettings() {
        console.log('🖼️ Rendering settings page');
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const oldStatus = order.status;
            order.status = newStatus;

            this.saveOrderToFirebase(order)
                .then(() => {
                    this.showToast(`Status pesanan ${orderId} diubah dari ${this.getStatusText(oldStatus)} ke ${this.getStatusText(newStatus)}`);
                    this.updateBadges();
                    this.updateStats();
                })
                .catch(error => {
                    console.error('Error updating order status:', error);
                    this.showToast('Gagal memperbarui status pesanan');
                    order.status = oldStatus;
                    this.renderOrders();
                });
        }
    }

    showOrderDetail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const modalHtml = `
                <div class="order-modal-overlay" onclick="dashboard.closeOrderDetail(event)">
                    <div class="order-modal" onclick="event.stopPropagation()">
                        <div class="order-modal-header">
                            <h3>Detail Pesanan</h3>
                            <button class="close-btn" onclick="dashboard.closeOrderDetail(event)">×</button>
                        </div>
                        <div class="order-modal-body">
                            <div class="order-info-section">
                                <h4>Informasi Pesanan</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>ID Pesanan:</label>
                                        <span>${order.id}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Status:</label>
                                        <span class="status-badge ${order.status}">${this.getStatusText(order.status)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Pelanggan:</label>
                                        <span>${order.customerName}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Telepon:</label>
                                        <span>${order.customerPhone || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="order-items-section">
                                <h4>Detail Item</h4>
                                <div class="items-list">
                                    ${order.items.map(item => `
                                        <div class="item-row">
                                            <div class="item-info">
                                                <div class="item-name">${item.name}</div>
                                                <div class="item-details">${item.quantity} × ${this.formatCurrency(item.price)}</div>
                                            </div>
                                            <div class="item-total">${this.formatCurrency(item.quantity * item.price)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="order-summary-section">
                                <h4>Ringkasan Pembayaran</h4>
                                <div class="summary-row">
                                    <span>Subtotal:</span>
                                    <span>${this.formatCurrency(order.total)}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Metode Pembayaran:</span>
                                    <span>${this.getPaymentMethodText(order.paymentMethod)}</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Total:</span>
                                    <span>${this.formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            modalContainer.id = 'orderDetailModal';
            document.body.appendChild(modalContainer);

            if (!document.getElementById('orderModalStyles')) {
                const styles = document.createElement('style');
                styles.id = 'orderModalStyles';
                styles.textContent = `
                    .order-modal-overlay {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: rgba(0, 0, 0, 0.5) !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        z-index: 9999 !important;
                        animation: fadeIn 0.2s ease;
                    }
                    .order-modal {
                        background: #ffffff !important;
                        border-radius: 12px !important;
                        width: 90% !important;
                        max-width: 600px !important;
                        max-height: 90vh !important;
                        overflow-y: auto !important;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                        animation: slideUp 0.3s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .order-modal-header {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        padding: 20px !important;
                        border-bottom: 1px solid #e5e7eb !important;
                    }
                    .order-modal-header h3 {
                        margin: 0 !important;
                        font-size: 1.25rem !important;
                        font-weight: 600 !important;
                    }
                    .close-btn {
                        background: none !important;
                        border: none !important;
                        font-size: 1.5rem !important;
                        cursor: pointer !important;
                        color: #6b7280 !important;
                        width: 32px !important;
                        height: 32px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 6px !important;
                        transition: all 0.2s !important;
                    }
                    .close-btn:hover {
                        background: #f3f4f6 !important;
                        color: #374151 !important;
                    }
                    .order-modal-body {
                        padding: 20px !important;
                    }
                    .order-info-section, .order-items-section, .order-summary-section {
                        margin-bottom: 24px !important;
                    }
                    .order-info-section h4, .order-items-section h4, .order-summary-section h4 {
                        margin: 0 0 16px 0 !important;
                        font-size: 1rem !important;
                        font-weight: 600 !important;
                    }
                    .info-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 12px !important;
                    }
                    .info-item {
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .info-item label {
                        font-size: 0.875rem !important;
                        color: #6b7280 !important;
                        margin-bottom: 4px !important;
                    }
                    .info-item span {
                        font-weight: 500 !important;
                    }
                    .items-list {
                        border: 1px solid #e5e7eb !important;
                        border-radius: 8px !important;
                        overflow: hidden !important;
                    }
                    .item-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        padding: 12px 16px !important;
                        border-bottom: 1px solid #e5e7eb !important;
                    }
                    .item-row:last-child {
                        border-bottom: none !important;
                    }
                    .item-name {
                        font-weight: 500 !important;
                        margin-bottom: 4px !important;
                    }
                    .item-details {
                        font-size: 0.875rem !important;
                        color: #6b7280 !important;
                    }
                    .item-total {
                        font-weight: 600 !important;
                    }
                    .summary-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        padding: 8px 0 !important;
                    }
                    .summary-row.total {
                        border-top: 2px solid #e5e7eb !important;
                        margin-top: 8px !important;
                        padding-top: 16px !important;
                        font-weight: 600 !important;
                        font-size: 1.125rem !important;
                        color: #3b82f6 !important;
                    }
                `;
                document.head.appendChild(styles);
            }
        }
    }

    closeOrderDetail(event) {
        if (event) {
            event.stopPropagation();
        }
        const modal = document.getElementById('orderDetailModal');
        if (modal) {
            modal.remove();
        }
    }

    editMenu(menuId) {
        const menuItem = this.menu.find(item => item.id === menuId);
        if (!menuItem) return;

        if (this.isProcessingMenu) {
            console.log('Already processing menu, skipping...');
            return;
        }

        const existingModal = document.getElementById('editMenuModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div class="menu-modal-overlay" onclick="dashboard.closeEditMenuModal(event)">
                <div class="menu-modal" onclick="event.stopPropagation()">
                    <div class="menu-modal-header">
                        <h3>Edit Menu</h3>
                        <button class="close-btn" onclick="dashboard.closeEditMenuModal(event)">×</button>
                    </div>
                    <form id="editMenuForm" class="menu-modal-body">
                        <input type="hidden" id="editMenuId" value="${menuItem.id}">
                        <div class="form-section">
                            <div class="image-upload-section">
                                <label>Gambar Menu</label>
                                <div class="image-upload-area" id="editImageUploadArea">
                                    ${menuItem.imageBase64 ? `
                                        <img id="editImagePreview" class="image-preview" src="${menuItem.imageBase64}" style="display: block;">
                                        <div class="upload-placeholder" style="display: none;">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <p>Klik atau drag gambar ke sini</p>
                                            <span>Format: JPG, PNG (Max 5MB)</span>
                                        </div>
                                    ` : menuItem.image ? `
                                        <img id="editImagePreview" class="image-preview" src="${menuItem.image}" style="display: block;">
                                        <div class="upload-placeholder" style="display: none;">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <p>Klik atau drag gambar ke sini</p>
                                            <span>Format: JPG, PNG (Max 5MB)</span>
                                        </div>
                                    ` : menuItem.imageUrl ? `
                                        <img id="editImagePreview" class="image-preview" src="${menuItem.imageUrl}" style="display: block;">
                                        <div class="upload-placeholder" style="display: none;">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <p>Klik atau drag gambar ke sini</p>
                                            <span>Format: JPG, PNG (Max 5MB)</span>
                                        </div>
                                    ` : `
                                        <div class="upload-placeholder">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <p>Klik atau drag gambar ke sini</p>
                                            <span>Format: JPG, PNG (Max 5MB)</span>
                                        </div>
                                        <img id="editImagePreview" class="image-preview" style="display: none;">
                                    `}
                                    <input type="file" id="editMenuImage" accept="image/*" style="display: none;">
                                </div>
                                ${menuItem.imageBase64 || menuItem.image || menuItem.imageUrl ? `
                                    <button type="button" class="btn-secondary btn-sm" onclick="dashboard.removeMenuImage()" style="margin-top: 8px;">
                                        Hapus Gambar
                                    </button>
                                ` : ''}
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nama Menu <span class="required">*</span></label>
                                    <input type="text" id="editMenuName" required value="${menuItem.name}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Kategori <span class="required">*</span></label>
                                    <select id="editMenuCategory" required>
                                        <option value="makanan" ${menuItem.category === 'makanan' ? 'selected' : ''}>Makanan</option>
                                        <option value="minuman" ${menuItem.category === 'minuman' ? 'selected' : ''}>Minuman</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Harga (Rp) <span class="required">*</span></label>
                                    <input type="number" id="editMenuPrice" required value="${menuItem.price}" min="0">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Deskripsi</label>
                                <textarea id="editMenuDescription" rows="3" placeholder="Deskripsi menu...">${menuItem.description || ''}</textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Waktu Persiapan <span class="required">*</span></label>
                                    <input type="text" id="editMenuPrepTime" required value="${menuItem.prepTime}">
                                </div>
                                <div class="form-group">
                                    <label>Rating</label>
                                    <input type="number" id="editMenuRating" step="0.1" min="0" max="5" value="${menuItem.rating || 4.5}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Diskon (%)</label>
                                    <input type="number" id="editMenuDiscount" step="1" min="0" max="100" value="${menuItem.discount || 0}">
                                </div>
                                <div class="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" id="editMenuIsPopular" ${menuItem.isPopular ? 'checked' : ''}>
                                        <span>Menu Populer</span>
                                    </label>
                                </div>
                            </div>

                            <div class="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" id="editMenuIsSelected" ${menuItem.isSelected ? 'checked' : ''}>
                                    <span>Menu Terpilih</span>
                                </label>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="dashboard.closeEditMenuModal(event)">Batal</button>
                            <button type="submit" class="btn-primary" id="updateMenuBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Update Menu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        modalContainer.id = 'editMenuModal';
        document.body.appendChild(modalContainer);

        this.setupEditMenuForm();
        this.setupEditImageUpload();
        this.injectMenuModalStyles();
    }

    toggleMenuStatus(menuId) {
        const menuItem = this.menu.find(item => item.id === menuId);
        if (menuItem) {
            menuItem.status = menuItem.status === 'available' ? 'unavailable' : 'available';
            this.saveMenuToFirebase()
                .then(() => {
                    this.saveMenuToStorage(); // Also save to localStorage to persist images
                    this.renderMenu();
                    this.showToast(`Menu ${menuItem.name} ${menuItem.status === 'available' ? 'diaktifkan' : 'dinonaktifkan'}`);
                })
                .catch(error => {
                    console.error('Error updating menu:', error);
                    this.showToast('Gagal memperbarui status menu');
                });
        }
    }

    deleteMenu(menuId) {
        if (confirm('Apakah Anda yakin ingin menghapus menu ini?')) {
            const menuItem = this.menu.find(item => item.id === menuId);
            if (menuItem) {
                this.deleteMenuFromFirebase(menuId)
                    .then(() => {
                        this.menu = this.menu.filter(item => item.id !== menuId);
                        this.saveMenuToStorage(); // Also save to localStorage to persist images
                        this.updateStats();
                        this.renderMenu();
                        this.showToast(`Menu ${menuItem.name} berhasil dihapus`);
                    })
                    .catch(error => {
                        console.error('Error deleting menu:', error);
                        this.showToast('Gagal menghapus menu');
                    });
            }
        }
    }

    closeEditMenuModal(event) {
        if (event) {
            event.stopPropagation();
        }
        const modal = document.getElementById('editMenuModal');
        if (modal) {
            modal.remove();
        }
        this.isProcessingMenu = false;
    }

    removeMenuImage() {
        const preview = document.getElementById('editImagePreview');
        const placeholder = document.querySelector('#editImageUploadArea .upload-placeholder');
        const fileInput = document.getElementById('editMenuImage');
        const removeBtn = document.querySelector('.image-upload-section button');

        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        if (fileInput) fileInput.value = '';
        if (removeBtn) removeBtn.style.display = 'none';
    }

    setupEditImageUpload() {
        const uploadArea = document.getElementById('editImageUploadArea');
        const fileInput = document.getElementById('editMenuImage');
        const imagePreview = document.getElementById('editImagePreview');

        if (!uploadArea || !fileInput || !imagePreview) return;

        // FIXED: Prevent event propagation to avoid closing modal when clicking upload area
        uploadArea.onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    this.showToast('Ukuran gambar maksimal 5MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    uploadArea.querySelector('.upload-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };

        uploadArea.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('drag-over');
        };

        uploadArea.ondragleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
        };

        uploadArea.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        };
    }

    setupEditMenuForm() {
        const form = document.getElementById('editMenuForm');
        const submitBtn = document.getElementById('updateMenuBtn');

        if (!form || !submitBtn) return;

        form.onsubmit = async (e) => {
            e.preventDefault();

            if (this.isProcessingMenu) {
                console.log('Already processing menu, skipping...');
                return;
            }

            this.isProcessingMenu = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12 " r="10"></circle>
                </svg>
                Memperbarui...
            `;

            try {
                const menuId = parseInt(document.getElementById('editMenuId').value);
                const menuItem = this.menu.find(item => item.id === menuId);

                if (!menuItem) {
                    throw new Error('Menu tidak ditemukan');
                }

                // FIXED: Check if elements exist before accessing their values
                const nameElement = document.getElementById('editMenuName');
                const categoryElement = document.getElementById('editMenuCategory');
                const priceElement = document.getElementById('editMenuPrice');
                const discountElement = document.getElementById('editMenuDiscount');
                const emojiElement = document.getElementById('editMenuEmoji');
                const prepTimeElement = document.getElementById('editMenuPrepTime');
                const descriptionElement = document.getElementById('editMenuDescription');
                const ratingElement = document.getElementById('editMenuRating');
                const isPopularElement = document.getElementById('editMenuIsPopular');
                const isSelectedElement = document.getElementById('editMenuIsSelected');

                if (!nameElement || !categoryElement || !priceElement || !prepTimeElement) {
                    throw new Error('Form elements not found');
                }

                menuItem.name = nameElement.value;
                menuItem.category = categoryElement.value;
                menuItem.price = parseInt(priceElement.value);
                menuItem.discount = parseInt(discountElement?.value) || 0;
                menuItem.emoji = emojiElement?.value || '';
                menuItem.prepTime = prepTimeElement.value;
                menuItem.description = descriptionElement?.value || '';
                menuItem.rating = parseFloat(ratingElement?.value) || 4.5;
                menuItem.isPopular = isPopularElement?.checked || false;
                menuItem.isSelected = isSelectedElement?.checked || false;

                const fileInput = document.getElementById('editMenuImage');
                if (fileInput?.files[0]) {
                    // Convert image to base64 instead of uploading to Firebase Storage
                    menuItem.imageBase64 = await this.convertImageToBase64(fileInput.files[0]);
                    // Remove any existing image URL references
                    delete menuItem.image;
                    delete menuItem.imageUrl;
                } else {
                    const preview = document.getElementById('editImagePreview');
                    if (preview && preview.style.display === 'none' && !fileInput?.files[0]) {
                        delete menuItem.imageBase64;
                        delete menuItem.image;
                        delete menuItem.imageUrl;
                    }
                }

                await this.saveMenuToFirebase();
                this.saveMenuToStorage(); // Also save to localStorage to persist images

                this.showToast(`Menu "${menuItem.name}" berhasil diperbarui!`);
                this.closeEditMenuModal(event);
                this.renderMenu();

            } catch (error) {
                console.error('Error updating menu:', error);
                this.showToast('Gagal memperbarui menu: ' + error.message);
            } finally {
                this.isProcessingMenu = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Update Menu
                `;
            }
        };
    }

    saveSettings() {
        this.showToast('Pengaturan berhasil disimpan');
    }

    handleSearch(query) {
        console.log('🔍 Searching for:', query);

        if (query.trim() === '') {
            this.renderCurrentPage();
            return;
        }

        const searchQuery = query.toLowerCase();

        switch (this.currentPage) {
            case 'orders':
                this.searchOrders(searchQuery);
                break;
            case 'menu':
                this.searchMenu(searchQuery);
                break;
            default:
                const filteredOrders = this.orders.filter(order =>
                    order.id.toLowerCase().includes(searchQuery) ||
                    order.customerName.toLowerCase().includes(searchQuery) ||
                    (order.customerPhone && order.customerPhone.includes(searchQuery))
                );

                if (filteredOrders.length > 0) {
                    this.showPage('orders');
                    setTimeout(() => this.searchOrders(searchQuery), 100);
                } else {
                    this.showToast('Tidak ada hasil yang ditemukan');
                }
        }
    }

    searchOrders(query) {
        const filteredOrders = this.orders.filter(order =>
            order.id.toLowerCase().includes(query) ||
            order.customerName.toLowerCase().includes(query) ||
            (order.customerPhone && order.customerPhone.includes(query))
        );

        this.renderFilteredOrders(filteredOrders);
    }

    searchMenu(query) {
        const filteredMenu = this.menu.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );

        this.renderFilteredMenu(filteredMenu);
    }

    renderFilteredOrders(orders) {
        const tbody = document.querySelector('.orders-table tbody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                        Tidak ada pesanan yang ditemukan
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td>
                        <div class="order-id">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            ${order.id}
                        </div>
                    </td>
                    <td>
                        <div class="customer-info">
                            <div class="customer-name">${order.customerName}</div>
                            <div class="customer-phone">${order.customerPhone || '-'}</div>
                        </div>
                    </td>
                    <td>${order.items.length} item</td>
                    <td class="amount">${this.formatCurrency(order.total)}</td>
                    <td><span class="payment-method ${order.paymentMethod}">${this.getPaymentMethodText(order.paymentMethod)}</span></td>
                    <td>
                        <select class="status-select ${order.status}" onchange="dashboard.updateOrderStatus('${order.id}', this.value)">
                            <option value="Menunggu" ${order.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                            <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
                            <option value="Siap Diambil" ${order.status === 'Siap Diambil' ? 'selected' : ''}>Siap Diambil</option>
                            <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                        </select>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="dashboard.showOrderDetail('${order.id}')" title="Detail">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    renderFilteredMenu(menu) {
        const menuGrid = document.querySelector('.menu-grid');
        if (!menuGrid) return;

        if (menu.length === 0) {
            menuGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px;">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                        <path d="M2 17L12 22L22 17"></path>
                        <path d="M2 12L12 17L22 12"></path>
                    </svg>
                    <p>Tidak ada menu yang ditemukan</p>
                </div>
            `;
        } else {
            menuGrid.innerHTML = menu.map(item => `
                <div class="menu-card">
                    ${item.imageBase64 ? `
                        <div class="menu-image-container">
                            <img src="${item.imageBase64}" alt="${item.name}" class="menu-image">
                        </div>
                    ` : ''}
                    ${item.image ? `
                        <div class="menu-image-container">
                            <img src="${item.image}" alt="${item.name}" class="menu-image" onerror="this.parentElement.style.display='none'">
                        </div>
                    ` : ''}
                    ${item.imageUrl ? `
                        <div class="menu-image-container">
                            <img src="${item.imageUrl}" alt="${item.name}" class="menu-image" onerror="this.parentElement.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="menu-header">
                        ${item.emoji ? `<div class="menu-emoji">${item.emoji}</div>` : ''}
                        <div class="menu-info">
                            <h3>${item.name}</h3>
                            <span class="menu-category">${item.category}</span>
                        </div>
                        <div class="menu-rating">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            ${item.rating}
                        </div>
                    </div>
                    <div class="menu-body">
                        ${item.description ? `<p class="menu-description">${item.description}</p>` : ''}
                        <div class="menu-meta">
                            <div class="menu-price">
                                ${item.discount > 0 ? `
                                    <span class="original-price">${this.formatCurrency(item.price)}</span>
                                    <span class="discounted-price">${this.formatCurrency(item.price - (item.price * item.discount / 100))}</span>
                                ` : `
                                    <span>${this.formatCurrency(item.price)}</span>
                                `}
                            </div>
                            <div class="menu-time">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${item.prepTime}
                            </div>
                        </div>
                        ${item.discount > 0 ? `
                            <div class="menu-discount">
                                <span class="discount-badge">${item.discount}% OFF</span>
                            </div>
                        ` : ''}
                        ${item.isSelected ? `
                            <div class="menu-selected">
                                <span class="selected-badge">Terpilih</span>
                            </div>
                        ` : ''}
                        <div class="menu-actions">
                            <button class="btn-secondary btn-sm" onclick="dashboard.editMenu(${item.id})">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="dashboard.toggleMenuStatus(${item.id})">
                                ${item.status === 'available' ? 'Nonaktif' : 'Aktif'}
                            </button>
                            <button class="btn-secondary btn-sm" onclick="dashboard.deleteMenu(${item.id})">Hapus</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    getTopMenu() {
        const menuSales = {};

        this.orders.forEach(order => {
            order.items.forEach(item => {
                if (menuSales[item.id]) {
                    menuSales[item.id].sales += item.quantity;
                } else {
                    menuSales[item.id] = {
                        name: item.name,
                        sales: item.quantity
                    };
                }
            });
        });

        return Object.values(menuSales)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);
    }

    updateSalesChart() {
        const container = document.getElementById('salesChart');
        if (!container) {
            console.error('❌ Sales chart container not found');
            return;
        }

        console.log('🔄 Updating sales chart...');

        const period = parseInt(document.getElementById('chartPeriod')?.value || 7);
        const { labels, data } = this.generateSalesData(period);

        console.log('📊 Chart data:', { labels, data, period });

        if (data.every(value => value === 0)) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #6b7280; font-style: italic;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <p>Belum ada data penjualan untuk periode ini</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const maxValue = Math.max(...data, 1);

        const chartHtml = `
            <div class="bar-chart">
                <div class="chart-bars">
                    ${labels.map((label, index) => {
            const value = data[index] || 0;
            const height = (value / maxValue) * 100;
            return `
                            <div class="bar-wrapper">
                                <div class="bar-value">Rp ${value.toLocaleString('id-ID')}</div>
                                <div class="bar" style="height: ${height}%"></div>
                                <div class="bar-label">${label}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = chartHtml;
        console.log('✅ Sales chart created successfully');
    }

    generateSalesData(days) {
        const labels = [];
        const data = [];
        const today = new Date();

        console.log(`📈 Generating sales data for ${days} days`);
        console.log('📊 Available orders:', this.orders.length);

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });

            labels.push(dayName);

            let dailySales = 0;
            this.orders.forEach(order => {
                if (order.status === 'Selesai' && order.date === dateStr) {
                    dailySales += order.total || 0;
                }
            });

            data.push(dailySales);
        }

        console.log('📊 Generated data:', { labels, data });
        return { labels, data };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    getStatusText(status) {
        const statusMap = {
            'Menunggu': 'Menunggu',
            'Diproses': 'Diproses',
            'Siap Diambil': 'Siap Diambil',
            'Selesai': 'Selesai',
            'Dibatalkan': 'Dibatalkan'
        };
        return statusMap[status] || status;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    startRealTimeUpdates() {
        setInterval(() => {
            this.updateBadges();
        }, 5000);

        if (database) {
            database.ref('orders').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.orders = Object.entries(data)
                        .map(([key, value]) => ({ firebaseKey: key, ...value }))
                        .sort((a, b) => b.timestamp - a.timestamp);

                    if (this.currentPage === 'analytics') {
                        this.updateSalesChart();
                    }
                }
            });
        }
    }
}

// Initialize Dashboard
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded, initializing dashboard');
    dashboard = new AdminDashboard();
    window.dashboard = dashboard;
});

// Prevent form submission
document.addEventListener('submit', (e) => {
    if (!e.target.classList.contains('settings-form')) {
        e.preventDefault();
    }
});

// Tambahkan CSS untuk menu image
const menuImageStyles = document.createElement('style');
menuImageStyles.textContent = `
    .menu-image-container {
        width: 100%;
        height: 200px;
        overflow: hidden;
        border-radius: 12px 12px 0 0;
    }

    .menu-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    .menu-card:hover .menu-image {
        transform: scale(1.05);
    }

    .menu-card:has(.menu-image-container) .menu-header {
        border-top: 1px solid #e5e7eb;
    }

    /* Discount and Selected Badge Styles */
    .menu-discount {
        margin-top: 8px;
    }

    .discount-badge {
        background: #ef4444;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .menu-selected {
        margin-top: 8px;
    }

    .selected-badge {
        background: #10b981;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .original-price {
        text-decoration: line-through;
        color: #9ca3af;
        font-size: 0.875rem;
    }

    .discounted-price {
        color: #ef4444;
        font-weight: 600;
        font-size: 1.125rem;
    }
`;
document.head.appendChild(menuImageStyles);

// Tambahkan CSS untuk charts di bagian bawah file, setelah CSS yang sudah ada
const chartStyles = document.createElement('style');
chartStyles.textContent = `
    .analytics-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }

    .card-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
    }

    .card-header select {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #ffffff;
        color: #374151;
        font-size: 0.9rem;
    }

    .card-content {
        padding: 20px;
    }

    /* Bar Chart Styles */
    .bar-chart {
        width: 100%;
        height: 300px;
        position: relative;
    }

    .chart-bars {
        display: flex;
        align-items: end;
        justify-content: space-around;
        height: 250px;
        padding: 0 10px;
        border-left: 2px solid #e5e7eb;
        border-bottom: 2px solid #e5e7eb;
        position: relative;
    }

    .bar-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        max-width: 60px;
        position: relative;
    }

    .bar {
        width: 100%;
        background: linear-gradient(to top, #3b82f6, #60a5fa);
        border-radius: 4px 4px 0 0;
        position: relative;
        min-height: 5px;
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .bar:hover {
        background: linear-gradient(to top, #2563eb, #3b82f6);
        transform: translateY(-2px);
    }

    .bar-value {
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem;
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
        background: #ffffff;
        padding: 2px 6px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .bar-wrapper:hover .bar-value {
        opacity: 1;
    }

    .bar-label {
        margin-top: 10px;
        font-size: 0.8rem;
        color: #6b7280;
        text-align: center;
        font-weight: 500;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .card-header {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
        }
        
        .chart-bars {
            height: 200px;
        }
        
        .bar-wrapper {
            max-width: 40px;
        }
        
        .bar-label {
            font-size: 0.7rem;
        }
    }
`;
document.head.appendChild(chartStyles);

// Tambahkan event listener untuk chart period
document.addEventListener('DOMContentLoaded', () => {
    const chartPeriod = document.getElementById('chartPeriod');
    if (chartPeriod) {
        chartPeriod.addEventListener('change', () => {
            if (window.dashboard) {
                window.dashboard.updateSalesChart();
            }
        });
    }
});