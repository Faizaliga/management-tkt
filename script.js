// ==========================================
// CONFIG & INITIAL STATE
// ==========================================
let incidents = [];
let coverageRequests = [];
let currentPage = 1;

let topMitraChartInstance = null;
let sourceRatioChartInstance = null;
let dailyTrendChartInstance = null;

// ==========================================
// SISTEM AKUN & LOGIN (3 USERS)
// ==========================================
const USERS = [
    { username: "admin", password: "Iga@1996", name: "Faizal Iga Pratama", role: "Super Admin", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256" },
    { username: "noc", password: "nocpassword", name: "Noc Baik", role: "NOC Engineer (L2)", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256" },
    { username: "helpdesk", password: "helpdeskpassword", name: "Helpdesk Gokil", role: "Helpdesk Staff (L1)", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256" }
];

let currentUser = null;

// ==========================================
// UTILITY HELPERS (XSS, MAPS, TOAST)
// ==========================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openMapLink(queryOrUrl) {
    if (!queryOrUrl || queryOrUrl === '-' || queryOrUrl === 'undefined') return;
    const trimmed = String(queryOrUrl).trim();
    if (/^https?:\/\//i.test(trimmed)) {
        window.open(trimmed, '_blank', 'noopener,noreferrer');
    } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`, '_blank', 'noopener,noreferrer');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item flex items-center p-3.5 rounded-xl border text-xs font-semibold shadow-lg ${
        type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-sky-50 border-sky-200 text-sky-800'
    }`;

    const iconClass = 
        type === 'success' ? 'fa-solid fa-circle-check text-emerald-600' :
        type === 'error' ? 'fa-solid fa-circle-xmark text-rose-600' :
        type === 'warning' ? 'fa-solid fa-triangle-exclamation text-amber-600' :
        'fa-solid fa-circle-info text-sky-600';

    toast.innerHTML = `
        <i class="${iconClass} text-base mr-2.5 flex-shrink-0"></i>
        <span class="flex-grow">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="ml-2 text-slate-400 hover:text-slate-600 p-1">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function parseTimeToHHMM(timeStr) {
    if (!timeStr) return '';
    let str = String(timeStr).trim();

    // Jika ada format ISO atau datetime (e.g. "2026-11-11T13:46:00" atau "2026-11-11 13:46:00")
    if (str.includes('T')) {
        str = str.split('T')[1];
    } else if (str.includes(' ') && (str.includes('-') || str.includes('/'))) {
        str = str.split(' ')[1];
    }

    // Deteksi AM / PM (misal "01:46 PM")
    const isPM = /pm/i.test(str);
    const isAM = /am/i.test(str);
    str = str.replace(/am|pm/gi, '').trim();

    // Ganti titik dengan titik dua (misal "13.46" -> "13:46")
    str = str.replace(/\./g, ':');

    // Ambil jam dan menit
    const parts = str.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return '';

        if (isPM && hours < 12) {
            hours += 12;
        } else if (isAM && hours === 12) {
            hours = 0;
        }

        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    return '';
}

function parseDateToYYYYMMDD(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim();
    if (str.includes('T')) {
        str = str.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmyMatch) {
        const d = String(dmyMatch[1]).padStart(2, '0');
        const m = String(dmyMatch[2]).padStart(2, '0');
        const y = dmyMatch[3];
        return `${y}-${m}-${d}`;
    }
    return str;
}

function normalizeTime(timeStr) {
    return parseTimeToHHMM(timeStr);
}

// ==========================================
// LIFECYCLE & EVENT LISTENERS
// ==========================================
window.onload = async function() {
    const savedUser = localStorage.getItem('isp_current_user');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch (e) { currentUser = null; }
    }
    if (currentUser) { await showApp(); } else { showLogin(); }
};

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeIncidentModal();
        closeCoverageModal();
        closeModal();
        closeExportModal();
    }
});

// Tutup modal saat klik area luar (backdrop)
document.addEventListener('click', (e) => {
    const modalIds = ['incidentModal', 'coverageModal', 'detailModal', 'exportModal'];
    modalIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && e.target === el && !el.classList.contains('hidden')) {
            if (id === 'incidentModal') closeIncidentModal();
            else if (id === 'coverageModal') closeCoverageModal();
            else if (id === 'detailModal') closeModal();
            else if (id === 'exportModal') closeExportModal();
        }
    });
});

function handleLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('loginUsername').value.trim();
    const passInput = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const found = USERS.find(u => u.username === userInput && u.password === passInput);

    if (found) {
        currentUser = found;
        localStorage.setItem('isp_current_user', JSON.stringify(currentUser));
        if (errorEl) errorEl.classList.add('hidden');
        showApp();
    } else {
        if (errorEl) errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    stopSheetsSync();
    currentUser = null;
    localStorage.removeItem('isp_current_user');
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
}

async function showApp() {
    await loadOperators(); 
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');

    const tbody = document.getElementById('incidentTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuat data dari server...</td></tr>`;

    await loadFromStorage();
    await loadCoverageFromStorage();
    
    // AKTIFKAN REALTIME LISTENERS SUPABASE
    initTicketsRealtime();
    initCoverageRealtime();
    startSheetsSync();

    if (document.getElementById('inputTanggal')) document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    if (document.getElementById('inputTanggalSelesai')) document.getElementById('inputTanggalSelesai').value = CONFIG.DEFAULT_DATE;

    updateUserUI();
    renderApp();
    renderCoverageTable();
}

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('navUserName').innerText = currentUser.name;
    document.getElementById('navUserRole').innerText = currentUser.role;
    document.getElementById('navUserAvatar').src = currentUser.avatar;

    const isSuperAdmin = currentUser.role === 'Super Admin';
    document.getElementById('btnHeaderBackup').style.display = isSuperAdmin ? 'flex' : 'none';
    document.getElementById('btnHeaderRestore').style.display = isSuperAdmin ? 'flex' : 'none';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function switchNav(viewType) {
    const mainView = document.getElementById('mainDashboardView');
    const coverageView = document.getElementById('coverageView');
    const headerTitle = document.getElementById('headerTitle');
    const linkDashboard = document.getElementById('navLinkDashboard');
    const linkCoverage = document.getElementById('navLinkCoverage');

    if (viewType === 'coverage') {
        mainView.classList.add('hidden');
        coverageView.classList.remove('hidden');
        headerTitle.innerText = "Manajemen Cek Coverage Metro ISP";
        linkCoverage.className = "flex items-center px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg";
        linkDashboard.className = "flex items-center px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition";
    } else {
        mainView.classList.remove('hidden');
        coverageView.classList.add('hidden');
        headerTitle.innerText = "Monitoring & Daily Report Gangguan Mitra";
        linkDashboard.className = "flex items-center px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 rounded-lg";
        linkCoverage.className = "flex items-center px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition";
    }

    // Auto close sidebar on mobile
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
        }
    }
}

