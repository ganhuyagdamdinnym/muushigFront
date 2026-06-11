"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonDemo } from "./components/ui/button";
import { HomePageHeader } from "./pages/components/HomePageHeader";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Хэрэглэгч нэвтэрсэн эсэхийг localStorage-оос шалгах
    const userId = localStorage.getItem("user_id");
    // Эсвэл өмнөх алхам дээр хадгалсан бол: localStorage.getItem("username")

    if (!userId) {
      // Хэрэв нэвтрээгүй бол шууд login хуудас руу шилжүүлнэ
      router.push("/pages/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Шалгаж дуусах хүртэл хоосон цагаан эсвэл loading харуулна (Гялс хийж харагдахаас сэргийлнэ)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Уншиж байна...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 font-sans antialiased select-none">
      <HomePageHeader />

      <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-sm w-full mx-4">
        <h1 className="text-xl font-bold text-white mb-2">Муушиг</h1>
        <p className="text-xs text-slate-400 mb-6">
          Шинэ өрөө үүсгэж тоглоомыг эхлүүлнэ үү.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-center w-full">
            <ButtonDemo />
          </div>
          <button className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 hover:text-white font-medium text-sm rounded-xl transition-colors border border-slate-700/50">
            Хүмүүстэй тоглох
          </button>
        </div>
      </div>
    </div>
  );
}
