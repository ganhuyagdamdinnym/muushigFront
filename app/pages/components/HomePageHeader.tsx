"use client";

import React, { useState, useEffect } from "react";
import { SideBar } from "./SideBar";

export const HomePageHeader = () => {
  const [sideBarOpen, setSidebarOpen] = useState(false);

  // Анхны утга (Бэкэндээс өгөгдөл иртэл харагдана)
  const [user, setUser] = useState({
    id: "b8d1da9e-9a87-4e8c-a3d1-6011d77b6872", // Жишээ ID
    username: "Уншиж байна...",
    rating: 1200,
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Tomoroo",
  });

  // Нэр өөрчлөх функц
  const handleUsernameChange = (newName: string) => {
    setUser((prev) => ({ ...prev, username: newName }));
  };

  // Бэкэндээс хэрэглэгчийн мэдээлэл татах
  const fetchName = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/user/${user.id}`);
      if (!response.ok) {
        throw new Error("Сүлжээний алдаа гарлаа");
      }

      const data = await response.json(); // .json() ашиглана!

      if (data && data.name) {
        setUser((prev) => ({
          ...prev,
          username: data.name,
          rating: data.rating || prev.rating, // Хэрэв бэкэндээс rating ирвэл шинэчилнэ
        }));
      }
    } catch (error) {
      console.error("Хэрэглэгчийн мэдээллийг татахад алдаа гарлаа:", error);
    }
  };

  useEffect(() => {
    fetchName();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-50 select-none">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          МУУШИГ
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-semibold tracking-widest">
          v2.0/MUUUUUUUUshiiiiig
        </span>
      </div>

      {sideBarOpen && (
        <SideBar
          currentUsername={user.username}
          onUsernameChange={handleUsernameChange}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      <div
        onClick={() => setSidebarOpen(true)}
        className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 py-1.5 pl-3 pr-2 rounded-full border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group"
      >
        <div className="flex flex-col items-end justify-center">
          <span className="text-sm font-medium text-slate-200 group-hover:text-white leading-none mb-1 transition-colors">
            {user.username}
          </span>
          <span className="text-[11px] text-emerald-400 font-mono leading-none">
            Rating: {user.rating}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
          <img
            src={user.avatarUrl}
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
