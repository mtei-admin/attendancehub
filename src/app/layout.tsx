import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Sidebar } from "@/components/sidebar";
import { getRole } from "@/lib/role";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AttendanceHub",
  description: "Internal Attendance Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getRole();

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <h1 className="text-2xl font-bold text-slate-900">AttendanceHub</h1>
            <p className="text-sm text-slate-500">Internal Attendance Management System</p>
          </header>

          <div className="flex min-h-[calc(100vh-88px)]">
            <Sidebar currentRole={role} />
            <main className="flex-1 p-6 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
