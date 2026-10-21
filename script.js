// Core Application Logic
let incidents = [];
let currentPage = 1;

// Chart Instances
let topMitraChartInstance = null;
let sourceRatioChartInstance = null;
let dailyTrendChartInstance = null;

// INIT APP
window.onload = function() {
    // KITA HAPUS DATA LAMA DI LOCAL STORAGE (Hanya untuk membersihkan dummy)
    // Hapus baris komentar di bawah ini jika data dummy sudah bersih
    localStorage.removeItem(CONFIG.STORAGE_KEY); 

    // Load data (sekarang akan kosong karena baru dihapus)
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
        incidents = JSON.parse(stored);
    } else {
        // Karena kita sudah mengubah config.js menjadi [], maka ini akan kosong
        incidents = JSON.parse(JSON.stringify(INITIAL_SAMPLE_DATA)); 
        saveToStorage();
    }

    document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    renderApp();
};
function saveToStorage() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(incidents));
}


// DOWNTIME CALCULATOR IN MINUTES
function calculateDowntime() {
    const start = document.getElementById('inputJamMulai').value;
    const end = document.getElementById('inputJamSelesai').value;
    const downtimeInput = document.getElementById('inputDowntime');

    if (start && end) {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        
        let t1 = h1 * 60 + m1;
        let t2 = h2 * 60 + m2;
        
        if (t2 < t1) {
            t2 += 24 * 60; // Cross midnight
        }
        
        downtimeInput.value = t2 - t1;
    } else {
        downtimeInput.value = '';
    }
}

// FORM SUBMISSION
function handleFormSubmit(e) {
    e.preventDefault();

    const editIndex = parseInt(document.getElementById('editIndex').value);
    const sumberValue = document.getElementById('inputSumber').value;
    let kategoriValue = document.getElementById('inputKategori').value;

    // Validasi Keamanan: Jika karena suatu hal kategori kosong, ambil default
    if (!kategoriValue && SUB_CATEGORIES[sumberValue]) {
        kategoriValue = SUB_CATEGORIES[sumberValue][0];
    }

    const newItem = {
        id: editIndex >= 0 ? incidents[editIndex].id : Date.now(),
        tanggal: document.getElementById('inputTanggal').value,
        mitra: document.getElementById('inputMitra').value.trim(),
        idPelanggan: document.getElementById('inputIdPelanggan').value.trim(),
        sumber: sumberValue,
        kategori: kategoriValue, // <-- Gunakan variabel yang sudah divalidasi
        jamMulai: document.getElementById('inputJamMulai').value,
        jamSelesai: document.getElementById('inputJamSelesai').value,
        downtime: parseInt(document.getElementById('inputDowntime').value) || 0,
        keterangan: document.getElementById('inputKeterangan').value.trim(),
        status: document.getElementById('inputStatus').value
    };

    // ... (kode di bawahnya sama seperti sebelumnya: incidents[editIndex] = newItem atau unshift)
    if (editIndex >= 0) {
        incidents[editIndex] = newItem;
    } else {
        incidents.unshift(newItem);
    }

    saveToStorage();
    resetForm();
    renderApp();
}
function resetForm() {
    document.getElementById('incidentForm').reset();
    document.getElementById('editIndex').value = -1;
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Simpan Report';
    document.getElementById('btnCancelEdit').classList.add('hidden');
    document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    updateSubCategoryOptions();
}

function editRecord(id) {
    const index = incidents.findIndex(item => item.id === id);
    if (index === -1) return;

    const item = incidents[index];
    document.getElementById('editIndex').value = index;
    document.getElementById('inputTanggal').value = item.tanggal;
    document.getElementById('inputMitra').value = item.mitra;
    document.getElementById('inputIdPelanggan').value = item.idPelanggan;
    document.getElementById('inputSumber').value = item.sumber;
    
    updateSubCategoryOptions(item.kategori);
    
    document.getElementById('inputJamMulai').value = item.jamMulai;
    document.getElementById('inputJamSelesai').value = item.jamSelesai;
    document.getElementById('inputDowntime').value = item.downtime;
    document.getElementById('inputKeterangan').value = item.keterangan;
    document.getElementById('inputStatus').value = item.status;

    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-pen-to-square mr-2"></i> Update Report';
    document.getElementById('btnCancelEdit').classList.remove('hidden');

    window.scrollTo({ top: document.getElementById('incidentForm').offsetTop - 80, behavior: 'smooth' });
}

