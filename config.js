// Configuration & Constant Data for ISP Daily Report
const CONFIG = {
    APP_NAME: "ISP Network Operations Center",
    STORAGE_KEY: "isp_incidents_data_v2",
    ITEMS_PER_PAGE: 6,
    DEFAULT_DATE: new Date().toISOString().split('T')[0]
};

// Sub-kategori gangguan berdasarkan Sumber Masalah
const SUB_CATEGORIES = {
    Metro: [
        "Putus Fiber Optic (FO Cut)",
        "High Latency / Packet Loss",
        "Port Link Down (SFP/Interface)",
        "Core Switched / Degraded",
        "Perbaikan Maintenance Vendor Metro"
    ],
    Mikrotik: [
        "Router Overload / CPU High",
        "Flapping Interface",
        "Error Config / BGP / OSPF / VLAN",
        "Hardware / Power Down (UPS)",
        "Loop Traffic / Broadcast Storm",
        "High Memory / Disk Storage Full"
    ]
};

// Initial Mock Data
const INITIAL_SAMPLE_DATA = [
    { id: 1, tanggal: '2026-10-01', mitra: 'PT. Telkom Access', idPelanggan: 'MTR-1021', sumber: 'Metro', kategori: 'Putus Fiber Optic (FO Cut)', jamMulai: '08:15', jamSelesai: '10:30', downtime: 135, keterangan: 'Kabel terputus akibat galian proyek di Ringroad', status: 'Resolved' },
    { id: 2, tanggal: '2026-10-03', mitra: 'Bank Mandiri Cabang', idPelanggan: 'MTR-0881', sumber: 'Mikrotik', kategori: 'Router Overload / CPU High', jamMulai: '11:00', jamSelesai: '11:25', downtime: 25, keterangan: 'Looping di switch LAN internal nasabah', status: 'Resolved' },
    { id: 3, tanggal: '2026-10-05', mitra: 'CV. Jaya Bersama', idPelanggan: 'MTR-0043', sumber: 'Metro', kategori: 'High Latency / Packet Loss', jamMulai: '14:20', jamSelesai: '16:00', downtime: 100, keterangan: 'Redaman FO naik ke -29dBm', status: 'Resolved' },
    { id: 4, tanggal: '2026-10-10', mitra: 'PT. Telkom Access', idPelanggan: 'MTR-1021', sumber: 'Mikrotik', kategori: 'Error Config / BGP / OSPF', jamMulai: '09:00', jamSelesai: '09:40', downtime: 40, keterangan: 'Salah peer BGP setelah maintenance', status: 'Resolved' },
    { id: 5, tanggal: '2026-10-12', mitra: 'Hotel Grand Nusantara', idPelanggan: 'MTR-2201', sumber: 'Metro', kategori: 'Port Link Down (SFP/Interface)', jamMulai: '21:00', jamSelesai: '22:15', downtime: 75, keterangan: 'SFP Transceiver Sisi Metro Rusak', status: 'Resolved' },
    { id: 6, tanggal: '2026-10-15', mitra: 'PT. Telkom Access', idPelanggan: 'MTR-1021', sumber: 'Metro', kategori: 'Putus Fiber Optic (FO Cut)', jamMulai: '02:00', jamSelesai: '05:30', downtime: 210, keterangan: 'FO Cut backbone Jakarta - Bandung', status: 'Resolved' },
    { id: 7, tanggal: '2026-10-21', mitra: 'Universitas Megah', idPelanggan: 'MTR-9902', sumber: 'Mikrotik', kategori: 'Flapping Interface', jamMulai: '08:00', jamSelesai: '', downtime: 0, keterangan: 'Port ether3 flapping terus menerus', status: 'Pending' }
];
