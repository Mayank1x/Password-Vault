import CryptoJS from "crypto-js";

// You’ll later derive a user-specific key from a master password
const SECRET_KEY = "client-side-encryption-key";

export function encrypt(text: string) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decrypt(cipher: string) {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
