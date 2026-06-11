"use client";

import React, { useState } from "react";

interface SideBarProps {
  currentUsername: string;
  onUsernameChange: (newName: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const SideBar = ({
  currentUsername,
  onUsernameChange,
  setSidebarOpen,
}: SideBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputName, setInputName] = useState(currentUsername);

  const handleSave = () => {
    if (inputName.trim() === "") return;
    onUsernameChange(inputName.trim());
    setIsEditing(false);
  };

  return (
    <>
      {/* 1. Backdrop - Sidebar-аас гадуур дарахад хаагдах бүрхүүл */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={() => setSidebarOpen(false)}
      />

      {/* 2. Sidebar үндсэн хэсэг */}
      <div className="w-80 h-full fixed top-0 right-0 bg-slate-900 border-l border-slate-800 text-slate-300 z-50 p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div>
          {/* Дээд хэсэг: Хаах товч */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white tracking-wide">
              Профайл Тохиргоо
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Дунд хэсэг: Нэр засах талбар */}
          <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Тоглогчийн нэр
            </label>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  maxLength={15}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white outline-none font-medium transition-all"
                  placeholder="Нэрээ оруулна уу..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                  >
                    Хадгалах
                  </button>
                  <button
                    onClick={() => {
                      setInputName(currentUsername);
                      setIsEditing(false);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
                  >
                    Цуцлах
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <span className="text-base font-medium text-slate-200 truncate pr-2">
                  {currentUsername}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 shrink-0"
                >
                  ✏️ Засах
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Доод хэсэг: Жижиг санамж эсвэл хувилбар */}
        <div className="text-[11px] text-slate-600 font-mono text-center">
          Сүүлийн өөрчлөлт: Саяхан
        </div>
      </div>
    </>
  );
};
