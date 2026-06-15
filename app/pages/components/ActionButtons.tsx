"use client";

import { Card, Phase, PLAYER_LABELS } from "../../model/types";

type Props = {
  phase: Phase;
  decideOrder: number[];
  decideIdx: number;
  swapOrder: number[];
  swapIdx: number;
  playOrder: number[];
  currentPlayIdx: number;
  selectedSwaps: Card[];
  selectedPlay: Card | null;
  maxSwapNow: number;
  isHumanDealer: boolean;
  mySlotIndex?: number;
  onJoin: (joining: boolean) => void;
  onSwap: () => void;
  onSkipSwap: () => void;
  onDealerSwap: (card: Card) => void;
  onDealerSkipSwap: () => void;
  onPlay: () => void;
};

const ActionButtons = ({
  phase,
  decideOrder,
  decideIdx,
  swapOrder,
  swapIdx,
  playOrder,
  currentPlayIdx,
  selectedSwaps,
  selectedPlay,
  maxSwapNow,
  isHumanDealer,
  mySlotIndex = 0,
  onJoin,
  onSwap,
  onSkipSwap,
  onDealerSwap,
  onDealerSkipSwap,
  onPlay,
}: Props) => {
  return (
    <div className="absolute bottom-20 sm:bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 sm:gap-2 z-20 w-full px-4 max-w-sm sm:max-w-none">
      {/* 1-р шат: Орох/өнжих */}
      {phase === "decide" && decideOrder[decideIdx] === mySlotIndex && (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <p className="text-cyan-300 text-xs sm:text-sm text-center">
            Тоглолтонд орох уу?
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => onJoin(true)}
              className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-lg transition text-sm sm:text-base"
            >
              ✅ Орно
            </button>
            <button
              onClick={() => onJoin(false)}
              className="bg-slate-600 hover:bg-slate-500 active:bg-slate-700 text-white font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-lg transition text-sm sm:text-base"
            >
              ⏭ Өнжинө
            </button>
          </div>
        </div>
      )}

      {/* 2-р шат: Солилцоо */}
      {phase === "swap" && swapOrder[swapIdx] === mySlotIndex && (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <p className="text-cyan-300 text-[11px] sm:text-sm text-center leading-tight">
            Солих картуудаа сонго (max {maxSwapNow})
            {selectedSwaps.length > 0 && ` — сонгосон: ${selectedSwaps.length}`}
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onSwap}
              disabled={selectedSwaps.length === 0}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white font-bold px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg transition text-xs sm:text-sm"
            >
              ✅ Солих
            </button>
            <button
              onClick={onSkipSwap}
              className="bg-slate-600 hover:bg-slate-500 active:bg-slate-700 text-white font-bold px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg transition text-xs sm:text-sm"
            >
              ⏭ Дамжуулах
            </button>
          </div>
        </div>
      )}

      {/* Dealer онцгой эрх */}
      {phase === "dealerSwap" && isHumanDealer && (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <p className="text-purple-300 text-[11px] sm:text-sm text-center leading-tight">
            Dealer: нэг карт сонгоод хөзөр суусан модыг авна
            {selectedPlay && ` — сонгосон: ${selectedPlay.name}`}
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => selectedPlay && onDealerSwap(selectedPlay)}
              disabled={!selectedPlay}
              className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white font-bold px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg transition text-xs sm:text-sm"
            >
              🔄 Солих
            </button>
            <button
              onClick={onDealerSkipSwap}
              className="bg-slate-600 hover:bg-slate-500 active:bg-slate-700 text-white font-bold px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg transition text-xs sm:text-sm"
            >
              ⏭ Авахгүй
            </button>
          </div>
        </div>
      )}

      {/* 3-р шат: Тоглолт */}
      {phase === "playing" &&
        playOrder.length > 0 &&
        playOrder[currentPlayIdx] === mySlotIndex && (
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <p className="text-green-300 text-[11px] sm:text-sm text-center">
              {selectedPlay
                ? `Сонгосон: ${selectedPlay.name}`
                : "Тоглох картаа сонгоно уу"}
            </p>
            <button
              onClick={onPlay}
              disabled={!selectedPlay}
              className="bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 text-white font-bold px-5 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-lg transition text-sm sm:text-base"
            >
              🃏 Тоглох
            </button>
          </div>
        )}

      {/* Bot хүлээж байна */}
      {phase === "waitingBot" && (
        <p className="text-slate-400 text-xs sm:text-sm animate-pulse">
          Bot бодож байна...
        </p>
      )}

      {/* Decide waiting */}
      {phase === "decide" && decideOrder[decideIdx] !== mySlotIndex && (
        <p className="text-slate-400 text-xs sm:text-sm animate-pulse text-center">
          {PLAYER_LABELS[decideOrder[decideIdx]]} шийдэж байна...
        </p>
      )}
    </div>
  );
};

export default ActionButtons;
