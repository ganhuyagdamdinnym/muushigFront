"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameState, Phase, PLAYER_LABELS } from "../../model/types";

type Props = {
  game: GameState;
  phase: Phase;
  message: string;
};

const phaseLabel = (phase: Phase): string => {
  if (phase === "decide") return "Орох/Өнжих";
  if (phase === "swap" || phase === "dealerSwap") return "Солилцоо";
  if (phase === "playing" || phase === "waitingBot") return "Тоглолт";
  return "...";
};

const GameHeader = ({ game, phase, message }: Props) => {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 sm:pt-3">
      {/* Home товч — зүүн дээд булан */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
        {showConfirm ? (
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-lg">
            <span className="text-[10px] sm:text-xs text-slate-300 whitespace-nowrap">
              Гарах уу?
            </span>
            <button
              onClick={() => router.push("/")}
              className="text-[10px] sm:text-xs bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold px-2 py-0.5 rounded-lg transition-colors"
            >
              Тийм
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-[10px] sm:text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-2 py-0.5 rounded-lg transition-colors"
            >
              Үгүй
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/60 hover:border-slate-600 text-slate-400 hover:text-white text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded-xl transition-all shadow"
          >
            ← Нүүр
          </button>
        )}
      </div>

      {/* Голын мэдээлэл */}
      <div className="flex flex-col items-center pointer-events-none">
        <h1 className="text-lg sm:text-2xl font-bold text-green-400 tracking-wide leading-none">
          Муушиг Тоглоом
        </h1>
        <p className="text-[10px] sm:text-xs text-yellow-400 mt-0.5 font-semibold">
          {phaseLabel(phase)}
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-300 mt-0.5 sm:mt-1">
          <span>
            Хөзөр:{" "}
            <span className="text-pink-400 font-bold">{game.trumpSuit}</span>
          </span>
          <span>
            Мод:{" "}
            <span className="text-white font-bold">{game.deck.length}</span>
          </span>
          <span>
            Dealer:{" "}
            <span className="text-purple-400 font-bold">
              {PLAYER_LABELS[game.currentPlayer]}
            </span>
          </span>
        </div>
        {message && (
          <div className="mt-1.5 sm:mt-2 bg-yellow-900/80 border border-yellow-500 text-yellow-200 text-[11px] sm:text-sm px-3 sm:px-4 py-1 rounded-full shadow max-w-[90vw] text-center line-clamp-2">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHeader;
