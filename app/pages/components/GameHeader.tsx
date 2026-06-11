"use client";

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
  return (
    <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-3 z-20 pointer-events-none">
      <h1 className="text-2xl font-bold text-green-400 tracking-wide">
        Муушиг Тоглоом
      </h1>
      <p className="text-xs text-yellow-400 mt-0.5 font-semibold">
        {phaseLabel(phase)}
      </p>
      <div className="flex gap-4 text-xs text-gray-300 mt-1">
        <span>
          Хөзөр:{" "}
          <span className="text-pink-400 font-bold">{game.trumpSuit}</span>
        </span>
        <span>
          Газрын мод:{" "}
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
        <div className="mt-2 bg-yellow-900/80 border border-yellow-500 text-yellow-200 text-sm px-4 py-1 rounded-full shadow">
          {message}
        </div>
      )}
    </div>
  );
};

export default GameHeader;
