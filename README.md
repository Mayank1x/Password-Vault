# 🔐 Password Vault — Secure Encrypted Password Manager

A modern, secure, and minimal **Password Vault** built with **Next.js, MongoDB, and NextAuth**, featuring **Two-Factor Authentication (2FA)** with Google Authenticator, **encrypted password storage**, and a **built-in password generator**.

🌐 **Live Demo:** [https://password-vault-k9uv.onrender.com](https://password-vault-k9uv.onrender.com)

---

## 🚀 Features

- 🔑 **User Authentication** using **NextAuth (Credentials Provider)**
- 🔐 **Two-Factor Authentication (2FA)** with Google Authenticator (TOTP)
- 🧠 **Encrypted Password Vault** to store credentials securely
- ⚙️ **Password Generator** with strength meter
- 📤 **Import/Export** encrypted vault data
- 🧭 **Modern UI** built with Tailwind CSS & Lucide Icons
- ☁️ **MongoDB Atlas** for secure, scalable storage
- 🚀 **Deployed on Render (Free Tier)**

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js (App Router), Tailwind CSS |
| **Backend** | Next.js API Routes, MongoDB |
| **Auth** | NextAuth (Credentials) + bcrypt |
| **2FA** | Speakeasy + QRCode |
| **Database** | MongoDB Atlas |
| **Deployment** | Render.com |

---

## ⚙️ Getting Started (Local Setup)

```bash
#  Clone the repository
git clone https://github.com/yourusername/password-vault.git
cd password-vault

#  Install dependencies
npm install

#  Create environment variables
echo "MONGODB_URI=your_mongodb_connection_string" >> .env.local
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
echo "NEXTAUTH_URL=http://localhost:3000" >> .env.local

# 🚀 Run the development server
npm run dev
```

After running the above commands, open your browser and visit:
👉 http://localhost:3000
 to see the app running locally.
