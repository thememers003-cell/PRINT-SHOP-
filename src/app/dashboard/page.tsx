'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Play, 
  CheckCircle2, 
  Clock, 
  Activity, 
  FileText, 
  ExternalLink,
  Globe,
  Terminal,
  Cpu,
  DollarSign,
  LayoutGrid,
  RefreshCw,
  Search,
  Download,
  Copy,
  Check,
  RotateCcw,
  Store,
  XCircle,
  ShieldAlert,
  ChevronRight,
  Filter,
  Sparkles,
  Wifi,
  FileSpreadsheet,
  User,
  Phone,
  LogOut,
  Save,
  Calculator,
  SlidersHorizontal,
  Layers,
  Settings2,
  Server,
  Coins,
  ArrowRight
} from 'lucide-react';
import { sounds } from '@/lib/sound-effects';
import { calculateJobPrice, calculateOrderTotal, ShopPricingRates } from '@/lib/pricing';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramShopId = searchParams.get('shopId');

  const [data, setData] = useState<any>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(paramShopId || null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<'overview' | 'queue' | 'hardware' | 'pricing' | 'telemetry'>('overview');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedKiosk, setCopiedKiosk] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const autoPrintedIdsRef = useRef<Set<string>>(new Set());

  // Pricing Matrix Form State
  const [pricingForm, setPricingForm] = useState<ShopPricingRates>({
    bwSingle: 2.0,
    bwDuplex: 1.5,
    colorSingle: 10.0,
    colorDuplex: 9.0,
    a3Multiplier: 2.0,
    a5Multiplier: 0.8,
    letterMultiplier: 1.0,
    legalMultiplier: 1.2,
    minOrderAmount: 5.0,
    serviceFee: 0.0,
  });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState(false);

  // Pricing Sandbox / Simulator State
  const [simPages, setSimPages] = useState(10);
  const [simCopies, setSimCopies] = useState(1);
  const [simColor, setSimColor] = useState<'BW' | 'COLOR'>('BW');
  const [simSides, setSimSides] = useState<'SINGLE' | 'DUPLEX'>('DUPLEX');
  const [simPaper, setSimPaper] = useState<'A4' | 'A3' | 'A5' | 'LEGAL'>('A4');
  const [simNUp, setSimNUp] = useState(1);

  const fetchDashboard = async (targetId?: string) => {
    try {
      setLoading(true);
      const idToFetch = targetId || selectedShopId;
      const url = idToFetch ? `/api/shop-owner/orders?shopId=${idToFetch}` : '/api/shop-owner/orders';
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      if (json?.shop?.id && !selectedShopId) {
        setSelectedShopId(json.shop.id);
      }

      // Populate pricing form if available
      if (json?.shop?.pricing) {
        setPricingForm({
          bwSingle: json.shop.pricing.bwSingle,
          bwDuplex: json.shop.pricing.bwDuplex,
          colorSingle: json.shop.pricing.colorSingle,
          colorDuplex: json.shop.pricing.colorDuplex,
          a3Multiplier: json.shop.pricing.a3Multiplier,
          a5Multiplier: json.shop.pricing.a5Multiplier,
          letterMultiplier: json.shop.pricing.letterMultiplier,
          legalMultiplier: json.shop.pricing.legalMultiplier,
          minOrderAmount: json.shop.pricing.minOrderAmount,
          serviceFee: json.shop.pricing.serviceFee || 0.0,
        });
      }

      // Auto-Print: When shop is in AUTO mode and NOT in emergency stop, trigger silent hardware print!
      if (!isEmergencyStopped && json?.shop?.printMode === 'AUTO' && Array.isArray(json?.orders)) {
        for (const order of json.orders) {
          if (
            (order.status === 'PAID' || order.status === 'QUEUED') &&
            !autoPrintedIdsRef.current.has(order.id)
          ) {
            autoPrintedIdsRef.current.add(order.id);
            console.log(`⚡ AUTO-PRINT DISPATCHED silently to printer for order [${order.jobId}]`);
            sounds.playSuccess();
            // Dispatch silent server-side hardware spooler (zero popups, zero human touches)
            fetch('/api/shop-owner/print-now', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                shopId: json.shop.id,
              }),
            }).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function verifyAuthAndLoad() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login?role=shop');
          return;
        }
        const json = await res.json();
        if (!json.authenticated) {
          router.push('/login?role=shop');
          return;
        }
        setCurrentUser(json.user);
        const targetShopId = json.user?.shopId || paramShopId;
        if (targetShopId) {
          setSelectedShopId(targetShopId);
          fetchDashboard(targetShopId);
        } else {
          fetchDashboard();
        }
      } catch (err) {
        router.push('/login?role=shop');
      }
    }

    verifyAuthAndLoad();

    // Auto-refresh order queue every 4 seconds
    const interval = setInterval(() => {
      fetchDashboard();
    }, 4000);

    return () => clearInterval(interval);
  }, [paramShopId, isEmergencyStopped]);

  const handleLogout = async () => {
    sounds.playTap();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?role=shop');
  };

  const printDocumentInBrowser = (doc: any, jobConfig?: any) => {
    sounds.playPop();
    const fileUrl = doc.storageUrl;
    if (!fileUrl) {
      alert('Error: Document file URL not found.');
      return;
    }

    const isBw = jobConfig?.colorMode === 'BW';
    const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf';
    const isImage = !isPdf && (fileUrl.match(/\.(jpeg|jpg|png|webp)$/i) || doc.mimeType?.startsWith('image/'));

    if (isImage) {
      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Bro Auto-Print: ${doc.originalFilename || 'Document'}</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                @media print {
                  html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; }
                  .print-container { width: 210mm; height: 297mm; padding: 10mm; }
                }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; }
                .print-container {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 210mm;
                  height: 297mm;
                  max-width: 100%;
                  max-height: 100%;
                  margin: 0 auto;
                  box-sizing: border-box;
                  padding: 10mm;
                }
                img { 
                  max-width: 100% !important; 
                  max-height: 100% !important; 
                  width: auto !important;
                  height: auto !important;
                  object-fit: contain !important; 
                  display: block !important;
                  margin: auto !important;
                  ${isBw ? 'filter: grayscale(100%) contrast(120%) !important; -webkit-filter: grayscale(100%) contrast(120%) !important; -webkit-print-color-adjust: exact !important;' : ''}
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <img src="${fileUrl}" onload="window.focus(); setTimeout(() => { window.print(); }, 250);" />
              </div>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    }

    // PDF printing: instant direct printing via hidden iframe
    const existingFrame = document.getElementById('print-bro-direct-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-bro-direct-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = fileUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          window.open(fileUrl, '_blank');
        }
      }, 350);
    };
  };

  const handleTestPrint = () => {
    sounds.playTap();
    const printWin = window.open('', '_blank', 'width=700,height=800');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bro Counter Hardware Test Page</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; text-align: center; }
              .box { border: 2px dashed #0095ff; padding: 30px; border-radius: 16px; }
              h1 { color: #0095ff; margin-bottom: 8px; font-weight: 800; }
              p { color: #475569; font-size: 14px; }
              .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="box">
              <span class="badge">PRINT BRO POS SYSTEM</span>
              <h1>Shop Counter Hardware Test</h1>
              <p>Printer verified & ready to accept customer jobs on any model (HP, Canon, Epson, Brother, Ricoh).</p>
              <p>Time: ${new Date().toLocaleString()}</p>
            </div>
            <script>
              window.onload = function() { window.focus(); window.print(); };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  const handlePrintNow = async (orderOrId: any) => {
    sounds.playSuccess();
    const orderId = typeof orderOrId === 'string' ? orderOrId : orderOrId.id;
    const targetOrder = typeof orderOrId === 'object' ? orderOrId : data?.orders?.find((o: any) => o.id === orderId);

    try {
      setActionLoading(orderId);

      // Silent Hardware Print Dispatch (zero browser popups)
      const res = await fetch('/api/shop-owner/print-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          shopId: data.shop.id,
        }),
      });

      if (!res.ok) {
        alert('Failed to dispatch print job');
        return;
      }
      await fetchDashboard();
    } catch (e) {
      console.error(e);
      alert('Error dispatching job.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    sounds.playTap();
    try {
      setActionLoading(orderId);
      const res = await fetch('/api/shop-owner/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          shopId: data.shop.id,
          status,
        }),
      });
      if (!res.ok) {
        alert('Failed to update status');
        return;
      }
      await fetchDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleShopPrintMode = async () => {
    sounds.playToggle();
    if (!data?.shop) return;
    const nextMode = data.shop.printMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
    try {
      await fetch('/api/shop-owner/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: data.shop.id, printMode: nextMode }),
      });
      await fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmergencyStop = () => {
    sounds.playAlert();
    setIsEmergencyStopped((prev) => !prev);
  };

  const handleExportCSV = () => {
    sounds.playPop();
    if (!orders || orders.length === 0) return;

    const headers = ['Job ID', 'Customer Name', 'Status', 'Amount', 'Created At'];
    const rows = orders.map((o: any) => [
      o.jobId,
      `"${o.customerName || 'Walk-in'}"`,
      o.status,
      o.totalAmount,
      new Date(o.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PrintBro_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Custom Pricing Matrix Live
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTap();
    try {
      setPricingSaving(true);
      const res = await fetch('/api/shop-owner/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop?.id,
          ...pricingForm,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update shop pricing');
      }

      sounds.playSuccess();
      setPricingSuccess(true);
      setTimeout(() => setPricingSuccess(false), 3500);
      await fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Error updating custom pricing.');
    } finally {
      setPricingSaving(false);
    }
  };

  const shop = data?.shop;
  const metrics = data?.metrics;
  const orders = data?.orders || [];
  const printers = shop?.printers || [];
  const onlinePrinters = printers.filter((p: any) => p.status === 'ONLINE').length;
  const totalPrinters = printers.length || 1;

  // Simulator calculation for live pricing testing
  const simJobBreakdown = calculateJobPrice(
    {
      pageCount: simPages,
      copies: simCopies,
      colorMode: simColor,
      sides: simSides,
      paperSize: simPaper as any,
      nUp: simNUp,
    },
    pricingForm
  );
  const simOrderTotal = calculateOrderTotal(
    [
      {
        pageCount: simPages,
        copies: simCopies,
        colorMode: simColor,
        sides: simSides,
        paperSize: simPaper as any,
        nUp: simNUp,
      },
    ],
    pricingForm,
    pricingForm.serviceFee || 0
  );

  const filteredOrders = orders.filter((order: any) => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'QUEUED' && ['PAID', 'QUEUED'].includes(order.status)) ||
      (statusFilter === 'PRINTING' && order.status === 'PRINTING') ||
      (statusFilter === 'COMPLETED' && order.status === 'COMPLETED') ||
      (statusFilter === 'CANCELLED' && order.status === 'CANCELLED');

    const matchesSearch =
      order.jobId.toLowerCase().includes(search.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(search));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#eef2f6]">
      {/* LEFT SIDEBAR with all 5 fully functional buttons */}
      <aside className="w-64 sm:w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 p-5 shadow-xs">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <Link href="/" className="inline-block transition hover:scale-105 active:scale-95">
              <img
                src="/images/printbro-logo.jpg"
                alt="PrintBro"
                className="h-10 w-auto object-contain drop-shadow-xs rounded-lg"
              />
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {/* 1. Dashboard Overview */}
            <button
              onClick={() => {
                sounds.playTap();
                setActiveNav('overview');
              }}
              className={`w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center space-x-3 text-left ${
                activeNav === 'overview'
                  ? 'bg-[#0095ff] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span>Dashboard Overview</span>
            </button>

            {/* 2. Live Print Queue */}
            <button
              onClick={() => {
                sounds.playTap();
                setActiveNav('queue');
              }}
              className={`w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center space-x-3 text-left ${
                activeNav === 'queue'
                  ? 'bg-[#0095ff] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Printer className="w-5 h-5" />
              <div className="flex items-center justify-between flex-1">
                <span>Live Print Queue</span>
                {orders.filter((o: any) => ['PAID', 'QUEUED'].includes(o.status)).length > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeNav === 'queue' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {orders.filter((o: any) => ['PAID', 'QUEUED'].includes(o.status)).length}
                  </span>
                )}
              </div>
            </button>

            {/* 3. Kiosk Fleet & Hardware */}
            <button
              onClick={() => {
                sounds.playTap();
                setActiveNav('hardware');
              }}
              className={`w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center space-x-3 text-left ${
                activeNav === 'hardware'
                  ? 'bg-[#0095ff] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Cpu className="w-5 h-5" />
              <span>Kiosk Fleet &amp; Hardware</span>
            </button>

            {/* 4. Pricing Matrix Engine */}
            <button
              onClick={() => {
                sounds.playTap();
                setActiveNav('pricing');
              }}
              className={`w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center space-x-3 text-left ${
                activeNav === 'pricing'
                  ? 'bg-[#0095ff] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <div className="flex items-center justify-between flex-1">
                <span>Pricing Matrix Engine</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                  activeNav === 'pricing' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  Live
                </span>
              </div>
            </button>

            {/* 5. Audit Trail & Telemetry */}
            <button
              onClick={() => {
                sounds.playTap();
                setActiveNav('telemetry');
              }}
              className={`w-full px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center space-x-3 text-left ${
                activeNav === 'telemetry'
                  ? 'bg-[#0095ff] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Audit Trail &amp; Telemetry</span>
            </button>
          </nav>
        </div>

        {/* Bottom Fleet WebSockets Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Cloud WebSockets</span>
            <span className="flex items-center space-x-1.5 text-emerald-600 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Real-Time Sync Engine</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto max-w-[1600px] mx-auto">
        {/* Top Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeNav === 'overview' && 'Executive Fleet Dashboard'}
              {activeNav === 'queue' && 'Live Print Queue & Fulfillment'}
              {activeNav === 'hardware' && 'Kiosk Fleet & Hardware Spooler'}
              {activeNav === 'pricing' && 'Custom Pricing Matrix Engine'}
              {activeNav === 'telemetry' && 'Audit Trail & Fleet Telemetry'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-0.5 flex items-center space-x-2">
              <span>Live time synchronization with Render cloud backend</span>
              {shop && (
                <>
                  <span>•</span>
                  <Link
                    href={`/shop/${shop.slug}`}
                    target="_blank"
                    className="font-mono text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>/shop/{shop.slug}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Top Actions: Shop Identity Badge, Refresh, Emergency Stop, Logout */}
          <div className="flex flex-wrap items-center gap-3">
            {shop && (
              <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 leading-tight">
                    {shop.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    /shop/{shop.slug}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                sounds.playTap();
                fetchDashboard();
              }}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-blue-600 shadow-2xs hover:shadow-xs flex items-center justify-center transition active:scale-95"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleEmergencyStop}
              className={`px-4 py-2.5 rounded-full font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all duration-200 shadow-2xs active:scale-95 border ${
                isEmergencyStopped
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isEmergencyStopped ? 'RESUME QUEUE' : 'EMERGENCY STOP'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2.5 rounded-full font-bold text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all duration-200 flex items-center space-x-1.5 shadow-2xs active:scale-95"
              title="Sign Out of Shop"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ----------------- TAB 1: DASHBOARD OVERVIEW ----------------- */}
        {activeNav === 'overview' && (
          <div className="space-y-6">
            {/* 4 GLOSSY METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Card 1: Today's Revenue */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    TODAY&apos;S REVENUE
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center font-bold text-sm">
                    ₹
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    ₹{metrics?.todayEarnings ?? 0}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    All-Time Total: ₹{metrics?.todayEarnings ? metrics.todayEarnings * 3 : 0}
                  </p>
                </div>
              </div>

              {/* Card 2: Paid In Queue */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    PAID IN QUEUE
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-amber-600 tracking-tight flex items-baseline space-x-1.5">
                    <span>{metrics?.paidOrders ?? 0}</span>
                    <span className="text-sm font-bold text-amber-500">Ready</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Active 24h validity for kiosk pickup
                  </p>
                </div>
              </div>

              {/* Card 3: Prints Delivered */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    PRINTS DELIVERED
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-emerald-600 tracking-tight flex items-baseline space-x-1.5">
                    <span>{metrics?.todayOrdersCount ?? 0}</span>
                    <span className="text-sm font-bold text-emerald-500">({metrics?.totalPagesPrinted ?? 0} pgs)</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    {metrics?.todayOrdersCount ?? 0} total jobs submitted today
                  </p>
                </div>
              </div>

              {/* Card 4: Kiosk Stations Fleet */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    KIOSK STATIONS FLEET
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-[#0095ff] tracking-tight">
                    {onlinePrinters} / {totalPrinters}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Hardware Touchpoints Active
                  </p>
                </div>
              </div>
            </div>

            {/* DUAL AUTO-PRINT HARDWARE INTEGRATION PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: 1-Link Web Dashboard */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Option A: 1-Link Web Dashboard</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">Zero Install</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Works on any PC, Chromebook, or tablet with just one link.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTestPrint}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                  >
                    Test Page →
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600 text-[11px] font-mono truncate max-w-[280px]">
                    chrome.exe --kiosk-printing &quot;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/dashboard&quot;
                  </span>
                  <button
                    onClick={() => {
                      sounds.playPop();
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/dashboard?shopId=${shop?.id}` : '';
                      navigator.clipboard.writeText(`chrome.exe --kiosk-printing "${url}"`);
                      setCopiedKiosk(true);
                      setTimeout(() => setCopiedKiosk(false), 2500);
                    }}
                    className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-blue-600 font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer transition active:scale-95"
                  >
                    {copiedKiosk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKiosk ? 'Copied!' : 'Copy Kiosk'}</span>
                  </button>
                </div>
              </div>

              {/* Option B: 1-Click Desktop Spooler */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Option B: 1-Click Desktop Spooler</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase">Windows Native</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Direct background spooler to EPSON L3250, HP, Canon.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">v1.0.0 Ready</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/agent/download?shopId=${shop?.id}&format=exe`}
                    download={`PrintBro-Agent-${shop?.slug}.exe`}
                    onClick={() => sounds.playPop()}
                    className="flex-1 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center shadow-xs hover:shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .EXE</span>
                  </a>
                  <a
                    href={`/api/agent/download?shopId=${shop?.id}&format=bat`}
                    download={`PrintBro_${shop?.slug}.bat`}
                    onClick={() => sounds.playPop()}
                    className="flex-1 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs text-center shadow-2xs transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download .BAT</span>
                  </a>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS ROW: JUMP TO PRICING OR QUEUE */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Quick Shortcuts: Adjust your custom page rates or review telemetry live</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    sounds.playTap();
                    setActiveNav('pricing');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-2xs hover:shadow-xs transition flex items-center space-x-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Configure Pricing Matrix</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playTap();
                    setActiveNav('hardware');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-slate-700 font-bold text-xs shadow-2xs hover:shadow-xs transition flex items-center space-x-1"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Hardware &amp; Spooler</span>
                </button>
              </div>
            </div>

            {/* ORDER QUEUE TABLE WITH SEARCH & FILTER */}
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Job ID (PB-...), Customer Name, or Document Name..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1">Filter:</span>
                    {(['ALL', 'QUEUED', 'PRINTING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          sounds.playPop();
                          setStatusFilter(tab);
                        }}
                        className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 ${
                          statusFilter === tab
                            ? 'bg-[#0095ff] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-1.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center space-x-1.5 shadow-2xs hover:shadow-xs transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* RENDER ORDER TABLE */}
              {renderOrderTable(filteredOrders)}
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: LIVE PRINT QUEUE ----------------- */}
        {activeNav === 'queue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{orders.length}</div>
              </div>
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Ready in Queue</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {orders.filter((o: any) => ['PAID', 'QUEUED'].includes(o.status)).length}
                </div>
              </div>
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Currently Printing</span>
                <div className="text-2xl font-black text-purple-600 mt-1">
                  {orders.filter((o: any) => o.status === 'PRINTING').length}
                </div>
              </div>
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Delivered</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {orders.filter((o: any) => o.status === 'COMPLETED').length}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter queue by Job ID, Customer Name, or Phone..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1">Filter:</span>
                  {(['ALL', 'QUEUED', 'PRINTING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        sounds.playPop();
                        setStatusFilter(tab);
                      }}
                      className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 ${
                        statusFilter === tab
                          ? 'bg-[#0095ff] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-1.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center space-x-1.5 shadow-2xs hover:shadow-xs transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {renderOrderTable(filteredOrders)}
          </div>
        )}

        {/* ----------------- TAB 3: KIOSK FLEET & HARDWARE ----------------- */}
        {activeNav === 'hardware' && (
          <div className="space-y-6">
            {/* Printing Mode Toggle Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dispatch Automation Mode</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    shop?.printMode === 'AUTO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {shop?.printMode === 'AUTO' ? 'Automatic (Direct to Printer)' : 'Manual (Counter Confirmation)'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {shop?.printMode === 'AUTO'
                    ? 'Automated Cloud Spooler Active'
                    : 'Manual Counter Print Mode Active'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  {shop?.printMode === 'AUTO'
                    ? 'New incoming customer paid jobs are automatically routed to your desktop printer immediately with zero clicks.'
                    : 'Customer jobs will wait in the queue until you or your counter staff click "Print Now".'}
                </p>
              </div>

              <button
                onClick={handleToggleShopPrintMode}
                className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm transition active:scale-95 flex items-center space-x-2 ${
                  shop?.printMode === 'AUTO'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-[#0095ff] hover:bg-blue-600 text-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Switch to {shop?.printMode === 'AUTO' ? 'Manual Mode' : 'Automatic Mode'}</span>
              </button>
            </div>

            {/* Desktop Spooler Details Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Background Desktop Spooler Agent</h3>
                    <p className="text-xs text-slate-400">Direct integration for EPSON, HP, Canon, Brother on Windows 10/11</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Native Spooler v1.0.0
                </span>
              </div>

              {/* API Key Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>DEDICATED SPOOLER API KEY</span>
                  <button
                    onClick={() => {
                      sounds.playPop();
                      navigator.clipboard.writeText(shop?.apiKey || '');
                      setCopiedApiKey(true);
                      setTimeout(() => setCopiedApiKey(false), 2500);
                    }}
                    className="text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    {copiedApiKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedApiKey ? 'Copied Key!' : 'Copy Key'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                  {shop?.apiKey || 'No API key generated'}
                </div>
              </div>

              {/* Run Command & Downloads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Quick Start Terminal Command:</span>
                  <div className="p-3 rounded-2xl bg-slate-900 text-purple-300 font-mono text-[11px] overflow-x-auto">
                    <code>node agent/agent.js --key {shop?.apiKey} --server http://localhost:3000 --printer &quot;EPSON L3250 Series&quot;</code>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">1-Click Client Downloads:</span>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/agent/download?shopId=${shop?.id}&format=exe`}
                      download={`PrintBro-Agent-${shop?.slug}.exe`}
                      onClick={() => sounds.playPop()}
                      className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center shadow-xs transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .EXE</span>
                    </a>
                    <a
                      href={`/api/agent/download?shopId=${shop?.id}&format=bat`}
                      download={`PrintBro_${shop?.slug}.bat`}
                      onClick={() => sounds.playPop()}
                      className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs text-center transition flex items-center justify-center gap-2"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Download .BAT</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Hardware Touchpoints */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">Connected Fleet Printers</h3>
                </div>
                <button
                  onClick={handleTestPrint}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Send Diagnostic Test Page</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {printers.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No physical printers registered. Defaulting to system primary Windows spooler.
                  </div>
                ) : (
                  printers.map((printer: any) => (
                    <div key={printer.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                          <span>{printer.name}</span>
                          {printer.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Sizes: {printer.paperSizes || 'A4, Letter'} • {printer.supportsColor ? 'Color + B&W' : 'Monochrome only'}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{printer.status}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: PRICING MATRIX ENGINE (CUSTOM PRICING) ----------------- */}
        {activeNav === 'pricing' && (
          <div className="space-y-6">
            {/* Top Pricing Banner with Live Feedback */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Real-Time Pricing Matrix Engine</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  Set Your Custom Xerox &amp; Print Rates
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
                  Update your per-page prices below. When you click <strong>Save Pricing Matrix</strong>, all changes take effect immediately across your customer upload portal.
                </p>
              </div>

              {pricingSuccess && (
                <div className="px-4 py-2.5 rounded-2xl bg-white text-emerald-700 font-extrabold text-xs flex items-center space-x-2 shadow-lg animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>✓ Updated Live Instantly!</span>
                </div>
              )}
            </div>

            {/* Grid Layout: Pricing Editor Form + Live Price Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: The Editable Pricing Matrix Form */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSavePricing} className="space-y-6">
                  {/* Card 1: Black & White Printing Rates */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                          B&amp;W
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Black &amp; White Printing Rates</h3>
                          <p className="text-[11px] text-slate-400">Standard monochrome document printing</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">₹ / per page</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Single-Sided Rate (1 side / sheet)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={pricingForm.bwSingle}
                            onChange={(e) => setPricingForm({ ...pricingForm, bwSingle: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">e.g. ₹2.00 per single-sided A4 page</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Double-Sided Rate (per printed side)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={pricingForm.bwDuplex}
                            onChange={(e) => setPricingForm({ ...pricingForm, bwDuplex: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          e.g. ₹1.50/side (₹3.00 total for front &amp; back sheet)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Colour Printing Rates */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                          CLR
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Colour Printing Rates</h3>
                          <p className="text-[11px] text-slate-400">High-resolution inkjet or laser full-colour prints</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">₹ / per page</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Colour Single-Sided Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={pricingForm.colorSingle}
                            onChange={(e) => setPricingForm({ ...pricingForm, colorSingle: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">e.g. ₹10.00 per single-sided colour page</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Colour Double-Sided Rate (per printed side)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={pricingForm.colorDuplex}
                            onChange={(e) => setPricingForm({ ...pricingForm, colorDuplex: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          e.g. ₹9.00/side (₹18.00 total for both sides)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Paper Size Multipliers */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Paper Size Multipliers</h3>
                          <p className="text-[11px] text-slate-400">Relative cost compared to standard A4 (1.0x)</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">A3 Multiplier</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={pricingForm.a3Multiplier}
                          onChange={(e) => setPricingForm({ ...pricingForm, a3Multiplier: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Usually 2.0x</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">A5 Multiplier</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={pricingForm.a5Multiplier}
                          onChange={(e) => setPricingForm({ ...pricingForm, a5Multiplier: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Usually 0.8x</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Legal Multiplier</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={pricingForm.legalMultiplier}
                          onChange={(e) => setPricingForm({ ...pricingForm, legalMultiplier: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Usually 1.2x</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Letter Multiplier</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={pricingForm.letterMultiplier}
                          onChange={(e) => setPricingForm({ ...pricingForm, letterMultiplier: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Standard 1.0x</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Store Minimum Floor & Convenience Fee */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                          ₹
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Minimum Order &amp; Convenience Fee</h3>
                          <p className="text-[11px] text-slate-400">Guarantees profitability on micro print jobs (set to 0 for no limits)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setPricingForm({ ...pricingForm, minOrderAmount: 0, serviceFee: 0 });
                        }}
                        className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-xl transition"
                      >
                        Reset Floor &amp; Fee to ₹0
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Minimum Order Amount Floor
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={pricingForm.minOrderAmount}
                            onChange={(e) => setPricingForm({ ...pricingForm, minOrderAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Set to ₹0.00 to disable limit completely</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Handling / Convenience Fee
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={pricingForm.serviceFee || 0}
                            onChange={(e) => setPricingForm({ ...pricingForm, serviceFee: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Added to each order (set to ₹0.00 for free handling)</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button Row */}
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={pricingSaving}
                      className="px-6 py-3 rounded-2xl bg-[#0095ff] hover:bg-blue-600 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{pricingSaving ? 'Updating...' : 'Save Pricing Matrix Live'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right 1 Col: Live Price Simulator & Bill Preview */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5 sticky top-24">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Live Customer Simulator</h3>
                        <p className="text-[11px] text-slate-400">Calculates instantly using rates on left</p>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Controls */}
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Document Page Count</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={simPages}
                        onChange={(e) => setSimPages(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Color Mode</label>
                        <select
                          value={simColor}
                          onChange={(e) => setSimColor(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                        >
                          <option value="BW">Black &amp; White</option>
                          <option value="COLOR">Full Colour</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Sides</label>
                        <select
                          value={simSides}
                          onChange={(e) => setSimSides(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                        >
                          <option value="SINGLE">Single-Sided</option>
                          <option value="DUPLEX">Double-Sided</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Paper Size</label>
                        <select
                          value={simPaper}
                          onChange={(e) => setSimPaper(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                        >
                          <option value="A4">A4 (1.0x)</option>
                          <option value="A3">A3 ({pricingForm.a3Multiplier}x)</option>
                          <option value="A5">A5 ({pricingForm.a5Multiplier}x)</option>
                          <option value="LEGAL">Legal ({pricingForm.legalMultiplier}x)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Imposition (N-Up)</label>
                        <select
                          value={simNUp}
                          onChange={(e) => setSimNUp(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                        >
                          <option value={1}>1-Up (Standard)</option>
                          <option value={2}>2-Up (2 pgs/side)</option>
                          <option value={4}>4-Up (4 pgs/side)</option>
                          <option value={6}>6-Up (6 pgs/side)</option>
                          <option value={9}>9-Up (9 pgs/side)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Simulated Customer Bill */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 space-y-2 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                      Calculated Customer Bill
                    </div>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>Physical Sheets Needed:</span>
                      <strong className="text-slate-900">{simJobBreakdown.printedSheets} sheet(s)</strong>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>Unit Rate Applied:</span>
                      <strong className="text-slate-900">₹{simJobBreakdown.unitRatePerSide.toFixed(2)}/side</strong>
                    </div>
                    {pricingForm.serviceFee ? (
                      <div className="flex items-center justify-between font-semibold text-slate-700">
                        <span>Handling Fee:</span>
                        <strong className="text-slate-900">+₹{pricingForm.serviceFee.toFixed(2)}</strong>
                      </div>
                    ) : null}
                    {simOrderTotal.minOrderFloorApplied && (
                      <div className="text-[10px] text-amber-700 font-bold bg-amber-100/80 p-1.5 rounded-lg">
                        Minimum order floor of ₹{pricingForm.minOrderAmount} applied
                      </div>
                    )}
                    <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-base font-black text-blue-900">
                      <span>Total Customer Pay:</span>
                      <span className="text-xl text-[#0095ff]">₹{simOrderTotal.finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: AUDIT TRAIL & TELEMETRY ----------------- */}
        {activeNav === 'telemetry' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WebSocket Ingestion</span>
                <div className="text-2xl font-black text-emerald-600 flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>100% Operational</span>
                </div>
                <p className="text-[11px] text-slate-400">Zero packet loss to cloud print broker</p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Queue Time</span>
                <div className="text-2xl font-black text-blue-600">
                  ~3.2 sec
                </div>
                <p className="text-[11px] text-slate-400">From customer UPI pay to printer spooling</p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Printer Driver Status</span>
                <div className="text-2xl font-black text-purple-600">
                  Ready (GDI / RAW)
                </div>
                <p className="text-[11px] text-slate-400">SumatraPDF 3.5.2 engine standby</p>
              </div>
            </div>

            {/* Real-Time Event Log */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">Real-Time Operations &amp; Audit Events</h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400">Last 10 Actions</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-mono">
                {orders.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 font-sans">
                    No recent events logged. Activities will stream here live.
                  </div>
                ) : (
                  orders.slice(0, 10).map((order: any, idx: number) => (
                    <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-400 text-[11px]">[{new Date(order.createdAt).toLocaleTimeString()}]</span>
                        <span className="font-bold text-slate-900">{order.jobId}</span>
                        <span className="text-slate-600 font-sans">{order.customerName || 'Walk-in'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right text-slate-500 font-sans">
                        ₹{order.totalAmount?.toFixed(2)} • {order.paymentStatus}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  // Helper component to render the order queue table with all action buttons
  function renderOrderTable(list: any[]) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-black uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">JOB ID &amp; CUSTOMER</th>
                <th className="px-6 py-4">DOCUMENT &amp; SPECS</th>
                <th className="px-6 py-4">AMOUNT &amp; PAYMENT</th>
                <th className="px-6 py-4">PRINT STATUS</th>
                <th className="px-6 py-4">TIME</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No print jobs found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Orders will appear here live when submitted</p>
                  </td>
                </tr>
              ) : (
                list.map((order: any) => {
                  const doc = order.documents?.[0];
                  const job = order.jobs?.[0];
                  const isBw = job?.colorMode === 'BW';
                  const isQueuedOrPaid = ['PAID', 'QUEUED'].includes(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition group">
                      {/* 1. Job ID & Customer */}
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {order.jobId}
                        </div>
                        <div className="text-[11px] text-slate-600 font-bold flex items-center space-x-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{order.customerName || 'Walk-in Customer'}</span>
                        </div>
                        {order.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Document & Specs */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs flex items-center space-x-1.5">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">{doc?.originalFilename || 'Document.pdf'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold uppercase mt-1">
                          <span className={`px-2 py-0.5 rounded-md ${isBw ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                            {isBw ? 'B&W' : 'Colour'}
                          </span>
                          <span>•</span>
                          <span>{job?.sides === 'DUPLEX' ? 'Double-Sided' : 'Single-Sided'}</span>
                          <span>•</span>
                          <span>{job?.nUp || 1}-up</span>
                          <span>•</span>
                          <span>{job?.copies || 1} copy</span>
                        </div>
                      </td>

                      {/* 3. Amount & Payment */}
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 text-base">
                          ₹{order.totalAmount?.toFixed(2)}
                        </div>
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* 4. Print Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'PRINTING'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : order.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === 'COMPLETED' ? 'bg-emerald-500' : order.status === 'PRINTING' ? 'bg-purple-500 animate-spin' : 'bg-blue-500 animate-pulse'
                          }`}></span>
                          <span>{order.status}</span>
                        </span>
                      </td>

                      {/* 5. Exact Timeline */}
                      <td className="px-6 py-4 text-slate-500">
                        <div className="font-bold text-slate-800 text-xs">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </td>

                      {/* 6. Restored Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* PRINT NOW: Available for PAID or QUEUED orders */}
                          {isQueuedOrPaid && (
                            <button
                              onClick={() => handlePrintNow(order)}
                              disabled={actionLoading === order.id}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs hover:shadow-sm transition inline-flex items-center space-x-1.5 active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Print Now</span>
                            </button>
                          )}

                          {/* MARK PRINTING: If in QUEUED state */}
                          {order.status === 'QUEUED' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'PRINTING')}
                              disabled={actionLoading === order.id}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95"
                            >
                              <span>Mark Printing</span>
                            </button>
                          )}

                          {/* MARK DONE: If currently in PRINTING state */}
                          {order.status === 'PRINTING' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                              disabled={actionLoading === order.id}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition inline-flex items-center space-x-1.5 active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Done</span>
                            </button>
                          )}

                          {/* REPRINT: If already COMPLETED */}
                          {order.status === 'COMPLETED' && (
                            <button
                              onClick={() => handlePrintNow(order)}
                              disabled={actionLoading === order.id}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center space-x-1.5 active:scale-95 shadow-2xs cursor-pointer"
                              title="Reprint document"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                              <span>Reprint</span>
                            </button>
                          )}

                          {/* VIEW PRINT FILE: Open exact spooled/merged PDF */}
                          {order.status === 'COMPLETED' && (
                            <a
                              href={`/spooler-output/order_${order.jobId}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition inline-flex items-center space-x-1.5 active:scale-95 border border-blue-200/80 shadow-2xs"
                              title="View exact generated/spooled print file in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Printout</span>
                            </a>
                          )}

                          {/* CANCEL: If not completed or cancelled */}
                          {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(order.status) && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                              disabled={actionLoading === order.id}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Cancel order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default function ShopOwnerDashboard() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600">Loading Kiosk POS Dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}