// ==========================================
// MODAL CONTROLLER
// ==========================================
function openIncidentModal(isEdit = false) {
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) sidebar.classList.add('-translate-x-full');
    }
    const modal = document.getElementById('incidentModal');
    const titleText = document.getElementById('modalTitleText');
    if (modal) {
        modal.classList.remove('hidden');
        if (titleText) titleText.textContent = isEdit ? "Edit Daily Report Gangguan" : "Form Input Daily Report Gangguan";
    }
}

function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) modal.classList.add('hidden');
    resetForm();
}

function openCoverageModal() {
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) sidebar.classList.add('-translate-x-full');
    }
    const modal = document.getElementById('coverageModal');
    if (modal) modal.classList.remove('hidden');
}

function closeCoverageModal() {
    const modal = document.getElementById('coverageModal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('coverageForm');
    if (form) form.reset();
    const editId = document.getElementById('editCoverageId');
    if (editId) editId.value = '';
}

// ==========================================
// STORAGE & DATABASE (SUPABASE)
// ==========================================
async function loadFromStorage() {
    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .select('*')
            .order('tanggal_kejadian', { ascending: false })
            .order('jam_kejadian', { ascending: false });

        if (error) throw error;

        incidents = (data || []).map(item => ({
            id: item.id,
            tanggal: parseDateToYYYYMMDD(item.tanggal_kejadian) || item.tanggal_kejadian,
            tanggalSelesai: parseDateToYYYYMMDD(item.tanggal_solved) || item.tanggal_solved,
            mitra: item.nama_mitra,
            idPelanggan: item.id_pelanggan,
            sumber: item.sumber_masalah,
            kategori: item.detail_kategori,
            jamMulai: parseTimeToHHMM(item.jam_kejadian) || item.jam_kejadian,
            jamSelesai: parseTimeToHHMM(item.jam_solved) || item.jam_solved,
            downtime_formatted: item.downtime_formatted,
            downtimeText: item.downtime_formatted,
            keterangan: item.keterangan,
            status: item.status_ticket,
            createdBy: item.created_by || 'SYSTEM'
        }));
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(incidents));
    } catch (err) {
        console.error('Gagal load tickets dari Supabase:', err.message);
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            try {
                incidents = JSON.parse(stored);
                if (!Array.isArray(incidents)) incidents = [];
            } catch (e) { incidents = []; }
        } else {
            incidents = [];
        }
    }
}

async function loadCoverageFromStorage() {
    try {
        const { data, error } = await supabaseClient
            .from('coverage_requests')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        coverageRequests = (data || []).map(item => {
            let vDetails = item.vendor_details || {};
            if (typeof vDetails === 'string') {
                try { vDetails = JSON.parse(vDetails); } catch (e) { vDetails = {}; }
            }
            return {
                id: item.id,
                tanggal_request: item.tanggal_request || '-',
                nama_mitra: item.nama_mitra || '',
                tikor_mitra: item.tikor_mitra || '',
                kapasitas_bandwidth: item.kapasitas_bandwidth || '',
                vendors: Array.isArray(item.vendors) ? item.vendors : [],
                status_req: item.status_req || 'Menunggu Cek',
                tikor_bts_pop: item.tikor_bts_pop || '-',
                jarak_tikor: item.jarak_tikor || '-',
                vendor_details: vDetails
            };
        });
        
        localStorage.setItem('mahawira_coverage_requests', JSON.stringify(coverageRequests));
    } catch (err) {
        console.error('Gagal load coverage dari Supabase:', err.message);
        const stored = localStorage.getItem('mahawira_coverage_requests');
        if (stored) {
            try {
                coverageRequests = JSON.parse(stored);
                if (!Array.isArray(coverageRequests)) coverageRequests = [];
            } catch (e) { coverageRequests = []; }
        } else {
            coverageRequests = [];
        }
    }
}

// SETUP REALTIME SUPABASE UNTUK TICKETS
function initTicketsRealtime() {
    try {
        supabaseClient
            .channel('public:tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                loadFromStorage().then(() => {
                    renderApp();
                });
            })
            .subscribe();
    } catch (e) {
        console.error('Tickets realtime subscription error:', e);
    }
}

// SETUP REALTIME SUPABASE UNTUK COVERAGE
function initCoverageRealtime() {
    try {
        supabaseClient
            .channel('public:coverage_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coverage_requests' }, () => {
                loadCoverageFromStorage().then(() => {
                    renderCoverageTable();
                });
            })
            .subscribe();
    } catch (e) {
        console.error('Coverage realtime subscription error:', e);
    }
}

async function saveToStorage(action, payload) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(incidents));
    try {
        if (action === 'INSERT' || action === 'UPDATE') {
            const { error } = await supabaseClient.from('tickets').upsert([payload], { onConflict: 'id' });
            if (error) throw error;
        } else if (action === 'DELETE') {
            const { error } = await supabaseClient.from('tickets').delete().eq('id', payload);
            if (error) throw error;
        }
    } catch (err) {
        console.error('Gagal sinkronisasi ke Supabase:', err.message);
    }
}

function updateSubCategoryOptions(selectedSub = '') {
    const sumberSelect = document.getElementById('inputSumber');
    const kategoriSelect = document.getElementById('inputKategori');
    if (!sumberSelect || !kategoriSelect) return;
    
    const sumber = sumberSelect.value;
    kategoriSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';

    if (sumber && SUB_CATEGORIES[sumber]) {
        SUB_CATEGORIES[sumber].forEach(kat => {
            const option = document.createElement('option');
            option.value = kat;
            option.textContent = kat;
            if (kat === selectedSub) option.selected = true;
            kategoriSelect.appendChild(option);
        });
        if (!selectedSub && SUB_CATEGORIES[sumber].length > 0) kategoriSelect.value = SUB_CATEGORIES[sumber][0];
    }
}

