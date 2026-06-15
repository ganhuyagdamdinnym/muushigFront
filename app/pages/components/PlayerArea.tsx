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

// Responsive positions for 5 players around the table
// Each entry: [mobile classes, desktop (sm+) overrides handled via responsive classes]
const PLAYER_POSITIONS = [
  // 0: Та — bottom center (human player)
  "bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2",
  // 1: Bot 1 — left middle
  "top-1/2 -translate-y-1/2 left-1 sm:left-4",
  // 2: Bot 2 — top left
  "top-14 sm:top-4 left-1/4 -translate-x-1/2",
  // 3: Bot 3 — top right
  "top-14 sm:top-4 right-1/4 translate-x-1/2",
  // 4: Bot 4 — right middle
  "top-1/2 -translate-y-1/2 right-1 sm:right-4",
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
        const isMe = player.id === mySlotIndex;

        // Card size: smaller on mobile, normal on sm+
        const cardW = isMe ? "w-10 sm:w-14" : "w-8 sm:w-11";
        const cardH = isMe ? "h-14 sm:h-20" : "h-12 sm:h-16";

        return (
          <div
            key={player.id}
            className={`absolute flex flex-col items-center gap-0.5 sm:gap-1 ${PLAYER_POSITIONS[player.id]} transition-all z-10
              ${isCurrent ? "scale-105" : player.skipped ? "opacity-30" : "opacity-70"}
            `}
          >
            {/* Player label */}
            <div
              className={`text-[9px] sm:text-xs font-bold flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 max-w-[70px] sm:max-w-none ${
                isCurrent ? "text-yellow-400" : "text-white"
              }`}
            >
              <span className="truncate max-w-[60px] sm:max-w-none">
                {slotLabels ? slotLabels[player.id] : PLAYER_LABELS[player.id]}
                {isMe ? " (Та)" : ""}
              </span>
              {isDealer && (
                <span className="text-purple-400 text-[8px] sm:text-[10px]">
                  D
                </span>
              )}
              {player.skipped && (
                <span className="text-red-500 text-[8px] sm:text-[10px]">
                  ✗
                </span>
              )}
              <span className="text-gray-400 text-[8px] sm:text-[10px] whitespace-nowrap">
                {player.score}оноо
              </span>
            </div>

            {/* Cards */}
            <div className="flex -space-x-3 sm:-space-x-5">
              {player.cards.map((card) => {
                const isSelected =
                  (phase === "swap" &&
                    isMe &&
                    !!selectedSwaps.find((c) => c.id === card.id)) ||
                  (phase === "dealerSwap" &&
                    isMe &&
                    selectedPlay?.id === card.id) ||
                  (phase === "playing" && isMe && selectedPlay?.id === card.id);

                const isIllegal =
                  phase === "playing" &&
                  isMe &&
                  legalIds.size > 0 &&
                  !legalIds.has(card.id);

                const isClickable =
                  isMe &&
                  (phase === "swap" ||
                    phase === "dealerSwap" ||
                    (phase === "playing" &&
                      playOrder[currentPlayIdx] === mySlotIndex));

                return (
                  <img
                    key={card.id}
                    src={isMe ? `/${card.image}` : "/card_back.png"}
                    alt={isMe ? card.name : "card"}
                    className={`${cardW} ${cardH} rounded shadow-md border transition-all
                      ${isSelected ? "-translate-y-3 sm:-translate-y-4 border-cyan-400 border-2" : "border-slate-700"}
                      ${isIllegal ? "opacity-30 cursor-not-allowed grayscale" : ""}
                      ${isClickable && !isIllegal ? "cursor-pointer hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-95" : ""}
                    `}
                    onClick={() => {
                      if (!isClickable || isIllegal) return;
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
