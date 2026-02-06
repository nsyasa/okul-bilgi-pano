"use client";

import { useEffect, useState } from "react";
import { fetchMyProfile, type Profile } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";

export function AuthGate(props: { children: (profile: Profile) => React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { profile, error } = await fetchMyProfile();
      if (error || !profile) {
        router.replace("/admin/login");
        return;
      }
      setProfile(profile);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Yükleniyor…
      </div>
    );
  }

  return <>{profile ? props.children(profile) : null}</>;
}
