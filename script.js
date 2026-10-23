// Core Application Logic
let incidents = [];
let currentPage = 1;

// Chart Instances
let topMitraChartInstance = null;
let sourceRatioChartInstance = null;
let dailyTrendChartInstance = null;

// INIT APP
window.onload = async function() {
    await loadFromSupabase();
    document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    document.getElementById('inputTanggalSelesai').value = CONFIG.DEFAULT_DATE;
    renderApp();
};

// AMBIL DATA REAL-TIME DARI DATABASE SUPABASE
async function loadFromSupabase() {
    try {
        const { data, error } = await db
            .from('tickets')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        
        // Map kolom dari Supabase Postgres ke format variabel frontend
        incidents = (data || []).map(item => ({
            id: item.id,
            tanggal: item.tanggal_kejadian,
            tanggalSelesai: item.tanggal_solved,
            mitra: item.nama_mitra,
            idPelanggan: item.id_pelanggan,
            sumber: item.sumber_masalah,
            kategori: item.detail_kategori,
            jamMulai: item.jam_kejadian,
            jamSelesai: item.jam_solved,
            downtimeText: item.downtime_formatted,
            keterangan: item.keterangan,
            status: item.status_ticket
        }));
    } catch (err) {
        console.error("Gagal terhubung ke Supabase:", err.message);
        incidents = [];
    }
}

// DYNAMIC CATEGORIES BASED ON SOURCE
function updateSubCategoryOptions(selectedSub = '') {
    const sumber = document.getElementById('inputSumber').value;
    const kategoriSelect = document.getElementById('inputKategori');
    
    kategoriSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';

    if (sumber && SUB_CATEGORIES[sumber]) {
        SUB_CATEGORIES[sumber].forEach(kat => {
            const option = document.createElement('option');
            option.value = kat;
            option.textContent = kat;
            if (kat === selectedSub) option.selected = true;
            kategoriSelect.appendChild(option);
        });

        if (!selectedSub && SUB_CATEGORIES[sumber].length > 0) {
            kategoriSelect.value = SUB_CATEGORIES[sumber][0];
        }
    }
}

// DOWNTIME CALCULATOR (FORMAT: X Hari Y Jam Z Menit)
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
            downtimeInput.value = "Waktu tidak valid!";
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
        
        if (hasil.length === 0) {
            downtimeInput.value = "0 Menit";
        } else {
            downtimeInput.value = hasil.join(" ");
        }
    } else {
        downtimeInput.value = '';
    }
}

// FORM SUBMISSION (CREATE & UPDATE DI SUPABASE)
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

    if (!kategoriValue && SUB_CATEGORIES[sumberValue]) {
        kategoriValue = SUB_CATEGORIES[sumberValue][0];
    }

    const downtimeText = document.getElementById('inputDowntime').value;

    const payload = {
        tanggal_kejadian: document.getElementById('inputTanggal').value,
        tanggal_solved: tanggalSelesaiValue || null,
        nama_mitra: document.getElementById('inputMitra').value.trim(),
        id_pelanggan: document.getElementById('inputIdPelanggan').value.trim(),
        sumber_masalah: sumberValue,
        detail_kategori: kategoriValue,
        jam_kejadian: document.getElementById('inputJamMulai').value,
        jam_solved: jamSelesaiValue || null,
        downtime_formatted: downtimeText,
        keterangan: document.getElementById('inputKeterangan').value.trim(),
        status_ticket: statusValue
    };

    if (editIndex >= 0) {
        // Mode Update Ke Database
        const targetId = incidents[editIndex].id;
        const { error } = await db
            .from('tickets')
            .update(payload)
            .eq('id', targetId);

        if (error) {
            alert("Gagal mengupdate data: " + error.message);
            return;
        }
    } else {
        // Mode Insert Ke Database
        const { error } = await db
            .from('tickets')
            .insert([payload]);

        if (error) {
            alert("Gagal menyimpan data: " + error.message);
            return;
        }
    }

    await loadFromSupabase();
    resetForm();
    renderApp();
}

function resetForm() {
    document.getElementById('incidentForm').reset();
    document.getElementById('editIndex').value = -1;
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Simpan Report';
    document.getElementById('btnCancelEdit').classList.add('hidden');
    
    document.getElementById('inputTanggal').value = CONFIG.DEFAULT_DATE;
    document.getElementById('inputTanggalSelesai').value = CONFIG.DEFAULT_DATE;
    document.getElementById('inputStatus').value = 'Pending';
    document.getElementById('inputDowntime').value = '';
    
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
    document.getElementById('inputDowntime').value = item.downtimeText || '';
    document.getElementById('inputKeterangan').value = item.keterangan || '';
    document.getElementById('inputStatus').value = item.status;

    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-pen-to-square mr-2"></i> Update Report';
    document.getElementById('btnCancelEdit').classList.remove('hidden');

    window.scrollTo({ top: document.getElementById('incidentForm').offsetTop - 80, behavior: 'smooth' });
}

