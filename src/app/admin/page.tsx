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
  AlertTriangle
} from 'lucide-react';

export default function SuperAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    password: 'shop123',
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
        password: 'shop123',
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

  const metrics = data?.metrics;
  const shops = data?.shops || [];

  const filteredShops = shops.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
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
            Monitor real-time revenue, manage tenant Xerox shops, and review print automation.
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
            <h2 className="text-lg font-bold text-white">Registered Xerox Shops</h2>
            <p className="text-xs text-slate-400">Every shop has a dedicated tenant URL and isolated order spooler.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, slug or city..."
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
                <th className="px-6 py-4">Shop Details</th>
                <th className="px-6 py-4">Dedicated Tenant URL</th>
                <th className="px-6 py-4">Printing Mode</th>
                <th className="px-6 py-4">Commission</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No shops found matching your search.
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop: any) => (
                  <tr key={shop.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{shop.name}</div>
                      <div className="text-xs text-slate-400">{shop.ownerName} • {shop.city}, {shop.state}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{shop.mobile} • {shop.email}</div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
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
                        <span>{shop.printMode === 'AUTO' ? 'Automatic (Daemon)' : 'Manual (Counter)'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{shop.commissionRate}%</span>
                      <span className="text-xs text-slate-400 ml-1">platform</span>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard`}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white transition inline-flex items-center space-x-1"
                      >
                        <span>Shop POS</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard New Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Onboard New Xerox Shop</h3>
                <p className="text-xs text-slate-400 mt-0.5">Generates a dedicated shop URL and shopkeeper login credentials.</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Email (Login) *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@apexprint.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Password *</label>
                  <input
                    type="text"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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

