// ==========================================
// SUPABASE CONFIGURATION (MAHAWIRA TICKET SYSTEM)
// ==========================================
const SUPABASE_URL = 'https://rnhhiiyzpbgiutxjkmyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGhpaXl6cGJnaXV0eGprbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mjg1MzYsImV4cCI6MjEwODMwNDUzNn0.7nQ-YIGaN1eoN57uwMFgym2p-hULznbcCqUrKsRChxM';

// Inisialisasi Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Daftar URL Apps Script untuk masing-masing vendor
const SHEETS_SCRIPT_URLS = {
    "Telkom": "https://script.google.com/macros/s/AKfycbylqCvV2gA4nRVVOxoao6v_8dbPPXTFY-HtNfW3qUIyGt2YbSwUFDKt4vhAgEHn2WF0/exec",
    "XL": "https://script.google.com/macros/s/AKfycbzeJcwk8ssYeVz65t0C9BvpE5A1tWsxwbiTTpdHSyrqM3790h_MM2ED3yJ1uO5HwuLGLQ/exec",
    "Indosat": "https://script.google.com/macros/s/AKfycbxF7iNiPkk9e54bPmbUJm9xOVigI1rvOcMzp6Vs8MtKRslCJ9CQ1VDvqfAi60iI-JMjYA/exec",
    "Fiber Star": "https://script.google.com/macros/s/AKfycbyK55icRgEz0V7nB8C1RptHFW1Y--mjf-me1QOSdvlbQq5dBZOo-mWPtNPq4B12oML_/exec",
    "HSP": "https://script.google.com/macros/s/AKfycby13pwEB3kGuckTJiNa37mwc6b4kTvisqtP88A2b9cU0X7N22ir6huLVB5Z4fcP_Wg5vg/exec",
    "Lintasarta": "https://script.google.com/macros/s/AKfycbxISTnn5yh4PgTQsHS0fC5ple-Mb6no3XX4NmijNY0JUs8wzfS7czTLfaoQeZSsZmn16Q/exec",
    "iForte": "https://script.google.com/macros/s/AKfycbwtiEpVRNVmj8xvYkAxiSLdHLF5LyIWLO6a3Wd8XNnjk3WHipfaeKyC7_EjI3QRUIz6/exec"
};

// Tetap gunakan URL Telkom untuk fungsi tarik data (GET) agar web bisa membaca semua data
const SHEETS_READ_URLS = [
    SHEETS_SCRIPT_URLS["Telkom"],
    SHEETS_SCRIPT_URLS["XL"],
    SHEETS_SCRIPT_URLS["Indosat"],
    SHEETS_SCRIPT_URLS["Fiber Star"],
    SHEETS_SCRIPT_URLS["HSP"],
    SHEETS_SCRIPT_URLS["Lintasarta"],
    SHEETS_SCRIPT_URLS["iForte"]
]; 

const CONFIG = {
    STORAGE_KEY: 'mahawira_isp_incidents',
    ITEMS_PER_PAGE: 10,
    DEFAULT_DATE: new Date().toISOString().split('T')[0],
    SHEETS_SYNC_INTERVAL_MS: 30000
};

// Kategori Spesifik Berdasarkan Sumber Masalah
const SUB_CATEGORIES = {
    "Metro": [
        "High Latency / Packet Loss",
        "Link Down / Fiber Cut",
        "BGP Peer Disconnected",
        "Power Failure at Pop Upstream",
        "Link Intermitten",
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
