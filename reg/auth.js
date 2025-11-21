// auth.js - Complete and fixed version
class AuthHandler {
    constructor() {
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Registration form submission
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
        }

        // Login form submission  
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password visibility toggle
        this.setupPasswordToggles();
        
        // Camera support
        this.setupCameraSupport();
        
        // Background selection
        this.setupBackgroundSelection();
    }

    async handleRegistration(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            const photoInput = document.getElementById('portfolio-photo');
            const formData = new FormData();
            
            // Add text fields
            formData.append('full_name', document.getElementById('register-name').value.trim());
            formData.append('email', document.getElementById('register-email').value.trim());
            formData.append('password', document.getElementById('register-password').value);
            formData.append('confirm_password', document.getElementById('confirm-password').value);

            // Add photo if selected
            if (photoInput && photoInput.files[0]) {
                formData.append('portfolio_photo', photoInput.files[0]);
            }

            // Enhanced validation
            const validation = this.validateRegistration(formData);
            if (!validation.isValid) {
                this.showMessage(validation.message, 'error');
                return;
            }

            const response = await fetch('reg.php', {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Persist user data so the dashboard can pick it up
                try {
                    const userObj = result.user || result.data || null;
                    if (userObj) {
                        const json = JSON.stringify(userObj);
                        // store as cookie for dashboard/app.js getCookie
                        const days = 7;
                        const date = new Date();
                        date.setTime(date.getTime() + (days*24*60*60*1000));
                        // store raw JSON string so existing dashboard code can JSON.parse it
                        document.cookie = `user_data=${json}; expires=${date.toUTCString()}; path=/; samesite=lax`;
                        // also store token if provided
                        if (result.token) {
                            document.cookie = `auth_token=${result.token}; expires=${date.toUTCString()}; path=/; samesite=lax`;
                        }
                        // localStorage fallback
                        try { localStorage.setItem('user_data', json); } catch(e) {}
                    }
                } catch (e) {
                    console.warn('Failed to persist user data:', e);
                }

                this.showMessage('Registration successful! Redirecting...', 'success');
                setTimeout(() => {
                    // Redirect to dashboard
                    window.location.href = '../index.html';
                }, 1200);
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Registration failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Signing In...';
            submitBtn.disabled = true;

            const formData = {
                email: document.getElementById('login-email').value.trim(),
                password: document.getElementById('login-password').value
            };

            // Validation
            if (!formData.email || !formData.password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }

            const response = await fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Persist user data for dashboard
                try {
                    const userObj = result.user || result.data || null;
                    if (userObj) {
                        const json = JSON.stringify(userObj);
                        const days = 7;
                        const date = new Date();
                        date.setTime(date.getTime() + (days*24*60*60*1000));
                        document.cookie = `user_data=${json}; expires=${date.toUTCString()}; path=/; samesite=lax`;
                        if (result.token) {
                            document.cookie = `auth_token=${result.token}; expires=${date.toUTCString()}; path=/; samesite=lax`;
                        }
                        try { localStorage.setItem('user_data', json); } catch(e) {}
                    }
                } catch (e) {
                    console.warn('Failed to persist user data:', e);
                }

                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 800);
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateRegistration(formData) {
        const fullName = formData.get('full_name');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');

        if (!fullName || !email || !password || !confirmPassword) {
            return { isValid: false, message: 'All fields are required' };
        }

        if (password !== confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }

        if (password.length < 6) {
            return { isValid: false, message: 'Password must be at least 6 characters' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        // Validate photo if present
        const photo = formData.get('portfolio_photo');
        if (photo && photo.size > 0) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(photo.type)) {
                return { isValid: false, message: 'Please upload a valid image (JPEG, PNG, GIF)' };
            }

            if (photo.size > 5 * 1024 * 1024) {
                return { isValid: false, message: 'Image size must be less than 5MB' };
            }
        }

        return { isValid: true, message: '' };
    }

    setupPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const input = this.previousElementSibling;
                if (input.type === 'password') {
                    input.type = 'text';
                    this.textContent = '🙈';
                } else {
                    input.type = 'password';
                    this.textContent = '👁️';
                }
            });
        });
    }

    setupCameraSupport() {
        const cameraBtn = document.getElementById('camera-btn');
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('portfolio-photo');
        
        if (cameraBtn && uploadBtn) {
            cameraBtn.addEventListener('click', () => {
                cameraBtn.classList.add('active');
                uploadBtn.classList.remove('active');
                // Camera functionality is handled in the HTML file
            });
            
            uploadBtn.addEventListener('click', () => {
                uploadBtn.classList.add('active');
                cameraBtn.classList.remove('active');
                if (fileInput) fileInput.disabled = false;
            });
        }
    }

    setupBackgroundSelection() {
        const backgroundOptions = document.querySelectorAll('.background-option');
        const authContainer = document.getElementById('auth-container');
        
        if (backgroundOptions.length > 0 && authContainer) {
            let selectedBackground = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

            backgroundOptions.forEach(option => {
                option.addEventListener('click', function() {
                    backgroundOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedBackground = this.getAttribute('data-bg');
                    authContainer.style.background = selectedBackground;
                    localStorage.setItem('selectedBackground', selectedBackground);
                });
            });

            // Load saved background
            const savedBackground = localStorage.getItem('selectedBackground');
            if (savedBackground) {
                authContainer.style.background = savedBackground;
                backgroundOptions.forEach(option => {
                    if (option.getAttribute('data-bg') === savedBackground) {
                        option.classList.add('selected');
                    }
                });
            }
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;

        // Insert at the top of form container
        const formContainer = document.querySelector('.form-container');
        if (formContainer) {
            formContainer.insertBefore(messageDiv, formContainer.firstChild);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    handleDatabaseError(error) {
        console.error('Database error:', error);
        
        if (error.message.includes('Duplicate entry') && error.message.includes('email')) {
            this.showMessage('Email already registered', 'error');
        } else if (error.message.includes('Duplicate entry') && error.message.includes('username')) {
            this.showMessage('Username already taken', 'error');
        } else {
            this.showMessage('Database error. Please try again.', 'error');
        }
    }
}

// Camera Handler Class
class CameraHandler {
    constructor() {
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('photo-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
    }

    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user' 
                } 
            });
            this.video.srcObject = this.stream;
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please check permissions and try again.');
            return false;
        }
    }

    capturePhoto() {
        if (!this.video.videoWidth) return false;
        
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0);
        
        // Switch to preview stage
        document.getElementById('camera-stage').classList.remove('active');
        document.getElementById('preview-stage').classList.add('active');
        return true;
    }

    retakePhoto() {
        // Switch back to camera stage
        document.getElementById('preview-stage').classList.remove('active');
        document.getElementById('camera-stage').classList.add('active');
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    getPhotoBlob() {
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    new AuthHandler();
    
    // Initialize camera functionality if on registration page
    if (document.getElementById('camera-modal')) {
        initializeCameraFunctionality();
    }
    
    // Handle password reset forms
    setupPasswordResetForms();
});