async function deleteRecord(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data gangguan ini dari database cloud?')) {
        const { error } = await db
            .from('tickets')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Gagal menghapus data: " + error.message);
            return;
        }

        await loadFromSupabase();
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
            <div><span class="text-xs text-slate-400 block">Tanggal Kejadian</span> ${item.tanggal} (${item.jamMulai})</div>
            <div><span class="text-xs text-slate-400 block">Tanggal Selesai</span> ${item.tanggalSelesai || '-'} (${item.jamSelesai || '-'})</div>
        </div>
        <div class="grid grid-cols-2 gap-2 border-b border-slate-700 pb-3">
            <div><span class="text-xs text-slate-400 block">Sumber Gangguan</span> <span class="font-semibold ${item.sumber==='Metro'?'text-red-400':'text-amber-400'}">${item.sumber}</span></div>
            <div><span class="text-xs text-slate-400 block">Estimasi Downtime</span> <span class="font-bold text-emerald-400">${item.downtimeText || '-'}</span></div>
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
        if (item.downtimeText) {
            const days = parseInt(item.downtimeText.match(/(\d+)\s*Hari/) || [0]);
            const hours = parseInt(item.downtimeText.match(/(\d+)\s*Jam/) || [0]);
            const mins = parseInt(item.downtimeText.match(/(\d+)\s*Menit/) || [0]);
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
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-500">Tidak ada data gangguan ditemukan</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');
            const isPending = item.status === 'Pending';
            tr.className = `hover:bg-slate-800/80 transition border-b border-slate-700/50 fade-in ${isPending ? 'bg-amber-500/5' : ''}`;
            
            const tglMulai = item.tanggal || '-';
            const jamMulai = item.jamMulai || '--:--';
            const tglSelesai = item.tanggalSelesai || '-';
            const jamSelesai = item.jamSelesai || '--:--';

            const isSameDay = tglMulai === tglSelesai;
            const timeDisplay = isSameDay 
                ? `${tglMulai} <br> <span class="text-[10px]">${jamMulai} - ${jamSelesai}</span>`
                : `${tglMulai} ${jamMulai} <br> <span class="text-[10px] text-amber-400">s/d ${tglSelesai} ${jamSelesai}</span>`;

            tr.innerHTML = `
                <td class="p-3 whitespace-nowrap text-slate-300 font-mono text-xs">${timeDisplay}</td>
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
                <td class="p-3 font-mono text-slate-300">${jamMulai} - ${jamSelesai}</td>
                <td class="p-3 font-semibold text-cyan-400">${item.downtimeText || '-'}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[11px] font-medium rounded ${item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'}">
                        ${item.status === 'Pending' ? 'OPEN / Pending' : 'Resolved'}
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

function renderCharts() {
    const mitraCountMap = {};
    incidents.forEach(i => {
        if (i.mitra) mitraCountMap[i.mitra] = (mitraCountMap[i.mitra] || 0) + 1;
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

    const trendMap = {};
    incidents.forEach(i => {
        if (i.tanggal) trendMap[i.tanggal] = (trendMap[i.tanggal] || 0) + 1;
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

function openExportModal() {
    if (incidents.length === 0) {
        alert('Tidak ada data laporan untuk di-export.');
        return;
    }

    const selectMonth = document.getElementById('exportMonthSelect');
    selectMonth.innerHTML = '<option value="ALL">Semua Bulan (All Time)</option>';

    const monthsSet = new Set();
    incidents.forEach(item => {
        if (item.tanggal && item.tanggal.length >= 7) {
            monthsSet.add(item.tanggal.substring(0, 7));
        }
    });

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
        exportData = exportData.filter(i => (i.tanggal && i.tanggal.startsWith(selectedMonth)) || i.status === 'Pending');
    }

    if (selectedStatus !== 'ALL') {
        exportData = exportData.filter(i => i.status === selectedStatus);
    }

    if (exportData.length === 0) {
        alert('Tidak ada data yang sesuai dengan kriteria filter bulan / status tersebut.');
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
        'Durasi Downtime': item.downtimeText || '-',
        'Catatan / Root Cause': item.keterangan,
        'Status Ticket': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet['!cols'] = Object.keys(excelRows[0]).map(key => ({
        wch: Math.max(key.length + 3, 15)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gangguan Mitra");

    const dateStr = selectedMonth === 'ALL' ? 'All_Time' : selectedMonth;
    XLSX.writeFile(workbook, `Report_Gangguan_ISP_Mitra_${dateStr}.xlsx`);

    closeExportModal();
}

function backupJSON() {
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

function restoreJSON(e) {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                incidents = parsedData;
                renderApp();
                alert('Data berhasil dibaca dari file JSON!');
            } else {
                alert('Format file JSON tidak valid.');
            }
        } catch (err) {
            alert('Gagal membaca file JSON.');
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}
