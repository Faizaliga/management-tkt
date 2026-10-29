// ==========================================
// CONFIG & INITIAL STATE
// ==========================================
let incidents = [];
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

window.onload = async function() {
    const savedUser = localStorage.getItem('isp_current_user');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch (e) { currentUser = null; }
    }
    if (currentUser) { await showApp(); } else { showLogin(); }
};

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
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuat data dari server...</td></tr>`;

    await loadFromStorage();
    
    if (document.getElementById('inputTanggal')) document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    if (document.getElementById('inputTanggalSelesai')) document.getElementById('inputTanggalSelesai').value = CONFIG.DEFAULT_DATE;

    updateUserUI();
    renderApp();
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

// ==========================================
// MODAL CONTROLLER (TAMBAHAN REVISI)
// ==========================================
function openIncidentModal(isEdit = false) {
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

async function loadFromStorage() {
    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .select('*')
            .order('tanggal_kejadian', { ascending: false })
            .order('jam_kejadian', { ascending: false });

        if (error) throw error;

        incidents = data.map(item => ({
            id: item.id,
            tanggal: item.tanggal_kejadian,
            tanggalSelesai: item.tanggal_solved,
            mitra: item.nama_mitra,
            idPelanggan: item.id_pelanggan,
            sumber: item.sumber_masalah,
            kategori: item.detail_kategori,
            jamMulai: item.jam_kejadian,
            jamSelesai: item.jam_solved,
            downtime_formatted: item.downtime_formatted,
            downtimeText: item.downtime_formatted,
            keterangan: item.keterangan,
            status: item.status_ticket,
            createdBy: item.created_by || 'SYSTEM'
        }));
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(incidents));
    } catch (err) {
        console.error('Gagal load dari Supabase:', err.message);
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            try {
                incidents = JSON.parse(stored);
                if (!Array.isArray(incidents)) incidents = [];
            } catch (e) { incidents = []; }
        } else {
            incidents = JSON.parse(JSON.stringify(INITIAL_SAMPLE_DATA || []));
        }
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
        alert('Peringatan: Gagal sinkron ke server. Error: ' + err.message);
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
        if (!tanggalSelesai.value) tanggalSelesai.value = document.getElementById('inputTanggal').value || CONFIG.DEFAULT_DATE;
        if (!jamSelesai.value) {
            const now = new Date();
            jamSelesai.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        calculateDowntime();
    } else {
        jamSelesai.value = '';
        document.getElementById('inputDowntime').value = '';
    }
}

function calculateDowntime() {
    const tglMulai = document.getElementById('inputTanggal').value;
    const jamMulai = document.getElementById('inputJamMulai').value;
    const tglSelesai = document.getElementById('inputTanggalSelesai').value;
    const jamSelesai = document.getElementById('inputJamSelesai').value;
    const downtimeInput = document.getElementById('inputDowntime');

    if (tglMulai && jamMulai && tglSelesai && jamSelesai) {
        const startDateTime = new Date(`${tglMulai}T${jamMulai}:00`);
        const endDateTime = new Date(`${tglSelesai}T${jamSelesai}:00`);

        if (endDateTime < startDateTime) {
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
    } else {
        downtimeInput.value = '';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const editIndex = parseInt(document.getElementById('editIndex').value);
    const sumberValue = document.getElementById('inputSumber').value;
    let kategoriValue = document.getElementById('inputKategori').value;
    const statusValue = document.getElementById('inputStatus').value;
    const jamSelesaiValue = document.getElementById('inputJamSelesai').value;
    const tanggalSelesaiValue = document.getElementById('inputTanggalSelesai').value;

    if (statusValue === 'Resolved' && (!jamSelesaiValue || !tanggalSelesaiValue)) {
        alert("Untuk menutup tiket (Resolved), Tanggal Selesai dan Jam Solved wajib diisi!");
        return;
    }

    if (!kategoriValue && SUB_CATEGORIES[sumberValue]) kategoriValue = SUB_CATEGORIES[sumberValue][0];

    const downtimeText = document.getElementById('inputDowntime').value;

    let downtimeMenitInt = 0;
    if (downtimeText && !downtimeText.includes("Error")) {
        const days = parseInt(downtimeText.match(/(\d+)\s*Hari/) || [0]) || 0;
        const hours = parseInt(downtimeText.match(/(\d+)\s*Jam/) || [0]) || 0;
        const mins = parseInt(downtimeText.match(/(\d+)\s*Menit/) || [0]) || 0;
        downtimeMenitInt = (days * 24 * 60) + (hours * 60) + mins;
    }

    // KONVERSI SEMUA INPUT TEKS MENJADI KAPITAL (UPPERCASE)
    const supabasePayload = {
        tanggal_kejadian: document.getElementById('inputTanggal').value,
        tanggal_solved: tanggalSelesaiValue || null,
        nama_mitra: document.getElementById('inputMitra').value.trim().toUpperCase(),
        id_pelanggan: document.getElementById('inputIdPelanggan').value.trim().toUpperCase(),
        sumber_masalah: sumberValue,
        detail_kategori: kategoriValue ? kategoriValue.toUpperCase() : '',
        jam_kejadian: document.getElementById('inputJamMulai').value || null,
        jam_solved: jamSelesaiValue || null,
        downtime_menit: downtimeMenitInt,
        downtime_formatted: downtimeText,
        keterangan: document.getElementById('inputKeterangan').value.trim().toUpperCase(),
        status_ticket: statusValue,
        created_by: document.getElementById('inputOperator') ? document.getElementById('inputOperator').value.toUpperCase() : 'SYSTEM'
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
    if(document.getElementById('inputOperator')) document.getElementById('inputOperator').value = '';
    
    updateSubCategoryOptions();
}

function editRecord(id) {
    const index = incidents.findIndex(item => item.id === id);
    if (index === -1) return;

    const item = incidents[index];
    document.getElementById('editIndex').value = index;
    document.getElementById('inputTanggal').value = item.tanggal;
    document.getElementById('inputTanggalSelesai').value = item.tanggalSelesai || item.tanggal;
    document.getElementById('inputMitra').value = item.mitra;
    document.getElementById('inputIdPelanggan').value = item.idPelanggan;
    document.getElementById('inputSumber').value = item.sumber;
    
    updateSubCategoryOptions(item.kategori);
    
    document.getElementById('inputJamMulai').value = item.jamMulai;
    document.getElementById('inputJamSelesai').value = item.jamSelesai || '';
    document.getElementById('inputDowntime').value = item.downtimeText || item.downtime_formatted || '';
    document.getElementById('inputKeterangan').value = item.keterangan;
    document.getElementById('inputStatus').value = item.status;

    if(document.getElementById('inputOperator')) {
        document.getElementById('inputOperator').value = item.createdBy || '';
    }

    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-pen-to-square mr-2"></i> Update Report';

    openIncidentModal(true); 
}

async function deleteRecord(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data gangguan ini?')) {
        await saveToStorage('DELETE', id);
        incidents = incidents.filter(item => item.id !== id);
        renderApp();
    }
}

function showDetail(id) {
    const item = incidents.find(i => i.id === id);
    if (!item) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Mitra</span> <strong class="text-slate-700">${item.mitra}</strong></div>
            <div><span class="text-xs text-slate-400 block">ID Pelanggan</span> <code class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">${item.idPelanggan}</code></div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Tanggal Kejadian</span> ${item.tanggal} (${item.jamMulai})</div>
            <div><span class="text-xs text-slate-400 block">Tanggal Selesai</span> ${item.tanggalSelesai || '-'} (${item.jamSelesai || '-'})</div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            <div><span class="text-xs text-slate-400 block">Sumber Gangguan</span> <span class="font-semibold ${item.sumber==='Metro'?'text-rose-600':'text-amber-600'}">${item.sumber}</span></div>
            <div><span class="text-xs text-slate-400 block">Estimasi Downtime</span> <span class="font-bold text-emerald-600">${item.downtimeText || item.downtime_formatted || '-'}</span></div>
        </div>
        <div>
            <span class="text-xs text-slate-400 block mb-1">Specific Category</span>
            <p class="font-semibold text-slate-700">${item.kategori}</p>
        </div>
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span class="text-xs text-slate-400 block mb-1">Catatan Troubleshooting / Root Cause</span>
            <p class="text-xs text-slate-600 italic">${item.keterangan || 'TIDAK ADA CATATAN TAMBAHAN.'}</p>
        </div>
        <div class="text-[11px] text-slate-400 pt-1">
            Input / Updated by: <span class="font-medium text-slate-600">${item.createdBy || 'SYSTEM'}</span>
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
        
        const isPending = item.status === 'Pending';
        const matchMonth = !month || (item.tanggal && item.tanggal.startsWith(month)) || isPending;
        
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
            const days = parseInt(textDt.match(/(\d+)\s*Hari/) || [0]);
            const hours = parseInt(textDt.match(/(\d+)\s*Jam/) || [0]);
            const mins = parseInt(textDt.match(/(\d+)\s*Menit/) || [0]);
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
                ? `${tglMulai} <br> <span class="text-[10px] text-slate-400 font-medium">${jamMulai} - ${jamSelesai}</span>`
                : `${tglMulai} ${jamMulai} <br> <span class="text-[10px] text-amber-600 font-medium">s/d ${tglSelesai} ${jamSelesai}</span>`;

            tr.innerHTML = `
                <td class="p-3 whitespace-nowrap text-slate-600 font-mono text-xs">${timeDisplay}</td>
                <td class="p-3">
                    <div class="font-bold text-slate-700">${item.mitra}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${item.idPelanggan}</div>
                </td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full ${item.sumber === 'Metro' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}">
                        ${item.sumber}
                    </span>
                </td>
                <td class="p-3 text-slate-600 max-w-xs truncate" title="${item.kategori}">${item.kategori}</td>
                <td class="p-3 font-semibold text-sky-600">${item.downtimeText || item.downtime_formatted || '-'}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-medium rounded ${item.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'}">
                        ${item.status === 'Pending' ? 'OPEN / Pending' : 'Resolved'}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center space-x-1.5">
                        <button onclick="showDetail(${item.id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sky-600 transition" title="Detail"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="editRecord(${item.id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-amber-600 transition" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteRecord(${item.id})" class="p-1.5 bg-slate-100 hover:bg-rose-100 rounded text-rose-600 transition" title="Hapus"><i class="fa-solid fa-trash"></i></button>
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

    if (selectedMonth !== 'ALL') exportData = exportData.filter(i => (i.tanggal && i.tanggal.startsWith(selectedMonth)) || i.status === 'Pending');
    if (selectedStatus !== 'ALL') exportData = exportData.filter(i => i.status === selectedStatus);

    if (exportData.length === 0) {
        alert('Tidak ada data yang sesuai dengan kriteria filter.');
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
}

async function backupJSON() {
    if (currentUser && currentUser.role !== 'Super Admin') {
        alert('Akses Ditolak: Hanya Super Admin yang dapat mendownload backup JSON.');
        return;
    }
    if (incidents.length === 0) {
        alert('Tidak ada data untuk dibackup.');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_isp_incidents_${CONFIG.DEFAULT_DATE}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

async function restoreJSON(e) {
    if (currentUser && currentUser.role !== 'Super Admin') {
        alert('Akses Ditolak: Hanya Super Admin yang dapat melakukan Restore data.');
        return;
    }
    const fileReader = new FileReader();
    fileReader.onload = async function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                const payload = parsedData.map(item => ({
                    id: item.id || Date.now() + Math.floor(Math.random() * 1000),
                    tanggal_kejadian: item.tanggal || item.tanggal_kejadian,
                    tanggal_solved: item.tanggalSelesai || item.tanggal_solved || null,
                    nama_mitra: (item.mitra || item.nama_mitra || '').toUpperCase(),
                    id_pelanggan: (item.idPelanggan || item.id_pelanggan || '').toUpperCase(),
                    sumber_masalah: item.sumber || item.sumber_masalah,
                    detail_kategori: (item.kategori || item.detail_kategori || '').toUpperCase(),
                    jam_kejadian: item.jamMulai || item.jam_kejadian || null,
                    jam_solved: item.jamSelesai || item.jam_solved || null,
                    downtime_menit: 0, 
                    downtime_formatted: item.downtimeText || item.downtime_formatted || '',
                    keterangan: (item.keterangan || '').toUpperCase(),
                    status_ticket: item.status || item.status_ticket,
                    created_by: (item.createdBy || item.created_by || 'SYSTEM').toUpperCase()
                }));

                const { data, error } = await supabaseClient
                    .from('tickets')
                    .upsert(payload, { onConflict: 'id' });

                if (error) throw error;

                alert('Data berhasil di-restore ke Supabase!');
                await loadFromStorage(); 
                renderApp();
            } else {
                alert('Format file JSON tidak valid.');
            }
        } catch (err) {
            alert('Gagal membaca file JSON atau gagal restore ke database: ' + err.message);
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}

async function loadOperators() {
    try {
        const { data, error } = await supabaseClient
            .from('operators')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('inputOperator');
        if (!select) return;
        
        const currentVal = select.value;
        
        select.innerHTML = '<option value="">-- Pilih Nama --</option>';
        
        data.forEach(op => {
            const option = document.createElement('option');
            option.value = op.name.toUpperCase();
            option.textContent = op.name.toUpperCase();
            select.appendChild(option);
        });

        if (currentVal) select.value = currentVal;

    } catch (err) {
        console.error('Gagal memuat data operator:', err.message);
    }
}
