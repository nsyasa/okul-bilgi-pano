import { supabaseBrowser } from "./supabaseBrowser";

export async function uploadAnnouncementImage(file: File) {
  const sb = supabaseBrowser();
  const ext = file.name.split(".").pop() || "png";
  const path = `announcements/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await sb.storage.from("pano-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data } = sb.storage.from("pano-media").getPublicUrl(path);
  return data.publicUrl;
}
