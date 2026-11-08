'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  PlusCircle, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  ExternalLink, 
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Save,
  Lock
} from 'lucide-react';

export default function SuperAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit credentials modal state
  const [editingShop, setEditingShop] = useState<any>(null);
  const [credForm, setCredForm] = useState({
    ownerEmail: '',
    password: '',
    ownerName: '',
  });
  const [credSaving, setCredSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // New shop form state
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    gstNumber: '',
    commissionRate: 5,
    commissionType: 'PERCENT',
    printMode: 'MANUAL',
    password: 'PASS@123',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shops');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to create shop: ${err.error}`);
        return;
      }
      setShowAddModal(false);
      setForm({
        name: '',
        slug: '',
        ownerName: '',
        email: '',
        mobile: '',
        address: '',
        city: '',
        state: '',
        pinCode: '',
        gstNumber: '',
        commissionRate: 5,
        commissionType: 'PERCENT',
        printMode: 'MANUAL',
        password: 'PASS@123',
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error creating shop.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shop: any) => {
    const newStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePrintMode = async (shop: any) => {
    const newMode = shop.printMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
    try {
      await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printMode: newMode }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!confirm(`Are you sure you want to permanently delete shop "${shopName}"? All its orders, documents and printers will be removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/shops?shopId=${shopId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to delete shop: ${err.error}`);
        return;
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error deleting shop.');
    }
  };

  const openCredentialsModal = (shop: any) => {
    const ownerUser = shop.users?.find((u: any) => u.role === 'SHOP_OWNER') || shop.users?.[0];
    setEditingShop(shop);
    setCredForm({
      ownerEmail: ownerUser?.email || shop.email || '',
      password: ownerUser?.password || 'PASS@123',
      ownerName: ownerUser?.name || shop.ownerName || '',
    });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    try {
      setCredSaving(true);
      const res = await fetch(`/api/admin/shops/${editingShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: credForm.ownerEmail,
          password: credForm.password,
          ownerName: credForm.ownerName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to update credentials: ${err.error}`);
        return;
      }

      setEditingShop(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error updating shop credentials.');
    } finally {
      setCredSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (shopId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [shopId]: !prev[shopId]
    }));
  };

  const metrics = data?.metrics;
  const shops = data?.shops || [];

  const filteredShops = shops.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    (s.users?.[0]?.email && s.users[0].email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Platform Overview & Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor real-time revenue, manage tenant Xerox shops, and set owner login passwords.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition flex items-center space-x-2 shadow-lg shadow-purple-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard New Shop</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shops</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">{metrics?.totalShops ?? '--'}</span>
            <span className="ml-2 text-xs font-semibold text-emerald-400">
              {metrics?.activeShops ?? 0} active
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross GMV</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">₹{metrics?.totalCustomerPayments ?? '0'}</span>
            <span className="ml-2 text-xs font-medium text-slate-400">total orders</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Commission</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-blue-400">₹{metrics?.totalPlatformRevenue ?? '0'}</span>
            <span className="ml-2 text-xs font-medium text-slate-400">Print Bro profit</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Settlements</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-amber-400">₹{metrics?.pendingSettlements ?? '0'}</span>
            <span className="ml-2 text-xs font-medium text-slate-400">payable to shops</span>
          </div>
        </div>
      </div>

      {/* Shop Directory Section */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Registered Xerox Shops & Logins</h2>
            <p className="text-xs text-slate-400">
              Each shop owner logs into <span className="text-purple-400 font-mono">/login</span> using credentials decided by Admin.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, slug or login email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Shops Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
              <tr>
                <th className="px-5 py-4">Shop Details</th>
                <th className="px-5 py-4">Owner Login & Password</th>
                <th className="px-5 py-4">Tenant URL & Spooler</th>
                <th className="px-5 py-4">Mode</th>
                <th className="px-5 py-4">Commission</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No shops found matching your search.
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop: any) => {
                  const ownerUser = shop.users?.find((u: any) => u.role === 'SHOP_OWNER') || shop.users?.[0];
                  const email = ownerUser?.email || shop.email;
                  const password = ownerUser?.password || 'PASS@123';
                  const isPassVisible = !!visiblePasswords[shop.id];

                  return (
                    <tr key={shop.id} className="hover:bg-slate-700/20 transition">
                      {/* Shop Name & Details */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-base">{shop.name}</div>
                        <div className="text-xs text-slate-400">{shop.ownerName} • {shop.city}, {shop.state}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{shop.mobile}</div>
                      </td>

                      {/* Owner Login & Password (Decided by Admin) */}
                      <td className="px-5 py-4">
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 space-y-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Login ID</span>
                            <button
                              onClick={() => copyToClipboard(email, `email-${shop.id}`)}
                              className="text-slate-400 hover:text-white transition"
                              title="Copy Email"
                            >
                              {copiedKey === `email-${shop.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="font-mono text-xs text-white truncate max-w-[190px]">
                            {email}
                          </div>

                          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Password</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => togglePasswordVisibility(shop.id)}
                                className="text-slate-400 hover:text-white p-0.5"
                                title={isPassVisible ? 'Hide Password' : 'Show Password'}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(password, `pass-${shop.id}`)}
                                className="text-slate-400 hover:text-white p-0.5"
                                title="Copy Password"
                              >
                                {copiedKey === `pass-${shop.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="font-mono text-xs text-amber-300 font-semibold flex items-center justify-between">
                            <span>{isPassVisible ? password : '••••••••'}</span>
                            <button
                              onClick={() => openCredentialsModal(shop)}
                              className="text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Tenant URL & Spooler */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-purple-300">
                            <span>/shop/{shop.slug}</span>
                            <Link
                              href={`/shop/${shop.slug}`}
                              target="_blank"
                              className="hover:text-white"
                              title="Open Customer Portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          {shop.apiKey && (
                            <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
                              <span className="text-slate-500">Key:</span>
                              <span className="truncate max-w-[100px]">{shop.apiKey.substring(0, 10)}...</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(shop.apiKey);
                                  alert(`Copied API Key for ${shop.name}!\n\nTo run the Print Agent:\nnode agent/agent.js --key ${shop.apiKey} --server http://localhost:3000 --printer "EPSON L3250 Series"`);
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 px-1 py-0.5 rounded hover:bg-slate-700"
                                title="Copy API key for Print Agent"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Print Mode */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleTogglePrintMode(shop)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            shop.printMode === 'AUTO'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                          }`}
                          title="Click to toggle Manual / Auto printing"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{shop.printMode === 'AUTO' ? 'Automatic' : 'Manual'}</span>
                        </button>
                      </td>

                      {/* Commission */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-white">{shop.commissionRate}%</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleStatus(shop)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                            shop.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {shop.status === 'ACTIVE' ? (
                            <><CheckCircle2 className="w-3 h-3" /> <span>Active</span></>
                          ) : (
                            <><XCircle className="w-3 h-3" /> <span>Inactive</span></>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right space-x-2">
                        <Link
                          href={`/dashboard?shopId=${shop.id}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition inline-flex items-center space-x-1"
                        >
                          <span>Shop POS</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteShop(shop.id, shop.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition inline-flex items-center"
                          title="Delete Shop"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Shop Credentials Modal */}
      {editingShop && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl shadow-purple-500/10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Manage Login Credentials</h3>
                  <p className="text-xs text-slate-400">{editingShop.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingShop(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Owner Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  value={credForm.ownerEmail}
                  onChange={(e) => setCredForm({ ...credForm, ownerEmail: e.target.value })}
                  placeholder="e.g. owner@ganeshxerox.com"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password (Decided by Admin) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCredForm({ ...credForm, password: 'PASS@123' })}
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Set to PASS@123
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={credForm.password}
                  onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The shopkeeper will enter this email and password on <span className="text-purple-400 font-mono">/login</span> to access their isolated dashboard.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={credForm.ownerName}
                  onChange={(e) => setCredForm({ ...credForm, ownerName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={credSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{credSaving ? 'Updating...' : 'Save Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard New Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Onboard New Xerox Shop</h3>
                <p className="text-xs text-slate-400 mt-0.5">Creates dedicated tenant URL and shopkeeper login credentials.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Digital Print Hub"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setForm({ ...form, name, slug });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dedicated URL Slug *</label>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-400">
                    <span className="text-xs">/shop/</span>
                    <input
                      type="text"
                      required
                      placeholder="apex-digital-print"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full bg-transparent text-white focus:outline-none ml-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Shopkeeper Login Credentials Box (Decided by Admin) */}
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
                <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Shop Login Credentials (Decided by Admin)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@apexprint.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">Shop Password *</label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, password: 'PASS@123' })}
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                      >
                        Default PASS@123
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Sen"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 45, Near University North Gate"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bangalore"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Karnataka"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="560001"
                    value={form.pinCode}
                    onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Platform Commission (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Printing Mode</label>
                  <select
                    value={form.printMode}
                    onChange={(e) => setForm({ ...form, printMode: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="MANUAL">Manual Mode (Counter click)</option>
                    <option value="AUTO">Automatic Mode (Direct to printer)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
