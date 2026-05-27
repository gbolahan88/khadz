"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try{
        const user = await getCurrentUser();

        if (!user) {
          router.replace("/admin/login");
          return;
        }
      }catch (error) {
        console.log(error);
        router.replace("/admin/login");
      }finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}