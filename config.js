// ==========================================
// SUPABASE CONFIGURATION (MAHAWIRA TICKET SYSTEM)
// ==========================================
const SUPABASE_URL = 'https://rnhhiiyzpbgiutxjkmyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGhpaXl6cGJnaXV0eGprbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mjg1MzYsImV4cCI6MjEwODMwNDUzNn0.7nQ-YIGaN1eoN57uwMFgym2p-hULznbcCqUrKsRChxM';

// Inisialisasi Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    STORAGE_KEY: 'mahawira_isp_incidents',
    ITEMS_PER_PAGE: 10,
    DEFAULT_DATE: new Date().toISOString().split('T')[0]
};

// Kategori Spesifik Berdasarkan Sumber Masalah
const SUB_CATEGORIES = {
    "Metro": [
        "High Latency / Packet Loss",
        "Link Down / Fiber Cut",
        "BGP Peer Disconnected",
        "Power Failure at Pop Upstream",
        "Maintenance Provider"
    ],
    "Mikrotik": [
        "Router CPU High Load / Crash",
        "PPPoE / Hotspot Server Error",
        "Interface / SFP Module Error",
        "Routing / Gateway Misconfiguration",
        "Power Supply / Adapter Failure"
    ]
};

// Data Sampel Default
const INITIAL_SAMPLE_DATA = [];
