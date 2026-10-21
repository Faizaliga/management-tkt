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
];
