// Configuration & Constant Data for ISP Daily Report
const CONFIG = {
    APP_NAME: "ISP Network Operations Center",
    STORAGE_KEY: "isp_incidents_data_v3",
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

// Sample Data Awal (Jika LocalStorage kosong)
const INITIAL_SAMPLE_DATA = [
    {
        id: 1700000001,
        tanggal: "2026-10-25",
        tanggalSelesai: "2026-10-25",
        mitra: "PT. Sumber Makmur",
        idPelanggan: "MTR-0042",
        sumber: "Metro",
        kategori: "Putus Fiber Optic (FO Cut)",
        jamMulai: "08:30",
        jamSelesai: "11:45",
        downtimeText: "3 Jam 15 Menit",
        keterangan: "Kabel FO utama terputus akibat galian saluran air. Tim vendor metro sudah melakukan splicing.",
        status: "Resolved",
        createdBy: "Faizal Iga Pratama"
    },
    {
        id: 1700000002,
        tanggal: "2026-10-26",
        tanggalSelesai: "",
        mitra: "CV. Network Utama",
        idPelanggan: "MTR-0108",
        sumber: "Mikrotik",
        kategori: "Router Overload / CPU High",
        jamMulai: "06:15",
        jamSelesai: "",
        downtimeText: "",
        keterangan: "Pengecekan alokasi bandwidth & filtering DDoS attack di core router.",
        status: "Pending",
        createdBy: "Budi Santoso"
    }
];
