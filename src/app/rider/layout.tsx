import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rider Dashboard | Khadz Burger",
  description: "Manage your deliveries",
};

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {children}
    </div>
  );
}