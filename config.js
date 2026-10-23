// Configuration & Constant Data for ISP Daily Report
const CONFIG = {
    APP_NAME: "ISP Network Operations Center",
    STORAGE_KEY: "isp_incidents_data_v3",
    ITEMS_PER_PAGE: 6,
    DEFAULT_DATE: new Date().toISOString().split('T')[0],
    
    // KREDENSIAL SUPABASE
    SUPABASE_URL: "https://rnhhiiyzpbgiutxjkmyt.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_QgVrSfhNiNmYNVAMFvZhSQ_zVUTruoN"
};

// Inisialisasi Klien Supabase Client SDK
const { createClient } = supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

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

const INITIAL_SAMPLE_DATA = [];
