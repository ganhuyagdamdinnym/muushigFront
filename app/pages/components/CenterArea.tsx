"use client";

import { GameState, Trick, PLAYER_LABELS } from "../../model/types";

type Props = {
  game: GameState;
  currentTrick: Trick | null;
};

const CenterArea = ({ game, currentTrick }: Props) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-10 z-10">
      {/* Газрын мод */}
      <div className="relative w-16 h-24">
        {game.deck.length > 0 ? (
          [...Array(Math.min(3, game.deck.length))].map((_, i) => (
            <img
              key={i}
              src="/card_back.png"
              className="absolute w-16 h-24 rounded shadow"
              style={{ top: i * 2, left: i * 2 }}
            />
          ))
        ) : (
          <div className="w-16 h-24 border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-slate-600 text-[10px] text-center">
            Хоосон
          </div>
        )}
        <div className="text-center text-[10px] text-gray-400 mt-1 absolute -bottom-5 w-full">
          Газрын мод
        </div>
      </div>

      {/* Топ карт (хөзөр) */}
      <div className="flex flex-col items-center">
        <div className="text-[10px] text-pink-400 mb-1">Хөзөр</div>
        <img
          src={`/${game.topCard.image}`}
          className="w-16 h-24 border-2 border-pink-400 rounded-lg shadow-lg"
        />
      </div>

      {/* Одоогийн гэрийн картнууд */}
      {currentTrick && currentTrick.plays.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="text-[10px] text-yellow-400 mb-1">Одоогийн гэр</div>
          <div className="flex -space-x-3">
            {currentTrick.plays.map(({ playerId, card }) => (
              <div key={card.id} className="flex flex-col items-center">
                <img
                  src={`/${card.image}`}
                  className="w-12 h-18 rounded shadow border border-yellow-400"
                />
                <span className="text-[9px] text-gray-400 mt-0.5">
                  {PLAYER_LABELS[playerId]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterArea;
