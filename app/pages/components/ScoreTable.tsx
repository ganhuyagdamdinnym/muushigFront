"use client";

import { Player, PLAYER_LABELS } from "../../model/types";

type Props = {
  players: Player[];
  slotLabels?: string[];
};

const ScoreTable = ({ players, slotLabels }: Props) => {
  return (
    <div className="absolute top-16 sm:top-20 right-1.5 sm:right-3 z-20 bg-slate-800/90 border border-slate-700 rounded-lg p-1.5 sm:p-2 text-[10px] sm:text-[11px] min-w-[80px] sm:min-w-[100px] shadow-lg">
      <div className="text-gray-400 font-semibold mb-0.5 sm:mb-1 text-[9px] sm:text-[11px] uppercase tracking-wide">
        Оноо
      </div>
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex justify-between gap-2 sm:gap-3 py-0.5 ${
            p.score <= 0 ? "text-yellow-400 font-bold" : "text-white"
          }`}
        >
          <span className="truncate max-w-[48px] sm:max-w-none">
            {slotLabels ? slotLabels[p.id] : PLAYER_LABELS[p.id]}
          </span>
          <span className="shrink-0">{p.score}</span>
        </div>
      ))}
    </div>
  );
};

export default ScoreTable;
