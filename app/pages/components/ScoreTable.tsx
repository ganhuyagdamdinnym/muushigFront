"use client";

import { Player, PLAYER_LABELS } from "../../model/types";

type Props = {
  players: Player[];
  slotLabels?: string[];
};

const ScoreTable = ({ players, slotLabels }: Props) => {
  return (
    <div className="absolute top-20 right-3 z-20 bg-slate-800/80 border border-slate-700 rounded-lg p-2 text-[11px]">
      <div className="text-gray-400 font-semibold mb-1">Оноо</div>
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex justify-between gap-3 ${
            p.score <= 0 ? "text-yellow-400 font-bold" : "text-white"
          }`}
        >
          <span>{slotLabels ? slotLabels[p.id] : PLAYER_LABELS[p.id]}</span>
          <span>{p.score}</span>
        </div>
      ))}
    </div>
  );
};

export default ScoreTable;
