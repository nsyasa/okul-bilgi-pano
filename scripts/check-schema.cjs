// scripts/check-schema.cjs
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let url, key;

if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const [k, ...rest] = line.split('=');
        const val = rest.join('=').trim().replace(/^['"]/, '').replace(/['"]$/, '');
        if (k.trim() === 'NEXT_PUBLIC_SUPABASE_URL') url = val;
        if (k.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = val;
    }
}

if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
}

const sb = createClient(url, key);

async function run() {
    console.log("Checking columns for youtube_videos...");
    // Try to select flow_order
    const { data, error } = await sb
        .from('youtube_videos')
        .select('flow_order')
        .limit(1);

    if (error) {
        if (error.code === '42703') { // undefined_column
            console.log("RESULT: flow_order column is MISSING");
        } else {
            console.log("ERROR:", error.message);
        }
    } else {
        console.log("RESULT: flow_order column EXISTS");
    }
}

run();
