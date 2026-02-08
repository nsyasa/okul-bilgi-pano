/** @type {import('next').NextConfig} */

// Supabase host'u env'den türet
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHost = null;
if (supabaseUrl) {
  try {
    supabaseHost = new URL(supabaseUrl).hostname;
  } catch {
    console.warn("NEXT_PUBLIC_SUPABASE_URL geçersiz format, remotePatterns boş kalacak");
  }
}

// Sadece gerekli hostlara izin ver (hostname: "**" kaldırıldı)
const remotePatterns = [];

if (supabaseHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
    pathname: "/storage/v1/object/public/**",
  });
}

const nextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