function handleStatusChange() {
    const status = document.getElementById('inputStatus').value;
    const tanggalSelesai = document.getElementById('inputTanggalSelesai');
    const jamSelesai = document.getElementById('inputJamSelesai');
    
    if (status === 'Resolved') {
        if (!tanggalSelesai.value) {
            tanggalSelesai.value = document.getElementById('inputTanggal').value || CONFIG.DEFAULT_DATE;
        }
        if (!jamSelesai.value) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            jamSelesai.value = `${hh}:${mm}`;
        }
        calculateDowntime();
    } else {
        jamSelesai.value = '';
        document.getElementById('inputDowntime').value = '';
    }
}

function calculateDowntime() {
    const rawTglMulai = document.getElementById('inputTanggal')?.value;
    const rawJamMulai = document.getElementById('inputJamMulai')?.value;
    const rawTglSelesai = document.getElementById('inputTanggalSelesai')?.value;
    const rawJamSelesai = document.getElementById('inputJamSelesai')?.value;
    const downtimeInput = document.getElementById('inputDowntime');
    if (!downtimeInput) return;

    const tglMulai = parseDateToYYYYMMDD(rawTglMulai);
    const tglSelesai = parseDateToYYYYMMDD(rawTglSelesai);
    const jamMulai = parseTimeToHHMM(rawJamMulai);
    const jamSelesai = parseTimeToHHMM(rawJamSelesai);

    // Reset warna teks
    downtimeInput.classList.remove('text-rose-600');
    downtimeInput.classList.add('text-emerald-600');

    // Jika waktu mulai belum diisi
    if (!tglMulai || !jamMulai) {
        downtimeInput.value = '';
        return;
    }

    // Jika waktu selesai belum diisi (misal status tiket masih Pending / Open)
    if (!tglSelesai || !jamSelesai) {
        downtimeInput.value = '';
        return;
    }

    const startDateTime = new Date(`${tglMulai}T${jamMulai}:00`);
    const endDateTime = new Date(`${tglSelesai}T${jamSelesai}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        downtimeInput.classList.remove('text-emerald-600');
        downtimeInput.classList.add('text-rose-600');
        downtimeInput.value = "Error: Format jam/tanggal tidak valid!";
        return;
    }

    if (endDateTime < startDateTime) {
        downtimeInput.classList.remove('text-emerald-600');
        downtimeInput.classList.add('text-rose-600');
        downtimeInput.value = "Error: Waktu selesai lebih awal!";
        return;
    }

    const diffMs = endDateTime - startDateTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let hasil = [];
    if (diffDays > 0) hasil.push(`${diffDays} Hari`);
    if (diffHours > 0) hasil.push(`${diffHours} Jam`);
    if (diffMinutes > 0) hasil.push(`${diffMinutes} Menit`);
    
    downtimeInput.value = hasil.length === 0 ? "0 Menit" : hasil.join(" ");
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const editIndex = parseInt(document.getElementById('editIndex').value, 10);
    const sumberValue = document.getElementById('inputSumber').value;
    let kategoriValue = document.getElementById('inputKategori').value;
    const statusValue = document.getElementById('inputStatus').value;
    const jamMulaiValue = parseTimeToHHMM(document.getElementById('inputJamMulai').value);
    const jamSelesaiValue = parseTimeToHHMM(document.getElementById('inputJamSelesai').value);
    const tanggalMulaiValue = parseDateToYYYYMMDD(document.getElementById('inputTanggal').value);
    const tanggalSelesaiValue = parseDateToYYYYMMDD(document.getElementById('inputTanggalSelesai').value);

    if (statusValue === 'Resolved' && (!jamSelesaiValue || !tanggalSelesaiValue)) {
        showToast("Untuk menutup tiket (Resolved), Tanggal Selesai dan Jam Solved wajib diisi!", "warning");
        return;
    }

    if (!kategoriValue && SUB_CATEGORIES[sumberValue]) kategoriValue = SUB_CATEGORIES[sumberValue][0];

    calculateDowntime();
    const downtimeText = document.getElementById('inputDowntime').value;

    let downtimeMenitInt = 0;
    if (downtimeText && !downtimeText.includes("Error")) {
        const mDays = downtimeText.match(/(\d+)\s*Hari/);
        const mHours = downtimeText.match(/(\d+)\s*Jam/);
        const mMins = downtimeText.match(/(\d+)\s*Menit/);
        const days = mDays ? parseInt(mDays[1], 10) : 0;
        const hours = mHours ? parseInt(mHours[1], 10) : 0;
        const mins = mMins ? parseInt(mMins[1], 10) : 0;
        downtimeMenitInt = (days * 24 * 60) + (hours * 60) + mins;
    }

    const supabasePayload = {
        tanggal_kejadian: tanggalMulaiValue,
        tanggal_solved: tanggalSelesaiValue || null,
        nama_mitra: document.getElementById('inputMitra').value.trim().toUpperCase(),
        id_pelanggan: document.getElementById('inputIdPelanggan').value.trim().toUpperCase(),
        sumber_masalah: sumberValue,
        detail_kategori: kategoriValue ? kategoriValue.toUpperCase() : '',
        jam_kejadian: jamMulaiValue || null,
        jam_solved: jamSelesaiValue || null,
        downtime_menit: downtimeMenitInt,
        downtime_formatted: downtimeText,
        keterangan: document.getElementById('inputKeterangan').value.trim().toUpperCase(),
        status_ticket: statusValue,
        created_by: document.getElementById('inputOperator') ? document.getElementById('inputOperator').value.toUpperCase() : (currentUser ? currentUser.name.toUpperCase() : 'SYSTEM')
    };

    if (editIndex >= 0) {
        const existingId = incidents[editIndex].id;
        supabasePayload.id = existingId; 
        
        await saveToStorage('UPDATE', supabasePayload);
        
        incidents[editIndex] = {
            ...incidents[editIndex],        
            tanggal: supabasePayload.tanggal_kejadian,
            tanggalSelesai: supabasePayload.tanggal_solved,
            mitra: supabasePayload.nama_mitra,
            idPelanggan: supabasePayload.id_pelanggan,
            sumber: supabasePayload.sumber_masalah,
            kategori: supabasePayload.detail_kategori,
            jamMulai: supabasePayload.jam_kejadian,
            jamSelesai: supabasePayload.jam_solved,
            downtime_formatted: supabasePayload.downtime_formatted,
            downtimeText: supabasePayload.downtime_formatted,
            keterangan: supabasePayload.keterangan,
            status: supabasePayload.status_ticket,
            createdBy: supabasePayload.created_by
        };
        showToast("Laporan gangguan berhasil diperbarui!", "success");
    } else {
        supabasePayload.id = Date.now(); 
        
        await saveToStorage('INSERT', supabasePayload);
        
        incidents.unshift({
            id: supabasePayload.id,
            tanggal: supabasePayload.tanggal_kejadian,
            tanggalSelesai: supabasePayload.tanggal_solved,
            mitra: supabasePayload.nama_mitra,
            idPelanggan: supabasePayload.id_pelanggan,
            sumber: supabasePayload.sumber_masalah,
            kategori: supabasePayload.detail_kategori,
            jamMulai: supabasePayload.jam_kejadian,
            jamSelesai: supabasePayload.jam_solved,
            downtime_formatted: supabasePayload.downtime_formatted,
            downtimeText: supabasePayload.downtime_formatted,
            keterangan: supabasePayload.keterangan,
            status: supabasePayload.status_ticket,
            createdBy: supabasePayload.created_by 
        });
        showToast("Laporan gangguan baru berhasil disimpan!", "success");
    }

    closeIncidentModal(); 
    renderApp();
}

function resetForm() {
    const form = document.getElementById('incidentForm');
    if (form) form.reset();
    document.getElementById('editIndex').value = -1;
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Simpan Report';
    
    document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    document.getElementById('inputTanggalSelesai').value = CONFIG.DEFAULT_DATE;
    document.getElementById('inputStatus').value = 'Pending';
    document.getElementById('inputDowntime').value = '';
    if (document.getElementById('inputOperator') && currentUser) {
        document.getElementById('inputOperator').value = currentUser.name.toUpperCase();
    }
    
    updateSubCategoryOptions();
}

function editRecord(id) {
    const index = incidents.findIndex(item => String(item.id) === String(id));
    if (index === -1) return;

    const item = incidents[index];
    document.getElementById('editIndex').value = index;

    const cleanTglMulai = parseDateToYYYYMMDD(item.tanggal) || CONFIG.DEFAULT_DATE;
    const cleanTglSelesai = parseDateToYYYYMMDD(item.tanggalSelesai) || cleanTglMulai;
    const cleanJamMulai = parseTimeToHHMM(item.jamMulai);
    const cleanJamSelesai = parseTimeToHHMM(item.jamSelesai);

    document.getElementById('inputTanggal').value = cleanTglMulai;
    document.getElementById('inputTanggalSelesai').value = cleanTglSelesai;
    document.getElementById('inputMitra').value = item.mitra || '';
    document.getElementById('inputIdPelanggan').value = item.idPelanggan || '';
    document.getElementById('inputSumber').value = item.sumber || '';
    
    updateSubCategoryOptions(item.kategori);
    
    document.getElementById('inputJamMulai').value = cleanJamMulai;
    document.getElementById('inputJamSelesai').value = cleanJamSelesai;
    document.getElementById('inputKeterangan').value = item.keterangan || '';
    document.getElementById('inputStatus').value = item.status || 'Pending';

    if (document.getElementById('inputOperator')) {
        document.getElementById('inputOperator').value = (item.createdBy || '').toUpperCase();
    }

    calculateDowntime();

    // Jika downtime kosong (misal tiket masih pending), tampilkan nilai yang tersimpan sebelumnya jika ada
    const dtInput = document.getElementById('inputDowntime');
    if (dtInput && !dtInput.value && (item.downtimeText || item.downtime_formatted)) {
        dtInput.value = item.downtimeText || item.downtime_formatted;
    }

    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-pen-to-square mr-2"></i> Update Report';
    openIncidentModal(true); 
}

async function deleteRecord(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data gangguan ini?')) {
        await saveToStorage('DELETE', id);
        incidents = incidents.filter(item => String(item.id) !== String(id));
        renderApp();
        showToast("Data gangguan berhasil dihapus.", "success");
    }
}

function showDetail(id) {
    const item = incidents.find(i => String(i.id) === String(id));
    if (!item) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Mitra</span> <strong class="text-slate-700">${escapeHtml(item.mitra)}</strong></div>
            <div><span class="text-xs text-slate-400 block">ID Pelanggan</span> <code class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">${escapeHtml(item.idPelanggan)}</code></div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Tanggal Kejadian</span> ${escapeHtml(item.tanggal)} (${escapeHtml(item.jamMulai || '-')})</div>
            <div><span class="text-xs text-slate-400 block">Tanggal Selesai</span> ${escapeHtml(item.tanggalSelesai || '-')} (${escapeHtml(item.jamSelesai || '-')})</div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Sumber Gangguan</span> <span class="font-semibold ${item.sumber==='Metro'?'text-rose-600':'text-amber-600'}">${escapeHtml(item.sumber)}</span></div>
            <div><span class="text-xs text-slate-400 block">Estimasi Downtime</span> <span class="font-bold text-emerald-600">${escapeHtml(item.downtimeText || item.downtime_formatted || '-')}</span></div>
        </div>
        <div>
            <span class="text-xs text-slate-400 block mb-1">Specific Category</span>
            <p class="font-semibold text-slate-700">${escapeHtml(item.kategori)}</p>
        </div>
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span class="text-xs text-slate-400 block mb-1">Catatan Troubleshooting / Root Cause</span>
            <p class="text-xs text-slate-600 italic whitespace-pre-wrap">${escapeHtml(item.keterangan || 'TIDAK ADA CATATAN TAMBAHAN.')}</p>
        </div>
        <div class="text-[11px] text-slate-400 pt-1">
            Input / Updated by: <span class="font-medium text-slate-600">${escapeHtml(item.createdBy || 'SYSTEM')}</span>
        </div>
    `;
    document.getElementById('detailModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

function clearFilter() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterSumber').value = 'All';
    document.getElementById('filterStatus').value = 'All';
    renderApp();
}

function getFilteredIncidents() {
    const search = document.getElementById('filterSearch').value.toLowerCase();
    const month = document.getElementById('filterMonth').value;
    const sumber = document.getElementById('filterSumber').value;
    const status = document.getElementById('filterStatus').value;

    return incidents.filter(item => {
        const matchSearch = (item.mitra || '').toLowerCase().includes(search) || 
                            (item.idPelanggan || '').toLowerCase().includes(search) || 
                            (item.kategori || '').toLowerCase().includes(search) ||
                            (item.keterangan || '').toLowerCase().includes(search);
        
        // Filter bulan: jika user memilih bulan spesifik, hanya tampilkan bulan tersebut
        const matchMonth = !month || (item.tanggal && item.tanggal.startsWith(month));
        
        const matchSumber = sumber === 'All' || item.sumber === sumber;
        const matchStatus = status === 'All' || item.status === status;

        return matchSearch && matchMonth && matchSumber && matchStatus;
    });
}

function renderApp() {
    const filtered = getFilteredIncidents();

    const todayStr = CONFIG.DEFAULT_DATE;
    const todayIncidents = incidents.filter(i => i.tanggal === todayStr);
    document.getElementById('statToday').innerText = todayIncidents.length;
    const todayResolved = todayIncidents.filter(i => i.status === 'Resolved').length;
    document.getElementById('statTodayBadge').innerText = `${todayResolved} Solved / ${todayIncidents.length - todayResolved} Open`;

    document.getElementById('statMetro').innerText = incidents.filter(i => i.sumber === 'Metro').length;
    document.getElementById('statMikrotik').innerText = incidents.filter(i => i.sumber === 'Mikrotik').length;

    let totalDowntimeMinutes = 0;
    incidents.forEach(item => {
        const textDt = item.downtimeText || item.downtime_formatted;
        if (textDt) {
            const mDays = textDt.match(/(\d+)\s*Hari/);
            const mHours = textDt.match(/(\d+)\s*Jam/);
            const mMins = textDt.match(/(\d+)\s*Menit/);
            const days = mDays ? parseInt(mDays[1], 10) : 0;
            const hours = mHours ? parseInt(mHours[1], 10) : 0;
            const mins = mMins ? parseInt(mMins[1], 10) : 0;
            totalDowntimeMinutes += (days * 24 * 60) + (hours * 60) + mins;
        }
    });

    document.getElementById('statDowntime').innerText = `${totalDowntimeMinutes} Menit`;
    document.getElementById('statDowntimeHours').innerText = `~${(totalDowntimeMinutes/60).toFixed(1)} Jam Accumulated`;

    const totalPages = Math.ceil(filtered.length / CONFIG.ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const pageData = filtered.slice(startIdx, startIdx + CONFIG.ITEMS_PER_PAGE);

    const tbody = document.getElementById('incidentTableBody');
    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Tidak ada data gangguan ditemukan</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');
            const isPending = item.status === 'Pending';
            tr.className = `hover:bg-slate-50 transition border-b border-slate-100 ${isPending ? 'bg-amber-50/50' : ''}`;
            
            const tglMulai = item.tanggal || '-';
            const jamMulai = item.jamMulai || '--:--';
            const tglSelesai = item.tanggalSelesai || '-';
            const jamSelesai = item.jamSelesai || '--:--';

            const isSameDay = tglMulai === tglSelesai;
            const timeDisplay = isSameDay 
                ? `${escapeHtml(tglMulai)} <br> <span class="text-[10px] text-slate-400 font-medium">${escapeHtml(jamMulai)} - ${escapeHtml(jamSelesai)}</span>`
                : `${escapeHtml(tglMulai)} ${escapeHtml(jamMulai)} <br> <span class="text-[10px] text-amber-600 font-medium">s/d ${escapeHtml(tglSelesai)} ${escapeHtml(jamSelesai)}</span>`;

            tr.innerHTML = `
                <td class="p-3 whitespace-nowrap text-slate-600 font-mono text-xs">${timeDisplay}</td>
                <td class="p-3">
                    <div class="font-bold text-slate-700">${escapeHtml(item.mitra)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.idPelanggan)}</div>
                </td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full ${item.sumber === 'Metro' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}">
                        ${escapeHtml(item.sumber)}
                    </span>
                </td>
                <td class="p-3 text-slate-600 max-w-xs truncate" title="${escapeHtml(item.kategori)}">${escapeHtml(item.kategori)}</td>
                <td class="p-3 font-semibold text-sky-600">${escapeHtml(item.downtimeText || item.downtime_formatted || '-')}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-medium rounded ${item.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'}">
                        ${item.status === 'Pending' ? 'OPEN / Pending' : 'Resolved'}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        <button onclick="showDetail('${item.id}')" class="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sky-600 transition" title="Detail"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="editRecord('${item.id}')" class="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-amber-600 transition" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteRecord('${item.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-100 rounded text-rose-600 transition" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('tableInfo').innerText = `Menampilkan ${filtered.length === 0 ? 0 : startIdx + 1} - ${Math.min(startIdx + CONFIG.ITEMS_PER_PAGE, filtered.length)} dari ${filtered.length} total gangguan`;
    document.getElementById('pageIndicator').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('btnPrevPage').disabled = currentPage === 1;
    document.getElementById('btnNextPage').disabled = currentPage === totalPages;

    renderCharts();
}

function changePage(delta) {
    currentPage += delta;
    renderApp();
}

function renderCharts() {
    const mitraCountMap = {};
    incidents.forEach(i => {
        if (i.mitra) mitraCountMap[i.mitra] = (mitraCountMap[i.mitra] || 0) + 1;
    });
    const sortedMitra = Object.entries(mitraCountMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (topMitraChartInstance) topMitraChartInstance.destroy();
    const ctx1 = document.getElementById('topMitraChart')?.getContext('2d');
    if (ctx1) {
        topMitraChartInstance = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: sortedMitra.map(x => x[0]),
                datasets: [{
                    label: 'Jumlah Gangguan',
                    data: sortedMitra.map(x => x[1]),
                    backgroundColor: '#0284c7',
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: '#f1f5f9' } }, y: { ticks: { color: '#334155' }, grid: { display: false } } } }
        });
    }

    const metroCount = incidents.filter(i => i.sumber === 'Metro').length;
    const mikrotikCount = incidents.filter(i => i.sumber === 'Mikrotik').length;

    if (sourceRatioChartInstance) sourceRatioChartInstance.destroy();
    const ctx2 = document.getElementById('sourceRatioChart')?.getContext('2d');
    if (ctx2) {
        sourceRatioChartInstance = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Sisi Metro', 'Sisi Mikrotik'],
                datasets: [{ data: [metroCount, mikrotikCount], backgroundColor: ['#e11d48', '#f59e0b'], borderWidth: 2, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } } }
        });
    }

    const trendMap = {};
    incidents.forEach(i => { if (i.tanggal) trendMap[i.tanggal] = (trendMap[i.tanggal] || 0) + 1; });
    const sortedDates = Object.keys(trendMap).sort().slice(-10);

    if (dailyTrendChartInstance) dailyTrendChartInstance.destroy();
    const ctx3 = document.getElementById('dailyTrendChart')?.getContext('2d');
    if (ctx3) {
        dailyTrendChartInstance = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{ label: 'Insiden', data: sortedDates.map(d => trendMap[d]), borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.08)', fill: true, tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } }, y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: '#f1f5f9' } } } }
        });
    }
}

function openExportModal() {
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) sidebar.classList.add('-translate-x-full');
    }
    const selectMonth = document.getElementById('exportMonthSelect');
    if (!selectMonth) return;
    selectMonth.innerHTML = '<option value="ALL">Semua Bulan (All Time)</option>';

    const monthsSet = new Set();
    incidents.forEach(item => { if (item.tanggal && item.tanggal.length >= 7) monthsSet.add(item.tanggal.substring(0, 7)); });

    Array.from(monthsSet).sort().reverse().forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = `Bulan ${m}`;
        selectMonth.appendChild(option);
    });

    document.getElementById('exportModal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

function confirmExportToExcel() {
    const selectedMonth = document.getElementById('exportMonthSelect').value;
    const selectedStatus = document.getElementById('exportStatusSelect').value;

    let exportData = incidents;

    if (selectedMonth !== 'ALL') {
        exportData = exportData.filter(i => (i.tanggal && i.tanggal.startsWith(selectedMonth)));
    }
    if (selectedStatus !== 'ALL') {
        exportData = exportData.filter(i => i.status === selectedStatus);
    }

    if (exportData.length === 0) {
        showToast('Tidak ada data yang sesuai dengan kriteria filter.', 'warning');
        return;
    }

    const excelRows = exportData.map((item, index) => ({
        'No': index + 1,
        'Tgl Kejadian': item.tanggal,
        'Jam Start': item.jamMulai,
        'Tgl Selesai': item.tanggalSelesai || '-',
        'Jam End': item.jamSelesai || 'Ongoing',
        'Nama Mitra': item.mitra,
        'ID Pelanggan / IP': item.idPelanggan,
        'Sumber Masalah': item.sumber,
        'Kategori Issue': item.kategori,
        'Durasi Downtime': item.downtimeText || item.downtime_formatted || '-',
        'Catatan / Root Cause': item.keterangan,
        'Status Ticket': item.status,
        'Operator NOC': item.createdBy || 'SYSTEM'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gangguan Mitra");

    const dateStr = selectedMonth === 'ALL' ? 'All_Time' : selectedMonth;
    XLSX.writeFile(workbook, `Report_Gangguan_ISP_Mitra_${dateStr}.xlsx`);
    closeExportModal();
    showToast("File Excel berhasil didownload!", "success");
}

async function backupJSON() {
    if (currentUser && currentUser.role !== 'Super Admin') {
        showToast('Akses Ditolak: Hanya Super Admin yang dapat mendownload backup JSON.', 'error');
        return;
    }
    if (incidents.length === 0) {
        showToast('Tidak ada data untuk dibackup.', 'warning');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_isp_incidents_${CONFIG.DEFAULT_DATE}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup JSON berhasil didownload!", "success");
}

async function restoreJSON(e) {
    if (currentUser && currentUser.role !== 'Super Admin') {
        showToast('Akses Ditolak: Hanya Super Admin yang dapat melakukan Restore data.', 'error');
        return;
    }
    const fileReader = new FileReader();
    fileReader.onload = async function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                const payload = parsedData.map(item => {
                    const textDt = item.downtimeText || item.downtime_formatted || '';
                    let downtimeMenitInt = 0;
                    if (textDt) {
                        const mDays = textDt.match(/(\d+)\s*Hari/);
                        const mHours = textDt.match(/(\d+)\s*Jam/);
                        const mMins = textDt.match(/(\d+)\s*Menit/);
                        const days = mDays ? parseInt(mDays[1], 10) : 0;
                        const hours = mHours ? parseInt(mHours[1], 10) : 0;
                        const mins = mMins ? parseInt(mMins[1], 10) : 0;
                        downtimeMenitInt = (days * 24 * 60) + (hours * 60) + mins;
                    }

                    return {
                        id: item.id || Date.now() + Math.floor(Math.random() * 1000),
                        tanggal_kejadian: item.tanggal || item.tanggal_kejadian,
                        tanggal_solved: item.tanggalSelesai || item.tanggal_solved || null,
                        nama_mitra: (item.mitra || item.nama_mitra || '').toUpperCase(),
                        id_pelanggan: (item.idPelanggan || item.id_pelanggan || '').toUpperCase(),
                        sumber_masalah: item.sumber || item.sumber_masalah,
                        detail_kategori: (item.kategori || item.detail_kategori || '').toUpperCase(),
                        jam_kejadian: item.jamMulai || item.jam_kejadian || null,
                        jam_solved: item.jamSelesai || item.jam_solved || null,
                        downtime_menit: downtimeMenitInt, 
                        downtime_formatted: textDt,
                        keterangan: (item.keterangan || '').toUpperCase(),
                        status_ticket: item.status || item.status_ticket,
                        created_by: (item.createdBy || item.created_by || 'SYSTEM').toUpperCase()
                    };
                });

                const { error } = await supabaseClient
                    .from('tickets')
                    .upsert(payload, { onConflict: 'id' });

                if (error) throw error;

                showToast('Data berhasil di-restore ke Supabase!', 'success');
                await loadFromStorage(); 
                renderApp();
            } else {
                showToast('Format file JSON tidak valid.', 'error');
            }
        } catch (err) {
            showToast('Gagal membaca file JSON: ' + err.message, 'error');
        } finally {
            if (e.target) e.target.value = '';
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}

async function loadOperators() {
    const select = document.getElementById('inputOperator');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';

    let loaded = false;
    try {
        const { data, error } = await supabaseClient
            .from('operators')
            .select('*')
            .order('name', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
            data.forEach(op => {
                const option = document.createElement('option');
                option.value = op.name.toUpperCase();
                option.textContent = op.name.toUpperCase();
                select.appendChild(option);
            });
            loaded = true;
        }
    } catch (err) {
        console.warn('Gagal memuat operator dari Supabase:', err.message);
    }

    // Fallback jika data operators kosong
    if (!loaded) {
        USERS.forEach(u => {
            const option = document.createElement('option');
            option.value = u.name.toUpperCase();
            option.textContent = u.name.toUpperCase();
            select.appendChild(option);
        });
    }

    // Pastikan user saat ini ada di pilihan
    if (currentUser && currentUser.name) {
        const exists = Array.from(select.options).some(o => o.value === currentUser.name.toUpperCase());
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = currentUser.name.toUpperCase();
            opt.textContent = currentUser.name.toUpperCase();
            select.appendChild(opt);
        }
    }

    if (currentVal) {
        select.value = currentVal;
    } else if (currentUser && currentUser.name) {
        select.value = currentUser.name.toUpperCase();
    }
}

// ==========================================
// MODUL CEK COVERAGE METRO (7 VENDOR)
// ==========================================
const ISP_VENDORS = [
    "Telkom",
    "XL",
    "Indosat",
    "Fiber Star",
    "HSP",
    "Lintasarta",
    "iForte"
];

async function handleCoverageSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById("editCoverageId")?.value;
    const namaMitra = document.getElementById("covMitra")?.value.trim().toUpperCase() || "";
    const kapasitas = document.getElementById("covKapasitas")?.value.trim().toUpperCase() || "";
    const tikorMitra = document.getElementById("covTikor")?.value.trim() || "";
    const statusReq = document.getElementById("covStatus")?.value || "Menunggu Cek";
    const tikorBts = document.getElementById("covTikorBts")?.value.trim().toUpperCase() || "-";
    const jarakTikor = document.getElementById("covJarak")?.value.trim().toUpperCase() || "-";

    const selectedVendors = Array.from(document.querySelectorAll('input[name="ispVendor"]:checked')).map(el => el.value);

    if (selectedVendors.length === 0) {
        showToast("Pilih minimal 1 Vendor ISP Tujuan!", "warning");
        return;
    }

    // Pertahankan vendor_details dan tgl request saat mode edit
    let existingVendorDetails = {};
    let tglRequest = "";

    if (editId) {
        const existing = coverageRequests.find(c => String(c.id) === String(editId));
        if (existing) {
            existingVendorDetails = existing.vendor_details || {};
            tglRequest = existing.tanggal_request || "";
        }
    }

    if (!tglRequest || tglRequest === '-') {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        tglRequest = `${dd}-${mm}-${yyyy}`;
    }

    const coveragePayload = {
        tanggal_request: tglRequest,
        nama_mitra: namaMitra,
        tikor_mitra: tikorMitra,
        kapasitas_bandwidth: kapasitas,
        vendors: selectedVendors,
        status_req: statusReq,
        tikor_bts_pop: tikorBts,
        jarak_tikor: jarakTikor,
        vendor_details: existingVendorDetails
    };

    // 1. KIRIM KE GOOGLE SHEETS (Secara paralel via Promise.allSettled)
    const sheetPromises = selectedVendors.map(vendor => {
        const url = SHEETS_SCRIPT_URLS[vendor];
        if (!url || url.includes("URL_EXEC")) return Promise.resolve();

        const formData = new URLSearchParams();
        const sheetPayload = {
            tanggal_request: tglRequest,
            nama_mitra: vendor.toUpperCase(),
            tikor_mitra: tikorMitra,
            kapasitas_bandwidth: kapasitas,
            status_req: statusReq,
            tikor_bts_pop: tikorBts,
            jarak_tikor: jarakTikor
        };

        for (const key in sheetPayload) {
            formData.append(key, sheetPayload[key]);
        }

        return fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        }).catch(err => console.warn(`Gagal kirim ke ${vendor}:`, err.message));
    });

    await Promise.allSettled(sheetPromises);

    // 2. SIMPAN KE SUPABASE
    try {
        if (editId) {
            const { error } = await supabaseClient.from('coverage_requests').update(coveragePayload).eq('id', editId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('coverage_requests').insert([coveragePayload]);
            if (error) throw error;
        }
        showToast("Data request coverage berhasil disimpan!", "success");
    } catch (err) {
        console.error("Gagal simpan ke Supabase:", err.message);
        showToast("Gagal simpan ke database: " + err.message, "error");
    }

    closeCoverageModal();
    await loadCoverageFromStorage();
    renderCoverageTable();
}

function renderCoverageTable() {
    const tbody = document.getElementById("coverageTableBody");
    if (!tbody) return;

    localStorage.setItem('mahawira_coverage_requests', JSON.stringify(coverageRequests));

    const searchVal = document.getElementById("filterCoverageSearch")?.value.toLowerCase() || "";
    const vendorVal = document.getElementById("filterCoverageVendor")?.value || "All";

    const filteredList = coverageRequests.filter(item => {
        const matchSearch = (item.nama_mitra || "").toLowerCase().includes(searchVal) || 
                            (item.tikor_mitra || "").toLowerCase().includes(searchVal);
        
        let matchVendor = true;
        if (vendorVal !== "All") {
            matchVendor = item.vendors && item.vendors.includes(vendorVal);
        }
        return matchSearch && matchVendor;
    });

    tbody.innerHTML = "";

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Tidak ada data request coverage ditemukan.</td></tr>`;
        return;
    }

    filteredList.forEach((item, index) => {
        let vendor_details = item.vendor_details || {};
        if (typeof vendor_details === 'string') {
            try { vendor_details = JSON.parse(vendor_details); } catch (e) { vendor_details = {}; }
        }

        let badgesHtml = "";
        const vendorsList = item.vendors || [];
        
        vendorsList.forEach(v => {
            const vendorKey = v.replace(/[^a-zA-Z]/g, '').toUpperCase();
            const data = vendor_details[vendorKey] || { status: 'Menunggu Cek', bts: '-', jarak: '-' };
            let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
            if (data.status === 'Cover') badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
            if (data.status === 'Not Cover') badgeColor = "bg-rose-100 text-rose-700 border-rose-200";

            const isClickableBts = data.bts && data.bts !== '-';

            badgesHtml += `
                <div class="flex items-center space-x-2 bg-white border border-slate-200 p-1.5 rounded mb-1 text-[11px] shadow-sm">
                    <span class="font-bold w-16 text-slate-700">${escapeHtml(v)}</span>
                    <span class="px-1.5 py-0.5 rounded border ${badgeColor} font-semibold w-24 text-center">${escapeHtml(data.status)}</span>
                    <span class="${isClickableBts ? 'text-sky-600 hover:underline cursor-pointer' : 'text-slate-400'} truncate w-32" 
                          title="${isClickableBts ? 'Klik untuk buka Maps' : ''}" 
                          ${isClickableBts ? `onclick="openMapLink('${escapeHtml(data.bts)}')"` : ''}>
                          ${escapeHtml(data.bts)}
                    </span>
                    <span class="text-slate-500 w-16">${escapeHtml(data.jarak)}</span>
                </div>
            `;
        });

        const isClickableTikor = item.tikor_mitra && item.tikor_mitra !== '-';

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
        tr.innerHTML = `
            <td class="p-3 font-medium text-slate-600">${index + 1}</td>
            <td class="p-3 font-mono text-xs">${escapeHtml(item.tanggal_request || '-')}</td>
            <td class="p-3 font-semibold text-slate-800">${escapeHtml(item.nama_mitra || '-')}</td>
            <td class="p-3 ${isClickableTikor ? 'text-sky-600 hover:underline cursor-pointer' : 'text-slate-400'} font-mono text-xs" 
                ${isClickableTikor ? `onclick="openMapLink('${escapeHtml(item.tikor_mitra)}')"` : ''}>
                ${escapeHtml(item.tikor_mitra || '-')}
            </td>
            <td class="p-3 font-medium">${escapeHtml(item.kapasitas_bandwidth || '-')}</td>
            <td class="p-3">${badgesHtml || '-'}</td>
            <td class="p-3 text-center space-x-1 align-top">
                <button onclick="editCoverage('${item.id}')" class="text-sky-600 hover:text-sky-800 p-1" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteCoverage('${item.id}')" class="text-rose-600 hover:text-rose-800 p-1" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editCoverage(id) {
    const item = coverageRequests.find(c => String(c.id) === String(id));
    if (!item) return;

    document.getElementById('editCoverageId').value = item.id;
    document.getElementById('covMitra').value = item.nama_mitra;
    document.getElementById('covKapasitas').value = item.kapasitas_bandwidth;
    document.getElementById('covTikor').value = item.tikor_mitra;
    document.getElementById('covStatus').value = item.status_req;
    document.getElementById('covTikorBts').value = item.tikor_bts_pop;
    document.getElementById('covJarak').value = item.jarak_tikor;

    const checkboxes = document.querySelectorAll('input[name="ispVendor"]');
    checkboxes.forEach(cb => {
        cb.checked = item.vendors && item.vendors.includes(cb.value);
    });

    openCoverageModal();
}

async function deleteCoverage(id) {
    if (confirm("Apakah Anda ingin menghapus request coverage ini?")) {
        try {
            const { error } = await supabaseClient.from('coverage_requests').delete().eq('id', id);
            if (error) throw error;
            
            coverageRequests = coverageRequests.filter(i => String(i.id) !== String(id));
            renderCoverageTable();
            showToast("Request coverage berhasil dihapus.", "success");
        } catch (err) {
            showToast("Gagal menghapus data dari database: " + err.message, "error");
        }
    }
}

// ==========================================
// SINKRONISASI DUA ARAH: GOOGLE SHEETS ↔ SUPABASE
// ==========================================
let sheetsSyncInterval = null;
let isSyncing = false;

async function syncFromSheets() {
    if (isSyncing) return; 
    isSyncing = true;

    try {
        // Ambil data dari semua vendor secara paralel dengan timeout guard 7 detik
        const fetchPromises = SHEETS_READ_URLS.map(async (url) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000);
                const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) return [];
                const json = await res.json();
                if (json.status === 'ok' && Array.isArray(json.data)) {
                    return json.data;
                }
            } catch (e) {
                return [];
            }
            return [];
        });

        const settled = await Promise.allSettled(fetchPromises);
        const allSheetsData = [];
        settled.forEach(r => {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) {
                r.value.forEach(row => allSheetsData.push(row));
            }
        });

        if (allSheetsData.length === 0) return;

        const { data: existing, error: errExist } = await supabaseClient
            .from('coverage_requests')
            .select('*');

        if (errExist) throw errExist;

        const existingMap = new Map();
        (existing || []).forEach(e => {
            if (e.tikor_mitra) existingMap.set(e.tikor_mitra.replace(/\s+/g, ''), e);
        });

        let adaPerubahan = false;

        for (const row of allSheetsData) {
            if (!row.tikor_mitra || !row.nama_mitra) continue;
            
            const koordinatSheet = row.tikor_mitra.replace(/\s+/g, '');
            const existingRow = existingMap.get(koordinatSheet);

            if (existingRow) {
                let vendor_details = existingRow.vendor_details || {};
                if (typeof vendor_details === 'string') {
                    try { vendor_details = JSON.parse(vendor_details); } catch (e) { vendor_details = {}; }
                }

                const namaVendor = row.nama_mitra.replace(/[^a-zA-Z]/g, '').toUpperCase();
                const statusBaru = row.status_req || 'Menunggu Cek';
                const btsBaru = row.tikor_bts_pop || '-';
                const jarakBaru = row.jarak_tikor || '-';
                
                const oldVendorData = vendor_details[namaVendor] || {};
                
                if (oldVendorData.status !== statusBaru || 
                    oldVendorData.bts !== btsBaru || 
                    oldVendorData.jarak !== jarakBaru) {
                    
                    vendor_details[namaVendor] = {
                        status: statusBaru,
                        bts: btsBaru,
                        jarak: jarakBaru
                    };

                    const { error: errUpdate } = await supabaseClient
                        .from('coverage_requests')
                        .update({ vendor_details: vendor_details })
                        .eq('id', existingRow.id);

                    if (!errUpdate) {
                        console.log(`✅ Sinkron DB: ${namaVendor} -> ${statusBaru}`);
                        adaPerubahan = true;
                        
                        if (coverageRequests) {
                            const localRow = coverageRequests.find(c => String(c.id) === String(existingRow.id));
                            if (localRow) {
                                localRow.vendor_details = vendor_details;
                            }
                        }
                    }
                }
            }
        }

        if (adaPerubahan) {
            renderCoverageTable(); 
        }

    } catch (err) {
        console.warn('[SheetsSync] Gagal sinkron:', err.message);
    } finally {
        isSyncing = false;
    }
}

function startSheetsSync() {
    stopSheetsSync();
    syncFromSheets();
    sheetsSyncInterval = setInterval(syncFromSheets, CONFIG.SHEETS_SYNC_INTERVAL_MS || 30000);
}

function stopSheetsSync() {
    if (sheetsSyncInterval) {
        clearInterval(sheetsSyncInterval);
        sheetsSyncInterval = null;
    }
}
