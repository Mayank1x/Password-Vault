"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Shield, Copy, RefreshCw, Eye, EyeOff, Edit2, Trash2,
  ExternalLink, Check, Search, Download, Upload, LogOut, Lock, X
} from "lucide-react";

interface VaultItem {
  _id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

export default function VaultPageClient() {
  const { data: session } = useSession();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [form, setForm] = useState({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorOpts, setGeneratorOpts] = useState<GeneratorOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: true,
  });

  const [qr, setQr] = useState<string | null>(null);
  const [token, setToken] = useState("");

  // Encryption (simple for demo)
  const encrypt = (text: string): string => btoa(text);
  const decrypt = (text: string): string => {
    try {
      return atob(text);
    } catch {
      return text;
    }
  };

  // Fetch vault items
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const decrypted = data.map((i: VaultItem) => ({
        ...i,
        password: decrypt(i.password || ""),
      }));
      setItems(decrypted);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchItems(); }, []);

  // Add/edit item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const encryptedPass = encrypt(form.password || "");
      if (editId) {
        await fetch(`/api/vault/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, password: encryptedPass }),
        });
        setEditId(null);
      } else {
        await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            password: encryptedPass,
            userId: session?.user?.email || "user-session",
          }),
        });
      }
      setForm({ title: "", username: "", password: "", url: "", notes: "" });
      setShowFormPassword(false);
      setShowGenerator(false);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  // Password generation
  const generatePassword = () => {
    const similar = /[Il1O0]/g;
    let chars = "";
    if (generatorOpts.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (generatorOpts.lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (generatorOpts.numbers) chars += "0123456789";
    if (generatorOpts.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>/?";
    if (!chars) return alert("Select at least one character type");
    let pool = generatorOpts.excludeSimilar ? chars.replace(similar, "") : chars;
    const pwd = Array.from({ length: generatorOpts.length }, () =>
      pool[Math.floor(Math.random() * pool.length)]
    ).join("");
    setForm({ ...form, password: pwd });
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" };
    if (score <= 6) return { score, label: "Good", color: "bg-blue-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const copyToClipboard = async (pwd: string, id: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Failed to copy");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const editItem = (item: VaultItem) => {
    setEditId(item._id);
    setForm(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Import/export
  const exportVault = () => {
    const encryptedData = encrypt(JSON.stringify(items));
    const blob = new Blob([encryptedData], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vault_backup.enc.json";
    a.click();
  };

  const importVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const decryptedData = JSON.parse(decrypt(text));
      for (const item of decryptedData) {
        await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item,
            password: encrypt(item.password),
            userId: session?.user?.email || "user-session",
          }),
        });
      }
      fetchItems();
    } catch {
      alert("Failed to import (invalid or corrupted)");
    }
    e.target.value = "";
  };

  // 2FA
  const enable2FA = async () => {
    const res = await fetch("/api/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session?.user?.email || "user-session" }),
    });
    const data = await res.json();
    if (data.qrCode) setQr(data.qrCode);
  };

  const verify2FA = async () => {
    const res = await fetch("/api/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session?.user?.email, token }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("✅ 2FA verified!");
      setToken("");
      setQr(null);
    }
  };

  const filtered = items.filter((i) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      i.title.toLowerCase().includes(q) ||
      i.username.toLowerCase().includes(q)
    );
  });

  const strength = form.password ? calculatePasswordStrength(form.password) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
              <Shield className="text-white" size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Password Vault</h1>
              <p className="text-slate-400 text-sm mt-1">
                Secure encrypted storage
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300 text-sm px-3">
              {session?.user?.email}
            </span>
            <div className="relative flex-1 lg:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vault..."
                className="w-full lg:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button onClick={exportVault} disabled={!items.length}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-slate-700 transition">
              <Download size={18} /> Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 cursor-pointer transition">
              <Upload size={18} /> Import
              <input type="file" accept=".json" onChange={importVault} className="hidden" />
            </label>
            <button onClick={enable2FA}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              <Lock size={18} /> 2FA
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </header>

        {/* 2FA QR Modal */}
        {qr && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full text-center">
              <button onClick={() => setQr(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h2>
              <p className="text-slate-400 text-sm mb-6">Scan this QR code with your authenticator app and enter the 6-digit code:</p>
              <div className="bg-white p-4 rounded-xl mb-6 inline-block">
                <img src={qr} alt="QR Code" className="w-48 h-48" />
              </div>
              <input
                placeholder="Enter 6-digit code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="p-3 rounded-xl bg-slate-700 text-center w-full mb-4 text-white text-lg font-mono border border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={verify2FA}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-semibold w-full text-white shadow-lg transition">
                Verify Code
              </button>
            </div>
          </div>
        )}


        {/* Add/Edit Form */}
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">{editId ? "Edit Item" : "Add New Item"}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
              <input
                placeholder="e.g., Gmail Account"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username / Email</label>
              <input
                placeholder="user@example.com"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Password Generator */}
          {showGenerator && (
            <div className="mb-4 p-5 bg-slate-700 rounded-xl border border-slate-600 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Password Length: {generatorOpts.length}</span>
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <input
                type="range"
                min={6}
                max={32}
                value={generatorOpts.length}
                onChange={(e) => setGeneratorOpts({ ...generatorOpts, length: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { key: "uppercase", label: "Uppercase (A-Z)" },
                  { key: "lowercase", label: "Lowercase (a-z)" },
                  { key: "numbers", label: "Numbers (0-9)" },
                  { key: "symbols", label: "Symbols (!@#$)" },
                  { key: "excludeSimilar", label: "Exclude Similar" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(generatorOpts as any)[key]}
                      onChange={() => setGeneratorOpts({ ...generatorOpts, [key]: !(generatorOpts as any)[key] })}
                      className="w-4 h-4 accent-blue-500 rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={generatePassword}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Generate Password
              </button>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showFormPassword ? "text" : "password"}
                  placeholder="Enter or generate password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-3 pr-10 rounded-xl bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showFormPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {strength && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${(strength.score / 7) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-300 min-w-[60px]">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Website URL</label>
            <input
              placeholder="https://example.com"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
            <textarea
              placeholder="Additional information..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-semibold shadow-lg hover:shadow-xl"
            >
              {editId ? "Update Item" : "Add to Vault"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm({ title: "", username: "", password: "", url: "", notes: "" });
                  setShowFormPassword(false);
                  setShowGenerator(false);
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Vault Items */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Your Vault ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-full mb-4">
              <Shield className="text-slate-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {search ? "No items found" : "Your vault is empty"}
            </h3>
            <p className="text-slate-400">
              {search ? "Try a different search term" : "Add your first password to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-slate-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white truncate">{item.title}</h3>
                    {item.username && <p className="text-sm text-slate-400 truncate mt-1">{item.username}</p>}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                      title="Open website"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 bg-slate-700 rounded-xl border border-slate-600 overflow-hidden">
                      <span className="text-sm font-mono text-slate-300">
                        {visiblePasswords[item._id] ? item.password : "••••••••••••"}
                      </span>
                    </div>
                    <button
                      onClick={() => setVisiblePasswords((p) => ({ ...p, [item._id]: !p[item._id] }))}
                      className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
                      title={visiblePasswords[item._id] ? "Hide" : "Show"}
                    >
                      {visiblePasswords[item._id] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(item.password, item._id)}
                      className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-xl transition"
                      title="Copy"
                    >
                      {copiedId === item._id ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>

                  {item.notes && (
                    <p className="text-sm text-slate-400 bg-slate-700 rounded-xl p-3 border border-slate-600">
                      {item.notes}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => editItem(item)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item._id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
