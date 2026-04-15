// Configuration
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyJnZhRAr9TUUZuWYbrbnNPoEIz_dzj1HJ4wGquO_eewotgCgY3G5QO8Lys0KEUZPSR/exec',
    
    // PERBAIKAN FINAL: Gunakan formResponse, bukan viewform atau forms.gle
    FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfzvSjoOdZmNwY9r5bXAriAx5MSJEeYl75zKn1YFdJPqXvnow/formResponse',
    
    FIELDS: {
        NAME: 'entry.1940663717',
        CLASS: 'entry.358705380',
        STATUS: 'entry.675416788',
        REASON: 'entry.744173529',
        PHOTO: 'entry.881462619'
    }
};

// Application State
let studentData = [];
let currentUser = JSON.parse(localStorage.getItem('user_profile')) || null;
let currentPhotoBase64 = null;
let stream = null;

// DOM Elements
const views = {
    setup: document.getElementById('setup-view'),
    home: document.getElementById('home-view'),
    selfieModal: document.getElementById('selfie-modal'),
    reasonModal: document.getElementById('reason-modal')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showHome();
    } else {
        showSetup();
    }
    fetchStudents();
});

// --- NAVIGATION ---
function showSetup() {
    views.setup.classList.remove('hidden');
    views.home.classList.add('hidden');
    startCamera('video');
}

function showHome() {
    views.setup.classList.add('hidden');
    views.home.classList.remove('hidden');
    
    document.getElementById('home-user-name').innerText = currentUser.name;
    document.getElementById('home-user-info').innerText = `DUDI: ${currentUser.dudi} | Kelas: ${currentUser.class}`;
    document.getElementById('home-profile-img').src = currentUser.photo;
    
    checkTodayStatus();
}

function checkTodayStatus() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('last_presensi_date');
    const statusBox = document.getElementById('status-display');
    const statusText = document.getElementById('status-text');
    
    if (lastDate === today) {
        statusBox.className = 'status-badge status-success';
        statusText.innerText = 'Anda SUDAH melakukan presensi hari ini.';
        document.getElementById('btn-masuk').disabled = true;
        document.getElementById('btn-tidak-masuk').disabled = true;
    } else {
        statusBox.className = 'status-badge status-pending';
        statusText.innerText = 'Anda BELUM melakukan presensi hari ini.';
    }
}

