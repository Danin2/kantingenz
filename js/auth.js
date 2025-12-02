// Firebase Configuration
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
let auth;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    console.log('Firebase Auth initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = inputId ? document.getElementById(inputId) : document.getElementById('password');
    const button = input.parentElement.querySelector('.toggle-password');
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        input.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
}

// Show Toast Notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.remove('error');
        
        if (isError) {
            toast.classList.add('error');
        }
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Check if user is already logged in
function checkAuthState() {
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, redirect to admin page
                const currentPage = window.location.pathname;
                if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
                    window.location.href = 'admin.html';
                }
            }
        });
    }
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        const submitBtn = loginForm.querySelector('.btn-primary');
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            if (!auth) {
                throw new Error('Firebase Auth tidak tersedia');
            }
            
            // Sign in with email and password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login successful:', user.email);
            
            // Set persistence based on remember me checkbox
            if (remember) {
                await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            } else {
                await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            }
            
            showToast('Login berhasil! Mengalihkan...');
            
            // Redirect to admin page
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login gagal. Silakan coba lagi.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Email tidak terdaftar';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Password salah';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Akun telah dinonaktifkan';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Terlalu banyak percobaan. Coba lagi nanti';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showToast(errorMessage, true);
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const restaurantName = document.getElementById('restaurantName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        const submitBtn = signupForm.querySelector('.btn-primary');
        
        // Validation
        if (!terms) {
            showToast('Anda harus menyetujui Syarat & Ketentuan', true);
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Password tidak cocok', true);
            return;
        }
        
        if (password.length < 6) {
            showToast('Password minimal 6 karakter', true);
            return;
        }
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            if (!auth) {
                throw new Error('Firebase Auth tidak tersedia');
            }
            
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Signup successful:', user.email);
            
            // Update user profile
            await user.updateProfile({
                displayName: fullName
            });
            
            // Save additional user data to localStorage (or you can use Firebase Database)
            const userData = {
                fullName: fullName,
                restaurantName: restaurantName,
                email: email,
                phone: phone,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('kantingenz_user_data', JSON.stringify(userData));
            
            showToast('Pendaftaran berhasil! Mengalihkan...');
            
            // Redirect to admin page
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
            
        } catch (error) {
            console.error('Signup error:', error);
            
            let errorMessage = 'Pendaftaran gagal. Silakan coba lagi.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email sudah terdaftar';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password terlalu lemah';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Operasi tidak diizinkan';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showToast(errorMessage, true);
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    
    // Add animation to form elements
    const formInputs = document.querySelectorAll('.input-wrapper input');
    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.01)';
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });
});