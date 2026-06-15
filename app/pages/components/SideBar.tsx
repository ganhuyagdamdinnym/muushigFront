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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setInputName(currentUsername);
      setIsEditing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar panel — full width on mobile, fixed 320px on sm+ */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-slate-900 border-l border-slate-800 text-slate-300 z-50 p-5 sm:p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Профайл Тохиргоо
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
              aria-label="Хаах"
            >
              ✕
            </button>
          </div>

          {/* Username section */}
          <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
            <label className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Тоглогчийн нэр
            </label>

            {isEditing ? (
              <div className="space-y-2 sm:space-y-3">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={15}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white outline-none font-medium transition-all"
                  placeholder="Нэрээ оруулна уу..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                  >
                    Хадгалах
                  </button>
                  <button
                    onClick={() => {
                      setInputName(currentUsername);
                      setIsEditing(false);
                    }}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors"
                  >
                    Цуцлах
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <span className="text-sm sm:text-base font-medium text-slate-200 truncate pr-2">
                  {currentUsername}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 active:bg-slate-900 px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 shrink-0"
                >
                  ✏️ Засах
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-slate-600 font-mono text-center pb-safe">
          Сүүлийн өөрчлөлт: Саяхан
        </div>
      </div>
    </>
  );
};
