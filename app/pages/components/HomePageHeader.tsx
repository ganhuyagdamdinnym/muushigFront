"use client";

import React, { useState, useEffect } from "react";
import { SideBar } from "./SideBar";

export const HomePageHeader = () => {
  const [sideBarOpen, setSidebarOpen] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [user, setUser] = useState({
    id: "",
    username: "Уншиж байна...",
    rating: 1200,
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Tomoroo",
  });

  useEffect(() => {
    const id = localStorage.getItem("user_id") || "";
    const username = localStorage.getItem("username") || "Тоглогч";
    setUser((prev) => ({ ...prev, id, username }));
  }, []);

  useEffect(() => {
    if (!user.id) return;
    const fetchName = async () => {
      try {
        const response = await fetch(`${API_URL}/user/${user.id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data?.username) {
          setUser((prev) => ({
            ...prev,
            username: data.username,
            rating: data.rating || prev.rating,
          }));
        }
      } catch (error) {
        console.error("Хэрэглэгчийн мэдээллийг татахад алдаа гарлаа:", error);
      }
    };
    fetchName();
  }, [user.id]);

  const handleUsernameChange = (newName: string) => {
    setUser((prev) => ({ ...prev, username: newName }));
    localStorage.setItem("username", newName);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between z-50 select-none">
      {/* Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span className="text-lg sm:text-xl font-bold tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
          МУУШИГ
        </span>
        <span className="hidden xs:inline text-[9px] sm:text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-semibold tracking-widest truncate max-w-[120px] sm:max-w-none">
          v2.0
        </span>
      </div>

      {sideBarOpen && (
        <SideBar
          currentUsername={user.username}
          onUsernameChange={handleUsernameChange}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {/* User pill */}
      <div
        onClick={() => setSidebarOpen(true)}
        className="flex items-center gap-2 sm:gap-3 bg-slate-800/50 hover:bg-slate-800 active:bg-slate-900 py-1 sm:py-1.5 pl-2 sm:pl-3 pr-1.5 sm:pr-2 rounded-full border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group touch-manipulation"
      >
        <div className="flex flex-col items-end justify-center">
          <span className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-white leading-none mb-0.5 sm:mb-1 transition-colors max-w-[80px] sm:max-w-[120px] truncate">
            {user.username}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono leading-none">
            {user.rating}
          </span>
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
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
