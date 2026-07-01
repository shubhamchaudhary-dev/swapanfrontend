'use client';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import dynamic from 'next/dynamic';
import AntigravityBackground from '@/components/AntigravityBackground';
const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false });
import FeaturedAuthors from '@/components/FeaturedAuthors';
import FeaturedJournals from '@/components/FeaturedJournals';
import { Eye, Download, Calendar, FileText, Users, BookOpen } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface Paper {
  _id: string;
  title: string;
  abstract: string;
  authors: string[];
  views: number;
  downloads: number;
  slug: string;
  subject?: { name: string };
  coverImage?: string;
  keywords?: string[];
  status?: string;
  publishedAt?: string;
  createdAt?: string;
}

export default function HomePage() {
  const router = useRouter();

  // Newsletter state
  const [email, setEmail] = React.useState('');
  const [isSubscribing, setIsSubscribing] = React.useState(false);
  const [subscribeMessage, setSubscribeMessage] = React.useState('');
  const [subscribeError, setSubscribeError] = React.useState(false);

  const { data: popularPapers } = useQuery<{ data: Paper[] }>({
    queryKey: ['papers', 'home'],
    queryFn: async () => (await api.get('/api/papers?limit=6')).data,
  });

  const { data: cmsDataRaw } = useQuery({
    queryKey: ['cms', 'homepage'],
    queryFn: async () => (await api.get('/api/cms')).data,
  });

  const papers = popularPapers?.data || [];
  const cmsConfig = cmsDataRaw?.data?.value || {};
  const stats = cmsConfig.stats || { papers: 19, authors: 5, institutions: 3 };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    setSubscribeMessage('');
    setSubscribeError(false);

    try {
      const res = await api.post('/api/subscribers', { email });
      setSubscribeMessage(res.data.message || 'Successfully subscribed!');
      setEmail('');
    } catch (err: any) {
      setSubscribeError(true);
      setSubscribeMessage(err.response?.data?.error || 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <>
      <div className="swarn-home-override">

        {/* NAV */}
        <Navbar />

        {/* HERO — full-canvas architecture */}
        <section
          className="hero relative w-full overflow-hidden text-[#0F172A]"
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f5ff 50%, #e0ebff 100%)'
          }}
        >
          {/* ── 3D Canvas — absolute, covers the ENTIRE hero ── */}
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            <HeroScene />
          </div>

          {/* ── HTML content — floats ABOVE the 3D canvas ── */}
          <div
            className="relative w-full h-full flex pt-20 md:pt-28 pb-40"
            style={{ minHeight: '100vh', zIndex: 10 }}
          >
            <div
              className="w-full mx-auto px-8 lg:px-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
              style={{ maxWidth: '1400px' }}
            >
              {/* Left — text content */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left pt-6 md:pt-0 max-w-[560px] mx-auto md:mx-0">

                {/* Eyebrow */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-sm font-bold tracking-[0.2em] text-blue-600 uppercase">Open Research</span>
                </div>

                <h1
                  className="font-serif font-bold mb-6 tracking-tight text-left"
                  style={{ fontSize: 'clamp(2.75rem, 8vw, 3.5rem)', lineHeight: 0.9, letterSpacing: '-0.04em', color: '#0F172A' }}
                >
                  Ideas.<br />
                  <span className="text-blue-600">Published.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-slate-700 mb-10 leading-relaxed font-light max-w-lg text-left" style={{ letterSpacing: '-0.01em' }}>
                  Advancing global knowledge.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Link
                    href="/submit"
                    className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0F172A] text-white rounded-full font-medium transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 overflow-hidden"
                  >
                    <span className="relative z-10 text-sm">Submit Paper</span>
                    <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </div>
              </div>

              {/* Right — intentionally empty: 3D papers render through the canvas */}
              <div className="hidden md:block" />
            </div>
          </div>

          {/* STATS (Floating at the bottom of the hero) */}
          <div className="absolute inset-x-0 bottom-8 z-20 pointer-events-none">
            <div className="stats-section no-card-stats pointer-events-auto">
              <div className="stats-container-flex">
                {/* PAPERS */}
                <div className="stat-item-new stat-purple">
                  <div className="stat-icon-badge">
                    <FileText size={18} />
                  </div>
                  <div className="stat-circle">
                    <span className="stat-number-text">{stats.papers != null ? stats.papers.toLocaleString() : '19'}</span>
                    <span className="stat-label-text">PAPERS</span>
                    <div className="stat-dash"></div>
                  </div>
                </div>
                {/* AUTHORS */}
                <div className="stat-item-new stat-green">
                  <div className="stat-icon-badge">
                    <Users size={18} />
                  </div>
                  <div className="stat-circle">
                    <span className="stat-number-text">{stats.authors != null ? stats.authors.toLocaleString() : '5'}</span>
                    <span className="stat-label-text">AUTHORS</span>
                    <div className="stat-dash"></div>
                  </div>
                </div>
                {/* JOURNALS */}
                <div className="stat-item-new stat-orange">
                  <div className="stat-icon-badge">
                    <BookOpen size={18} />
                  </div>
                  <div className="stat-circle">
                    <span className="stat-number-text">{stats.institutions != null ? stats.institutions.toLocaleString() : '150'}</span>
                    <span className="stat-label-text">JOURNALS</span>
                    <div className="stat-dash"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED AUTHORS & RESEARCHERS */}
        <FeaturedAuthors />

        {/* FEATURED PAPERS */}
        <section className="section section-bg-white">
          <div className="section-inner">
            <div className="section-header">
              <h2 className="section-title">Trending Papers</h2>
              <Link href="/browse" className="view-all">View all →</Link>
            </div>
            <div className="papers-list">
              {cmsConfig.featuredPaperIds?.length > 0 ? cmsConfig.featuredPaperIds.map((paper: any) => (
                <div className="acm-paper-card" key={paper._id} onClick={() => router.push(`/paper/${paper.slug}`)}>
                  <div className="acm-paper-left">
                    {paper.coverImage && (
                      <img
                        src={paper.coverImage}
                        alt="Cover"
                        className="acm-paper-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextEl = e.currentTarget.nextElementSibling;
                          if (nextEl) (nextEl as HTMLElement).style.display = 'flex';
                        }}
                      />
                    )}
                    <div className="acm-paper-cover-placeholder" style={{ display: paper.coverImage ? 'none' : 'flex' }}>
                      <span>{paper.subject?.name?.[0] || 'R'}</span>
                    </div>
                  </div>
                  <div className="acm-paper-center">
                    <div className="acm-paper-meta-top">
                      <span className="acm-paper-type">{paper.subject?.name || 'Research'}</span>
                    </div>
                    <div className="acm-paper-title">{paper.title}</div>
                    <div className="acm-paper-authors">{Array.isArray(paper.authors) ? paper.authors.map((a: string) => a.split(' | ')[0].trim()).filter(Boolean).join(', ') : 'Unknown'}</div>
                    <div className="acm-paper-abstract">{paper.abstract?.replace(/\[Corresponding Email:.*?\]\s*/gi, '').trim()}</div>
                    {paper.keywords && paper.keywords.length > 0 && (
                      <div className="acm-paper-keywords">
                        {paper.keywords.map((kw: string, i: number) => (
                          <span key={i} className="acm-paper-keyword">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="acm-paper-right">
                    <div className="acm-paper-stats-list hidden md:flex">
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon view-icon"><Eye className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.views >= 1000 ? (paper.views / 1000).toFixed(1) + 'K' : (paper.views || 0)}</span>
                          <span className="acm-stat-lbl">Views</span>
                        </div>
                      </div>
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon download-icon"><Download className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.downloads >= 1000 ? (paper.downloads / 1000).toFixed(1) + 'K' : (paper.downloads || 0)}</span>
                          <span className="acm-stat-lbl">Downloads</span>
                        </div>
                      </div>
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon date-icon"><Calendar className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.publishedAt ? new Date(paper.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date(paper.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          <span className="acm-stat-lbl">Published</span>
                        </div>
                      </div>
                    </div>
                    <div className="acm-paper-actions">
                      <Link
                        href={`/paper/${paper.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="acm-view-btn"
                      >
                        <Eye className="w-3.5 h-3.5" /> Read Paper
                      </Link>
                    </div>
                  </div>
                </div>
              )) : papers.length > 0 ? papers.map((paper: any) => (
                <div className="acm-paper-card" key={paper._id} onClick={() => router.push(`/paper/${paper.slug}`)}>
                  <div className="acm-paper-left">
                    {paper.coverImage ? (
                      <img src={paper.coverImage} alt="Cover" className="acm-paper-cover" />
                    ) : (
                      <div className="acm-paper-cover-placeholder">
                        <span>{paper.subject?.name?.[0] || 'R'}</span>
                      </div>
                    )}
                  </div>
                  <div className="acm-paper-center">
                    <div className="acm-paper-meta-top">
                      <span className="acm-paper-type">{paper.subject?.name || 'Research'}</span>
                    </div>
                    <div className="acm-paper-title">{paper.title}</div>
                    <div className="acm-paper-authors">{Array.isArray(paper.authors) ? paper.authors.map((a: string) => a.split(' | ')[0].trim()).filter(Boolean).join(', ') : 'Unknown'}</div>
                    <div className="acm-paper-abstract">{paper.abstract?.replace(/\[Corresponding Email:.*?\]\s*/gi, '').trim()}</div>
                    {paper.keywords && paper.keywords.length > 0 && (
                      <div className="acm-paper-keywords">
                        {paper.keywords.map((kw: string, i: number) => (
                          <span key={i} className="acm-paper-keyword">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="acm-paper-right">
                    <div className="acm-paper-stats-list hidden md:flex">
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon view-icon"><Eye className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.views >= 1000 ? (paper.views / 1000).toFixed(1) + 'K' : (paper.views || 0)}</span>
                          <span className="acm-stat-lbl">Views</span>
                        </div>
                      </div>
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon download-icon"><Download className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.downloads >= 1000 ? (paper.downloads / 1000).toFixed(1) + 'K' : (paper.downloads || 0)}</span>
                          <span className="acm-stat-lbl">Downloads</span>
                        </div>
                      </div>
                      <div className="acm-stat-item">
                        <div className="acm-stat-icon date-icon"><Calendar className="w-4 h-4" /></div>
                        <div className="acm-stat-info">
                          <span className="acm-stat-val">{paper.publishedAt ? new Date(paper.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date(paper.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          <span className="acm-stat-lbl">Published</span>
                        </div>
                      </div>
                    </div>
                    <div className="acm-paper-actions">
                      <Link
                        href={`/paper/${paper.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="acm-view-btn"
                      >
                        <Eye className="w-3.5 h-3.5" /> Read Paper
                      </Link>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-faint)' }}>No papers found.</div>
              )}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE */}
        <section className="section section-bg-sand">
          <div className="section-inner">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '2rem' }}>
              <h2 className="section-title !text-[1.5rem] sm:!text-[1.65rem] md:!text-[1.85rem]" style={{ textAlign: 'center', width: '100%', margin: '0 auto' }}>Why Researchers Choose SwapanPublication</h2>
              <p style={{ fontSize: '14.5px', color: 'var(--ink-muted)', marginTop: '0.25rem', textAlign: 'center', width: '100%', maxWidth: '600px', margin: '0.25rem auto 0 auto' }}>
                Built for academic excellence — every feature designed around research integrity and global visibility.
              </p>
            </div>
            <div className="features-grid">

              {/* 1 Peer Reviewed */}
              <div className="feature-card">
                <div className="feature-title">Peer Reviewed</div>
                <div className="feature-desc">Rigorous expert review process ensuring research quality.</div>
              </div>

              {/* 2 Open Access */}
              <div className="feature-card">
                <div className="feature-title">Open Access</div>
                <div className="feature-desc">Research accessible globally without restrictions.</div>
              </div>

              {/* 3 Fast Publishing */}
              <div className="feature-card">
                <div className="feature-title">Fast Publishing</div>
                <div className="feature-desc">Streamlined workflow for quicker publication timelines.</div>
              </div>

              {/* 4 DOI Support */}
              <div className="feature-card">
                <div className="feature-title">DOI Support</div>
                <div className="feature-desc">Permanent digital identifiers for every publication.</div>
              </div>

              {/* 5 Global Reach */}
              <div className="feature-card">
                <div className="feature-title">Global Reach</div>
                <div className="feature-desc">Connect with researchers and institutions worldwide.</div>
              </div>

              {/* 6 Ethical Standards */}
              <div className="feature-card">
                <div className="feature-title">Ethical Standards</div>
                <div className="feature-desc">Publication practices aligned with academic integrity.</div>
              </div>

              {/* 7 Expert Editors */}
              <div className="feature-card">
                <div className="feature-title">Expert Editors</div>
                <div className="feature-desc">Experienced editorial board across multiple disciplines.</div>
              </div>

              {/* 8 Digital Archive */}
              <div className="feature-card">
                <div className="feature-title">Digital Archive</div>
                <div className="feature-desc">Secure long-term preservation of published research.</div>
              </div>

            </div>
          </div>
        </section>


        {/* HOW IT WORKS */}
        <section className="section section-bg-sand">
          <div className="section-inner">
            <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center', display: 'block', marginBottom: '3rem' }}>
              <h2 className="section-title">How SwapanPublication Works</h2>
              <p style={{ color: 'var(--ink-muted)', marginTop: '.5rem', fontSize: '14.5px' }}>From submission to global discovery in four simple steps.</p>
            </div>
            <div className="steps-grid">
              <div className="step-item">
                <div className="step-num">1</div>
                <div className="step-title">Create Account</div>
                <div className="step-desc">Register as an author or reader in under 2 minutes. Free for all researchers.</div>
              </div>
              <div className="step-item">
                <div className="step-num">2</div>
                <div className="step-title">Submit Research</div>
                <div className="step-desc">Upload your manuscript. Our editorial system guides you through formatting and metadata.</div>
              </div>
              <div className="step-item">
                <div className="step-num">3</div>
                <div className="step-title">Peer Review</div>
                <div className="step-desc">Qualified reviewers evaluate your work. Track status in real time on your dashboard.</div>
              </div>
              <div className="step-item">
                <div className="step-num">4</div>
                <div className="step-title">Publish &amp; Share</div>
                <div className="step-desc">Accepted papers are indexed globally and shared with thousands of researchers.</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED JOURNALS */}
        <FeaturedJournals />

        {/* NEWSLETTER */}
        <section className="newsletter-section">
          <h2 className="!text-white">Stay Updated with New Research</h2>
          <p>Get weekly digests of the most-downloaded papers in your field, plus calls for submissions and journal announcements.</p>
          <form onSubmit={handleSubscribe} className="newsletter-form">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubscribing}
            />
            <button type="submit" disabled={isSubscribing} className="disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
              {isSubscribing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Subscribe'}
            </button>
          </form>
          {subscribeMessage && (
            <div className={`mt-4 text-sm font-medium ${subscribeError ? 'text-red-400' : 'text-green-400'}`}>
              {subscribeMessage}
            </div>
          )}
          <p className="newsletter-note">No spam. Unsubscribe at any time. We respect your privacy.</p>
        </section>





        {/* FOOTER */}
        <Footer />

      </div>
    </>
  );
}
