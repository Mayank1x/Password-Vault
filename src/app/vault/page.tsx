"use client";

import { useState, useEffect } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession, signIn, signOut } from "next-auth/react";

export default function VaultPage() {
  const { data: session, status } = useSession();

  const [items, setItems] = useState<any[]>([]);
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

  // password generator options
  const [generatorOpts, setGeneratorOpts] = useState({
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
  });

  const [qr, setQr] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const decrypted = data.map((i: any) => ({
        ...i,
        password: decrypt(i.password || ""),
      }));
      setItems(decrypted);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load vault");
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchItems();
  }, [status]);

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
        toast.success("✅ Item updated");
        setEditId(null);
      } else {
        await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            password: encryptedPass,
            userId: session?.user?.email || "unknown-user",
          }),
        });
        toast.success("✅ Item added");
      }
      setForm({ title: "", username: "", password: "", url: "", notes: "" });
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item");
    }
  };

  const generatePassword = () => {
    const similar = /[Il1O0]/g;
    let chars = "";
    if (generatorOpts.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (generatorOpts.lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (generatorOpts.numbers) chars += "0123456789";
    if (generatorOpts.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>/?";
    if (!chars) {
      toast.error("Select at least one character type");
      return;
    }
    let pool = chars;
    if (generatorOpts.excludeSimilar) pool = pool.replace(similar, "");
    const pwd = Array.from({ length: generatorOpts.length }, () =>
      pool[Math.floor(Math.random() * pool.length)]
    ).join("");
    setForm({ ...form, password: pwd });
    toast.success("🔐 Password generated");
  };

  const copyToClipboard = async (pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      toast.success("📋 Password copied!");
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
          toast("🧹 Clipboard cleared");
        } catch {}
      }, 10000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await fetch(`/api/vault/${id}`, { method: "DELETE" });
      toast.success("🗑 Item deleted");
      fetchItems();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const editItem = (item: any) => {
    setEditId(item._id);
    setForm({
      title: item.title || "",
      username: item.username || "",
      password: item.password || "",
      url: item.url || "",
      notes: item.notes || "",
    });
    setVisiblePasswords((p) => ({ ...p, [item._id]: true }));
  };

  const exportVault = () => {
    const encryptedData = encrypt(JSON.stringify(items));
    const blob = new Blob([encryptedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vault_backup.enc.json";
    a.click();
    toast.success("📦 Encrypted vault exported!");
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
            userId: session?.user?.email || "unknown-user",
          }),
        });
      }
      toast.success("✅ Imported vault successfully!");
      fetchItems();
    } catch {
      toast.error("❌ Failed to import file (invalid or corrupted)");
    }
  };

  const enable2FA = async () => {
    const res = await fetch("/api/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session?.user?.email }),
    });
    const data = await res.json();
    if (data.qrCode) {
      setQr(data.qrCode);
      setTwoFAEnabled(true);
      toast.success("📱 Scan this QR in Google Authenticator!");
    }
  };

  const verify2FA = async () => {
    const res = await fetch("/api/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session?.user?.email, token }),
    });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else {
      toast.success("✅ 2FA verified!");
      setToken("");
      setQr(null);
    }
  };

  if (status === "loading") return <div className="text-center mt-20 text-xl">Loading...</div>;
  if (!session) return null;

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-purple-400">🔐 Password Vault</h1>
          <p className="text-sm text-gray-400 mt-1">{session?.user?.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={exportVault} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-semibold">📤 Export</button>
          <label className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm font-semibold cursor-pointer">
            📥 Import
            <input type="file" accept=".json" onChange={importVault} className="hidden" />
          </label>
          <button onClick={enable2FA} className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded text-sm font-semibold">🔑 Enable 2FA</button>
          <button onClick={() => signOut()} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-semibold">Logout</button>
        </div>
      </div>

      {/* 2FA QR */}
      {qr && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6 max-w-md">
          <h2 className="text-lg font-semibold text-purple-400 mb-2">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-400 mb-4">Scan this QR and enter the 6-digit code:</p>
          <img src={qr} alt="QR Code" className="mx-auto mb-4 w-40 h-40 rounded" />
          <input
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="p-2 rounded bg-gray-700 text-center w-full mb-3"
          />
          <button onClick={verify2FA} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold w-full">Verify Code</button>
        </div>
      )}

      {/* form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl space-y-4 shadow-lg max-w-3xl mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="p-2 rounded bg-gray-700" required />
          <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="p-2 rounded bg-gray-700" />
        </div>

        {/* generator controls */}
        <div className="bg-gray-700 p-4 rounded-lg space-y-3">
          <label className="flex items-center justify-between">
            <span>Password length: {generatorOpts.length}</span>
            <input type="range" min={6} max={32} value={generatorOpts.length} onChange={(e) => setGeneratorOpts({ ...generatorOpts, length: Number(e.target.value) })} />
          </label>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {["uppercase", "lowercase", "numbers", "symbols", "excludeSimilar"].map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(generatorOpts as any)[opt]}
                  onChange={() => setGeneratorOpts({ ...generatorOpts, [opt]: !(generatorOpts as any)[opt] })}
                />
                {opt === "excludeSimilar" ? "Exclude look-alike chars" : `Include ${opt}`}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="p-2 rounded bg-gray-700 flex-grow" required />
          <button type="button" onClick={generatePassword} className="bg-purple-600 p-2 rounded hover:bg-purple-700">
            <RefreshCw size={18} />
          </button>
        </div>

        <input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="p-2 rounded bg-gray-700 w-full" />
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="p-2 rounded bg-gray-700 w-full" rows={3} />

        <div className="flex gap-2">
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded font-semibold">
            {editId ? "✏️ Update Item" : "➕ Add to Vault"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ title: "", username: "", password: "", url: "", notes: "" }); }} className="bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* items list */}
      <div className="mt-8 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.length === 0 && <div className="text-gray-400 p-4">No items found</div>}
          {filtered.map((item) => (
            <div key={item._id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center shadow">
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <div className="text-xs text-gray-400">{item.url}</div>
                </div>
                <p className="text-sm text-gray-300">{item.username}</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-gray-400 text-sm">
                    {visiblePasswords[item._id] ? item.password : "••••••••••"}
                  </p>
                  <button onClick={() => setVisiblePasswords((p) => ({ ...p, [item._id]: !p[item._id] }))} className="text-xs text-purple-300 hover:underline">
                    {visiblePasswords[item._id] ? "Hide" : "Show"}
                  </button>
                </div>
                {item.notes && <p className="mt-2 text-sm text-gray-400">{item.notes}</p>}
              </div>
              <div className="mt-3 sm:mt-0 flex items-center gap-2">
                <button onClick={() => copyToClipboard(item.password)} className="bg-gray-700 p-2 rounded hover:bg-gray-600">
                  <Copy size={18} />
                </button>
                <button onClick={() => editItem(item)} className="bg-blue-600 p-2 rounded hover:bg-blue-700">✏️</button>
                <button onClick={() => deleteItem(item._id)} className="bg-red-600 p-2 rounded hover:bg-red-700">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