// Camera functionality initialization
function initializeCameraFunctionality() {
    const cameraModal = document.getElementById('camera-modal');
    const cameraBtn = document.getElementById('camera-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const usePhotoBtn = document.getElementById('use-photo-btn');
    const closeCamera = document.getElementById('close-camera');
    const fileInput = document.getElementById('portfolio-photo');
    const photoPreview = document.getElementById('photo-preview');
    const removePhotoBtn = document.getElementById('remove-photo');
    const fileLabel = document.getElementById('file-label');

    let cameraHandler = null;

    if (cameraBtn) {
        cameraBtn.addEventListener('click', async function() {
            cameraBtn.classList.add('active');
            if (uploadBtn) uploadBtn.classList.remove('active');
            if (fileLabel) fileLabel.textContent = 'Take Photo First';
            if (fileInput) fileInput.disabled = true;

            if (!cameraHandler) {
                cameraHandler = new CameraHandler();
                const success = await cameraHandler.initializeCamera();
                if (!success) return;
            }
            if (cameraModal) cameraModal.classList.add('active');
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            uploadBtn.classList.add('active');
            if (cameraBtn) cameraBtn.classList.remove('active');
            if (fileLabel) fileLabel.textContent = 'Choose Photo';
            if (fileInput) fileInput.disabled = false;
        });
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', function() {
            if (cameraHandler) {
                cameraHandler.capturePhoto();
            }
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', function() {
            if (cameraHandler) {
                cameraHandler.retakePhoto();
            }
        });
    }

    if (usePhotoBtn) {
        usePhotoBtn.addEventListener('click', async function() {
            if (cameraHandler) {
                const blob = await cameraHandler.getPhotoBlob();
                const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
                
                // Create data URL for preview
                const dataUrl = URL.createObjectURL(blob);
                if (photoPreview) {
                    photoPreview.innerHTML = `<img src="${dataUrl}" alt="Profile Preview">`;
                    photoPreview.classList.add('has-image');
                }
                
                // Create a FileList-like object
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                if (fileInput) fileInput.files = dataTransfer.files;
                
                if (cameraModal) cameraModal.classList.remove('active');
                cameraHandler.stopCamera();
                cameraHandler = null;
            }
        });
    }

    if (closeCamera) {
        closeCamera.addEventListener('click', function() {
            if (cameraModal) cameraModal.classList.remove('active');
            if (cameraHandler) {
                cameraHandler.stopCamera();
                cameraHandler = null;
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && photoPreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    photoPreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    photoPreview.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removePhotoBtn && photoPreview) {
        removePhotoBtn.addEventListener('click', function() {
            photoPreview.innerHTML = '<span>Profile Photo</span>';
            photoPreview.classList.remove('has-image');
            if (fileInput) fileInput.value = '';
        });
    }

    // Close modal when clicking outside
    if (cameraModal) {
        cameraModal.addEventListener('click', function(e) {
            if (e.target === cameraModal) {
                cameraModal.classList.remove('active');
                if (cameraHandler) {
                    cameraHandler.stopCamera();
                    cameraHandler = null;
                }
            }
        });
    }
}

// Password reset forms setup
function setupPasswordResetForms() {
    const resetRequestForm = document.getElementById('reset-request-form');
    const changeWithCodeForm = document.getElementById('change-with-code-form');

    if (resetRequestForm) {
        resetRequestForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Password reset functionality would be implemented here.');
        });
    }

    if (changeWithCodeForm) {
        changeWithCodeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Password change functionality would be implemented here.');
        });
    }
}