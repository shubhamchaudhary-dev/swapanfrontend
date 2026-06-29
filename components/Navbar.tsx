'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const closeMobile = () => setMobileOpen(false);

  // Scroll animations for glass effect
  const { scrollY } = useScroll();
  const blurAmount = useTransform(scrollY, [0, 50], [22, 32]);
  const bgOpacity = useTransform(scrollY, [0, 50], [0.14, 0.35]);
  const shadowOpacity = useTransform(scrollY, [0, 50], [0.08, 0.18]);

  // Mouse parallax


  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-[12px] left-0 right-0 mx-auto w-[88%] max-w-[1400px] h-[43px] rounded-full border border-white/35 z-50 flex items-center justify-between px-6 md:px-8 bg-[#f5f9ff]/60 backdrop-blur-xl shadow-[0_10px_35px_rgba(30,64,175,0.08),inset_0_2px_12px_rgba(255,255,255,0.35)] text-[#0F172A]"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline shrink-0 group">
          <div className="relative h-[24px] w-[24px] rounded-full flex items-center justify-center shrink-0 border border-white/40 shadow-[0_0_15px_rgba(0,102,255,0.15)] group-hover:shadow-[0_0_20px_rgba(0,102,255,0.25)] transition-shadow duration-300 overflow-hidden bg-white/20">
            <img
              src="/images/authors/logo.png"
              alt="Swapan Publication Logo"
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }}
            />
            <div className="h-full w-full bg-gradient-to-br from-[#0EA5A4] to-[#0077b5] flex items-center justify-center text-white font-bold text-sm hidden absolute inset-0">
              SP
            </div>
          </div>
          <span className="font-serif text-[16px] md:text-[20px] font-bold tracking-tight text-[#1e3a8a] truncate transition-colors group-hover:text-[#0044ff]">
            <span className="hidden sm:inline">Swapan Publication</span>
            <span className="sm:hidden">Swapan</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-[2.5rem] absolute left-1/2 -translate-x-1/2">
          <NavLink
            href="#"
            label="Publications"
            active={pathname.startsWith('/browse') || pathname.startsWith('/publish-guidelines')}
            hasDropdown={true}
            dropdownItems={[
              { label: 'Journals', href: '/browse' },
              { label: 'Guidelines', href: '/publish-guidelines' }
            ]}
          />
          <NavLink href="/about" label="About" active={pathname === '/about'} />
          <NavLink href="/membership" label="Membership" active={pathname === '/membership'} />
          <NavLink href="/contact" label="Contact Us" active={pathname === '/contact'} />
        </div>

        {/* Desktop Auth / Actions */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          <div className="flex items-center justify-center scale-90 opacity-90 hover:opacity-100 transition-opacity">
            <ThemeToggle />
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 border-l border-[#1e3a8a]/10 pl-3">
              <NavLink
                href="#"
                label="Account"
                active={pathname.startsWith('/dashboard') || pathname.startsWith('/submit') || pathname.startsWith('/admin')}
                hasDropdown={true}
                dropdownItems={[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Submit Paper', href: '/submit' },
                  ...(user?.role === 'admin' ? [{ label: 'Admin Panel', href: '/admin' }] : [])
                ]}
              />
              <button onClick={handleLogout} className="bg-[#1e3a8a] text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-[0_4px_12px_rgba(25,52,79,0.15)] hover:shadow-[0_6px_16px_rgba(0,68,255,0.3)] hover:scale-105 transition-all duration-250 ml-2">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-5 border-l border-white/30 pl-5">
              <Link href="/signup" className="text-[#1e3a8a] hover:text-[#0044ff] transition-colors text-[14px] font-semibold tracking-wide">Register</Link>
              <Link href="/login" className="bg-[#1e3a8a] text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-[0_4px_12px_rgba(25,52,79,0.15)] hover:shadow-[0_6px_16px_rgba(0,68,255,0.3)] hover:scale-105 transition-all duration-250">
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Mobile — hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <div className="scale-90">
            <ThemeToggle />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-[#1e3a8a] hover:bg-white/20 p-2 rounded-full h-[40px] w-[40px] flex items-center justify-center transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/5 backdrop-blur-md md:hidden pt-[100px] px-4">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white/90 backdrop-blur-2xl border border-white/40 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex flex-col gap-4 text-[#0F172A]"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-[#0044ff] font-bold px-3 pb-2">Navigation</span>
              <MobileLink href="/browse" label="Publications" onClick={closeMobile} />
              <MobileLink href="/about" label="About" onClick={closeMobile} />
              <MobileLink href="/membership" label="Membership" onClick={closeMobile} />
              <MobileLink href="/contact" label="Contact Us" onClick={closeMobile} />
            </div>

            <div className="border-t border-gray-200/50 my-1" />

            {isAuthenticated ? (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-widest text-[#0044ff] font-bold px-3 pb-2">Account</span>
                <MobileLink href="/dashboard" label="Dashboard" onClick={closeMobile} />
                <MobileLink href="/submit" label="Submit Paper" onClick={closeMobile} />
                {user?.role === 'admin' && (
                  <MobileLink href="/admin" label="Admin Panel" onClick={closeMobile} />
                )}
                <button onClick={() => { closeMobile(); handleLogout(); }} className="text-left text-red-500 text-sm font-semibold px-3 py-3 rounded-xl hover:bg-red-50 transition-colors w-full mt-2">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <Link href="/signup" onClick={closeMobile} className="text-[#1e3a8a] text-sm font-semibold px-3 py-2 rounded-xl hover:bg-black/5 transition-colors text-center border border-gray-200/50">Register</Link>
                <Link href="/login" onClick={closeMobile} className="bg-[#1e3a8a] text-white text-sm font-bold px-3 py-3 rounded-xl hover:shadow-lg transition-all text-center">
                  Sign In
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}

function NavLink({ href, label, active, hasDropdown, dropdownItems }: { href: string; label: string; active: boolean; hasDropdown?: boolean; dropdownItems?: { label: string, href: string }[] }) {
  return (
    <div className="relative group px-3 py-2 flex items-center justify-center">
      <Link href={href} onClick={(e) => { if (href === '#') e.preventDefault(); }} className="flex flex-col items-center">
        <span className={`relative z-10 text-[14px] font-semibold tracking-wide transition-all duration-[220ms] flex flex-col items-center ${active ? 'text-[#0044ff]' : 'text-[#1e3a8a] group-hover:text-[#0044ff] group-hover:-translate-y-[2px]'}`}>
          <span className="flex items-center">
            {label}
            {hasDropdown && <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />}
          </span>
          <span className={`absolute -bottom-1 h-[2px] bg-[#0044ff] rounded-full transition-all duration-[220ms] ease-out origin-center ${active ? 'w-full scale-x-100 opacity-100' : 'w-full scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'}`} />
        </span>
      </Link>

      {/* Dropdown Menu */}
      {dropdownItems && (
        <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-[12px] w-[180px] bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 p-2 z-50">
          <div className="absolute -top-3 left-0 w-full h-4 bg-transparent" /> {/* Invisible bridge for hover */}
          {dropdownItems.map((item, idx) => (
            <Link key={idx} href={item.href} className="block px-4 py-2.5 text-[13px] font-semibold text-[#1e3a8a]/80 hover:text-[#0044ff] hover:bg-black/5 rounded-xl transition-all">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="text-[#1e3a8a] text-base font-semibold px-3 py-3 rounded-xl hover:bg-black/5 transition-colors flex items-center">
      {label}
    </Link>
  );
}