// --- DATA FETCHING ---
async function fetchStudents() {
    try {
        const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getStudents`);
        const data = await response.json();
        studentData = data.master;
        populateDudi();
    } catch (error) {
        console.error('Error fetching students:', error);
        alert('Gagal menyambungkan ke server. Mohon periksa internet.');
    }
}

function populateDudi() {
    const dudiSelect = document.getElementById('select-dudi');
    const dudiList = [...new Set(studentData.map(s => s.dudi))].sort();
    
    dudiSelect.innerHTML = '<option value="">-- Pilih DUDI --</option>';
    dudiList.forEach(dudi => {
        const opt = document.createElement('option');
        opt.value = dudi;
        opt.innerText = dudi;
        dudiSelect.appendChild(opt);
    });
}

document.getElementById('select-dudi').addEventListener('change', (e) => {
    const selectedDudi = e.target.value;
    const studentSelect = document.getElementById('select-student');
    studentSelect.disabled = !selectedDudi;
    
    if (!selectedDudi) {
        studentSelect.innerHTML = '<option value="">-- Pilih DUDI Terlebih Dahulu --</option>';
        return;
    }
    
    const students = studentData.filter(s => s.dudi === selectedDudi).sort((a,b) => a.nama.localeCompare(b.nama));
    studentSelect.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nama;
        opt.innerText = s.nama;
        studentSelect.appendChild(opt);
    });
});

document.getElementById('select-student').addEventListener('change', (e) => {
    const student = studentData.find(s => s.nama === e.target.value);
    if (student) {
        document.getElementById('display-class').value = student.kelas;
    }
});

// --- CAMERA HANDLING ---
async function startCamera(videoId) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    try {
        // PERBAIKAN: Membatasi resolusi tangkapan kamera agar ringan
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 320 },
                height: { ideal: 320 }
            }, 
            audio: false 
        });
        const videoElement = document.getElementById(videoId);
        videoElement.srcObject = stream;
    } catch (err) {
        console.error("Camera Error:", err);
        alert("Mohon izinkan akses kamera!");
    }
}

document.getElementById('camera-click-area').addEventListener('click', () => {
    capturePhoto('video', 'canvas', 'setup-preview');
});

function capturePhoto(videoId, canvasId, previewId) {
    const video = document.getElementById(videoId);
    const canvas = document.getElementById(canvasId);
    const preview = document.getElementById(previewId);
    
    const context = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 320;
    
    // Draw mirrored
    context.translate(320, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, 320, 320);
    
    // PERBAIKAN: Menurunkan kualitas kompresi JPEG menjadi 30% (0.3)
    const base64 = canvas.toDataURL('image/jpeg', 0.3);
    currentPhotoBase64 = base64.replace(/^data:image\/jpeg;base64,/, "");
    
    preview.src = base64;
    preview.classList.remove('hidden');
    video.classList.add('hidden');
}

// --- SETUP SAVE ---
document.getElementById('btn-save-setup').addEventListener('click', () => {
    const name = document.getElementById('select-student').value;
    const dudi = document.getElementById('select-dudi').value;
    const klass = document.getElementById('display-class').value;
    const photo = document.getElementById('setup-preview').src;
    
    if (!name || !dudi || !photo || photo.includes('hidden')) {
        alert('Harap lengkapi semua data dan ambil foto!');
        return;
    }
    
    currentUser = { name, dudi, class: klass, photo };
    localStorage.setItem('user_profile', JSON.stringify(currentUser));
    
    if (stream) stream.getTracks().forEach(t => t.stop());
    showHome();
});

// --- ATTENDANCE ACTIONS ---
document.getElementById('btn-masuk').addEventListener('click', () => {
    views.selfieModal.classList.remove('hidden');
    startCamera('selfie-video');
});

document.getElementById('btn-cancel-selfie').addEventListener('click', () => {
    views.selfieModal.classList.add('hidden');
    if (stream) stream.getTracks().forEach(t => t.stop());
});

document.getElementById('btn-capture-selfie').addEventListener('click', () => {
    capturePhoto('selfie-video', 'selfie-canvas', 'selfie-preview');
    
    // Confirm and Send
    if (confirm('Wajah teridentifikasi. Kirim presensi HADIR sekarang?')) {
        sendPresensi('HADIR', '');
        views.selfieModal.classList.add('hidden');
    }
});

document.getElementById('btn-tidak-masuk').addEventListener('click', () => {
    views.reasonModal.classList.remove('hidden');
});

document.getElementById('btn-close-reason').addEventListener('click', () => {
    views.reasonModal.classList.add('hidden');
});

document.getElementById('btn-submit-reason').addEventListener('click', () => {
    const reason = document.getElementById('reason-text').value.trim();
    if (!reason) {
        alert('Mohon isi alasan Anda!');
        return;
    }
    sendPresensi('TIDAK HADIR', reason);
    views.reasonModal.classList.add('hidden');
});

// --- FORM SUBMISSION ---
async function sendPresensi(status, reason) {
    const params = new URLSearchParams();
    params.append(CONFIG.FIELDS.NAME, currentUser.name.toUpperCase());
    params.append(CONFIG.FIELDS.CLASS, currentUser.class);
    params.append(CONFIG.FIELDS.STATUS, status);
    
    if (reason) {
        params.append(CONFIG.FIELDS.REASON, reason);
    }
    
    // Memasukkan data foto yang sudah dikompresi jika statusnya HADIR
    if (status === 'HADIR' && currentPhotoBase64) {
        params.append(CONFIG.FIELDS.PHOTO, currentPhotoBase64);
    }
    
    // UI Feedback
    showNotif('Sedang mengirim...', '#0088cc');
    
    try {
        await fetch(CONFIG.FORM_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('last_presensi_date', today);
        checkTodayStatus();
        showNotif('Berhasil dikirim!', '#2ecc71');
        
        if (stream) stream.getTracks().forEach(t => t.stop());
    } catch (error) {
        console.error('Submission error:', error);
        showNotif('Gagal mengirim! Cek koneksi internet.', '#e74c3c');
    }
}

function showNotif(text, color) {
    const overlay = document.getElementById('notif-overlay');
    overlay.innerText = text;
    overlay.style.backgroundColor = color;
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 3000);
}

// Edit Profile
document.getElementById('btn-edit-profile').addEventListener('click', () => {
    if (confirm('Yakin ingin mereset profil Anda? (Lakukan ini jika salah pilih nama)')) {
        localStorage.removeItem('user_profile');
        currentUser = null;
        location.reload();
    }
});
