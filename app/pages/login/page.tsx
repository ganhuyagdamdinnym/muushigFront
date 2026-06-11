"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";


type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const router = useRouter();

  // Form-ын state-үүд
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("⚠️ Бүх талбарыг бөглөнө үү.");
      return;
    }

    if (mode === "signup") {
      if (!email) {
        setError("⚠️ И-мэйл хаяг оруулна үү.");
        return;
      }
      if (password !== confirmPassword) {
        setError("⚠️ Нууц үг зөрж байна!");
        return;
      }

      setLoading(true);
      try {
        // Backend рүү хүсэлт илгээх хэсэг
        const response = await fetch("http://127.0.0.1:8000/user/create_user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Хэрэв серверээс алдаа ирвэл (Жишээ нь: Нэр давхцсан)
          throw new Error(data.detail || "Бүртгэл амжилтгүй боллоо.");
        }

        alert("Амжилттай бүртгүүллээ! Одоо нэвтэрч орно уу.");
        switchMode("signin");
      } catch (err: any) {
        setError(`⚠️ ${err.message || "Сервертэй холбогдоход алдаа гарлаа."}`);
      } finally {
        setLoading(false);
      }
    } else {
      // НЭВТРЭХ ЛОГИК (FastAPI-тай холбогдох)
      setLoading(true);
      try {
        const response = await fetch("http://127.0.0.1:8000/user/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Нэвтрэхэд алдаа гарлаа.");
        }

        // 1. Серверээс ирсэн user_id-г хадгалах (Таны Home хуудас үүнийг шалгаж байгаа)
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", username.trim());

        // 2. Шууд Нүүр хуудас руу шилжүүлэх
        router.push("/");
      } catch (err: any) {
        setError(`⚠️ ${err.message || "Сервертэй холбогдож чадсангүй."}`);
      } finally {
        setLoading(false);
      }
    }
  };
  const handleLogin = () => {
    if (mode == "signin") {
      console.log("hello");
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 antialiased select-none font-sans">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mx-4">
        {/* Лого хэсэг */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 bg-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-sm">
            🃏
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Муушиг Онлайн
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "signin"
              ? "Тоглоомд нэвтэрч орно уу"
              : "Шинэ тоглогчийн бүртгэл үүсгэх"}
          </p>
        </div>

        {/* Сэлгэх Tab */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 mb-6">
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "signin"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            } disabled:opacity-50`}
          >
            Нэвтрэх
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "signup"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            } disabled:opacity-50`}
          >
            Бүртгүүлэх
          </button>
        </div>

        {/* Алдааны мэдээлэл */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Форм */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Тоглогчийн нэр
            </label>
            <input
              type="text"
              value={username}
              disabled={loading}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-sm text-white outline-none font-medium transition-colors disabled:opacity-50"
              placeholder="Нэрээ оруулна уу"
              required
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                И-мэйл хаяг
              </label>
              <input
                type="email"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-sm text-white outline-none font-medium transition-colors disabled:opacity-50"
                placeholder="example@mail.com"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Нууц үг
            </label>
            <input
              type="password"
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-sm text-white outline-none font-medium transition-colors disabled:opacity-50"
              placeholder="••••••••"
              required
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Нууц үг давтах
              </label>
              <input
                type="password"
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-sm text-white outline-none font-medium transition-colors disabled:opacity-50"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onClick={handleLogin}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading
              ? "Уншиж байна..."
              : mode === "signin"
                ? "Нэвтрэх"
                : "Бүртгэл үүсгэх"}
          </button>
        </form>

        {/* Доод холбоос */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {mode === "signin" ? (
            <p>
              Бүртгэлгүй юу?{" "}
              <span
                onClick={() => !loading && switchMode("signup")}
                className={`text-emerald-500 hover:text-emerald-400 cursor-pointer font-medium ${loading ? "pointer-events-none opacity-50" : ""}`}
              >
                Шинээр бүртгүүлэх
              </span>
            </p>
          ) : (
            <p>
              Акаунт байгаа юу?{" "}
              <span
                onClick={() => !loading && switchMode("signin")}
                className={`text-emerald-500 hover:text-emerald-400 cursor-pointer font-medium ${loading ? "pointer-events-none opacity-50" : ""}`}
              >
                Нэвтрэх хэсэг рүү очих
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
