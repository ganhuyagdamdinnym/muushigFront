"use client";

import {
  Card,
  GameState,
  Phase,
  Player,
  PLAYER_LABELS,
} from "../../model/types";

type Props = {
  game: GameState;
  phase: Phase;
  decideOrder: number[];
  decideIdx: number;
  swapOrder: number[];
  swapIdx: number;
  playOrder: number[];
  currentPlayIdx: number;
  selectedSwaps: Card[];
  selectedPlay: Card | null;
  legalIds: Set<number>;
  mySlotIndex?: number;
  slotLabels?: string[];
  onToggleSwapCard: (card: Card) => void;
  onSelectPlayCard: (card: Card) => void;
};

const PLAYER_POSITIONS = [
  "bottom-4 left-1/2 -translate-x-1/2", // 0: Та (доод төв)
  "top-1/2 left-4", // 1: Bot 1
  "top-4 left-1/4 -translate-x-1/2", // 2: Bot 2
  "top-4 right-1/4 translate-x-1/2", // 3: Bot 3
  "top-1/2 right-4", // 4: Bot 4
];

const PlayerArea = ({
  game,
  phase,
  decideOrder,
  decideIdx,
  swapOrder,
  swapIdx,
  playOrder,
  currentPlayIdx,
  selectedSwaps,
  selectedPlay,
  legalIds,
  mySlotIndex = 0,
  slotLabels,
  onToggleSwapCard,
  onSelectPlayCard,
}: Props) => {
  const isHumanDealer = game.currentPlayer === mySlotIndex;

  const isCurrentPlayer = (player: Player): boolean => {
    if (phase === "decide") return decideOrder[decideIdx] === player.id;
    if (phase === "swap" || phase === "waitingBot")
      return swapOrder[swapIdx] === player.id;
    if (phase === "dealerSwap")
      return isHumanDealer && player.id === mySlotIndex;
    if (phase === "playing") return playOrder[currentPlayIdx] === player.id;
    return false;
  };

  return (
    <>
      {game.players.map((player) => {
        const isDealer = player.id === game.currentPlayer;
        const isCurrent = isCurrentPlayer(player);

        return (
          <div
            key={player.id}
            className={`absolute flex flex-col items-center gap-1 ${PLAYER_POSITIONS[player.id]} transition-all z-10
              ${isCurrent ? "scale-105" : player.skipped ? "opacity-30" : "opacity-70"}
            `}
          >
            {/* Player label */}
            <div
              className={`text-xs font-bold flex items-center gap-1 ${
                isCurrent ? "text-yellow-400" : "text-white"
              }`}
            >
              {slotLabels ? slotLabels[player.id] : PLAYER_LABELS[player.id]}
              {player.id === mySlotIndex ? " (Та)" : ""}
              {isDealer && (
                <span className="text-purple-400 text-[10px]">dealer</span>
              )}
              {player.skipped && (
                <span className="text-red-500 text-[10px]">өнжсөн</span>
              )}
              <span className="text-gray-400 text-[10px]">
                [{player.score}оноо / {player.tricksWon}гэр]
              </span>
            </div>

            {/* Cards */}
            <div className="flex -space-x-5">
              {player.cards.map((card) => {
                const isSelected =
                  (phase === "swap" &&
                    player.id === mySlotIndex &&
                    !!selectedSwaps.find((c) => c.id === card.id)) ||
                  (phase === "dealerSwap" &&
                    player.id === mySlotIndex &&
                    selectedPlay?.id === card.id) ||
                  (phase === "playing" &&
                    player.id === mySlotIndex &&
                    selectedPlay?.id === card.id);

                const isIllegal =
                  phase === "playing" &&
                  player.id === mySlotIndex &&
                  legalIds.size > 0 &&
                  !legalIds.has(card.id);

                const isClickable =
                  player.id === mySlotIndex &&
                  (phase === "swap" ||
                    phase === "dealerSwap" ||
                    (phase === "playing" &&
                      playOrder[currentPlayIdx] === mySlotIndex));

                return (
                  <img
                    key={card.id}
                    src={
                      player.id === mySlotIndex
                        ? `/${card.image}`
                        : "/card_back.png"
                    }
                    alt={player.id === mySlotIndex ? card.name : "card"}
                    className={`w-14 h-20 rounded shadow-md border transition-all
                      ${isSelected ? "-translate-y-4 border-cyan-400 border-2" : "border-slate-700"}
                      ${isIllegal ? "opacity-30 cursor-not-allowed grayscale" : ""}
                      ${isClickable ? "cursor-pointer hover:-translate-y-2" : ""}
                    `}
                    onClick={() => {
                      if (!isClickable) return;
                      if (phase === "swap") {
                        onToggleSwapCard(card);
                      } else {
                        onSelectPlayCard(card);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default PlayerArea;