function deleteRecord(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data gangguan ini?')) {
        incidents = incidents.filter(item => item.id !== id);
        saveToStorage();
        renderApp();
    }
}

function showDetail(id) {
    const item = incidents.find(i => i.id === id);
    if (!item) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="grid grid-cols-2 gap-2 border-b border-slate-700 pb-3">
            <div><span class="text-xs text-slate-400 block">Mitra</span> <strong>${item.mitra}</strong></div>
            <div><span class="text-xs text-slate-400 block">ID Pelanggan</span> <code>${item.idPelanggan}</code></div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-700 pb-3">
            <div><span class="text-xs text-slate-400 block">Tanggal Kejadian</span> ${item.tanggal}</div>
            <div><span class="text-xs text-slate-400 block">Status</span> <span class="px-2 py-0.5 text-xs rounded ${item.status==='Resolved'?'bg-emerald-500/20 text-emerald-400':'bg-amber-500/20 text-amber-400'}">${item.status}</span></div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-700 pb-3">
            <div><span class="text-xs text-slate-400 block">Sumber Gangguan</span> <span class="font-semibold ${item.sumber==='Metro'?'text-red-400':'text-amber-400'}">${item.sumber}</span></div>
            <div><span class="text-xs text-slate-400 block">Estimasi Downtime</span> ${item.downtime} Menit</div>
        </div>
        <div>
            <span class="text-xs text-slate-400 block mb-1">Specific Category</span>
            <p class="font-semibold text-slate-200">${item.kategori}</p>
        </div>
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700">
            <span class="text-xs text-slate-400 block mb-1">Catatan Troubleshooting / Root Cause</span>
            <p class="text-xs text-slate-300 italic">${item.keterangan || 'Tidak ada catatan tambahan.'}</p>
        </div>
    `;
    document.getElementById('detailModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

// FILTER & RENDER DATA
function getFilteredIncidents() {
    const search = document.getElementById('filterSearch').value.toLowerCase();
    const month = document.getElementById('filterMonth').value;
    const sumber = document.getElementById('filterSumber').value;
    const status = document.getElementById('filterStatus').value;

    return incidents.filter(item => {
        const matchSearch = item.mitra.toLowerCase().includes(search) || 
                            item.idPelanggan.toLowerCase().includes(search) || 
                            item.kategori.toLowerCase().includes(search) ||
                            item.keterangan.toLowerCase().includes(search);
        const matchMonth = !month || item.tanggal.startsWith(month);
        const matchSumber = sumber === 'All' || item.sumber === sumber;
        const matchStatus = status === 'All' || item.status === status;

        return matchSearch && matchMonth && matchSumber && matchStatus;
    });
}

function renderApp() {
    const filtered = getFilteredIncidents();

    // Stats Card Update
    const todayStr = CONFIG.DEFAULT_DATE;
    const todayIncidents = incidents.filter(i => i.tanggal === todayStr);
    document.getElementById('statToday').innerText = todayIncidents.length;
    const todayResolved = todayIncidents.filter(i => i.status === 'Resolved').length;
    document.getElementById('statTodayBadge').innerText = `${todayResolved} Solved / ${todayIncidents.length - todayResolved} Open`;

    document.getElementById('statMetro').innerText = incidents.filter(i => i.sumber === 'Metro').length;
    document.getElementById('statMikrotik').innerText = incidents.filter(i => i.sumber === 'Mikrotik').length;

    const totalDowntimeMinutes = incidents.reduce((acc, curr) => acc + (curr.downtime || 0), 0);
    document.getElementById('statDowntime').innerText = `${totalDowntimeMinutes} Menit`;
    document.getElementById('statDowntimeHours').innerText = `~${(totalDowntimeMinutes/60).toFixed(1)} Jam Accumulated`;

    // Table Pagination Render
    const totalPages = Math.ceil(filtered.length / CONFIG.ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const pageData = filtered.slice(startIdx, startIdx + CONFIG.ITEMS_PER_PAGE);

    const tbody = document.getElementById('incidentTableBody');
    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-500">Tidak ada data gangguan ditemukan</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/80 transition border-b border-slate-700/50 fade-in';
            tr.innerHTML = `
                <td class="p-3 whitespace-nowrap text-slate-300 font-mono">${item.tanggal}</td>
                <td class="p-3">
                    <div class="font-bold text-slate-200">${item.mitra}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${item.idPelanggan}</div>
                </td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full ${item.sumber === 'Metro' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                        ${item.sumber}
                    </span>
                </td>
                <td class="p-3 text-slate-300 max-w-xs truncate" title="${item.kategori}">${item.kategori}</td>
                <td class="p-3 text-slate-400 font-mono">${item.jamMulai} - ${item.jamSelesai || 'Active'}</td>
                <td class="p-3 font-semibold text-cyan-400">${item.downtime ? item.downtime + 'm' : '-'}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-medium rounded ${item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                        ${item.status}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <button onclick="showDetail(${item.id})" class="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-blue-400" title="Detail"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="editRecord(${item.id})" class="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-amber-400" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteRecord(${item.id})" class="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-red-400" title="Hapus"><i class="fa-solid fa-trash"></i></button>
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

// CHART.JS RENDER
function renderCharts() {
    // Top Mitra Chart
    const mitraCountMap = {};
    incidents.forEach(i => {
        mitraCountMap[i.mitra] = (mitraCountMap[i.mitra] || 0) + 1;
    });
    const sortedMitra = Object.entries(mitraCountMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (topMitraChartInstance) topMitraChartInstance.destroy();
    const ctx1 = document.getElementById('topMitraChart').getContext('2d');
    topMitraChartInstance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: sortedMitra.map(x => x[0]),
            datasets: [{
                label: 'Jumlah Gangguan',
                data: sortedMitra.map(x => x[1]),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } },
                y: { ticks: { color: '#f8fafc' }, grid: { display: false } }
            }
        }
    });

    // Ratio Doughnut Chart
    const metroCount = incidents.filter(i => i.sumber === 'Metro').length;
    const mikrotikCount = incidents.filter(i => i.sumber === 'Mikrotik').length;

    if (sourceRatioChartInstance) sourceRatioChartInstance.destroy();
    const ctx2 = document.getElementById('sourceRatioChart').getContext('2d');
    sourceRatioChartInstance = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Sisi Metro', 'Sisi Mikrotik'],
            datasets: [{
                data: [metroCount, mikrotikCount],
                backgroundColor: ['#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } }
        }
    });

    // Daily Trend Chart
    const trendMap = {};
    incidents.forEach(i => {
        trendMap[i.tanggal] = (trendMap[i.tanggal] || 0) + 1;
    });
    const sortedDates = Object.keys(trendMap).sort().slice(-10);

    if (dailyTrendChartInstance) dailyTrendChartInstance.destroy();
    const ctx3 = document.getElementById('dailyTrendChart').getContext('2d');
    dailyTrendChartInstance = new Chart(ctx3, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Insiden',
                data: sortedDates.map(d => trendMap[d]),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } }
            }
        }
    });
}

// EXPORT TO EXCEL (.XLSX)
function exportToExcel() {
    const filteredData = getFilteredIncidents();
    if (filteredData.length === 0) {
        alert('Tidak ada data laporan untuk di-export.');
        return;
    }

    const excelRows = filteredData.map((item, index) => ({
        'No': index + 1,
        'Tanggal': item.tanggal,
        'Nama Mitra': item.mitra,
        'ID Pelanggan / IP': item.idPelanggan,
        'Sumber Masalah': item.sumber,
        'Kategori Issue': item.kategori,
        'Jam Start': item.jamMulai,
        'Jam End': item.jamSelesai || 'Ongoing',
        'Downtime (Menit)': item.downtime,
        'Catatan / Root Cause': item.keterangan,
        'Status Ticket': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet['!cols'] = Object.keys(excelRows[0]).map(key => ({
        wch: Math.max(key.length + 3, 15)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gangguan Mitra");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Report_Gangguan_ISP_Mitra_${dateStr}.xlsx`);
}
