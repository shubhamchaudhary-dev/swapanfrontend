'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated || user?.role !== 'admin') {
                router.push('/');
            }
        }
    }, [isLoading, isAuthenticated, user, router]);

    // Close sidebar when navigating on mobile
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    if (isLoading || !isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#0D7C66] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[256px_1fr] w-full bg-[#F8FAFC] dark:bg-[#0A0F1C]">
            {/* Sidebar — desktop always visible, mobile controlled by sidebarOpen */}
            <div className="hidden lg:block w-full h-full">
                <AdminSidebar
                    className="w-full sticky top-0 h-screen"
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>
            
            {/* Mobile Sidebar Overlay (rendered outside the grid flow logic) */}
            <div className="lg:hidden">
                <AdminSidebar
                    className="w-64"
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            <div className="flex flex-col min-w-0 w-full overflow-hidden">
                {/* Mobile top bar — only shown on < lg */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1A3C5E] dark:bg-[#0D1B2E] border-b border-white/10 w-full">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-white/70 hover:text-white rounded-md flex-shrink-0"
                        aria-label="Open admin menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-white font-bold font-serif text-base truncate">Admin Panel</span>
                </div>

                {/* Page content */}
                <main className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto bg-white dark:bg-[#111827] shadow-sm lg:rounded-l-2xl lg:my-4 lg:mr-4 p-4 sm:p-6 lg:p-8 lg:border border-[#E2E8F0] dark:border-[#1F2937]">
                    {children}
                </main>
            </div>
        </div>
    );
}

