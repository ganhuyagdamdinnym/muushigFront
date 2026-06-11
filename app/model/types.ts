// ── Types ────────────────────────────────────────────────────────────────────

export type Card = {
  id: number;
  name: string;
  suit: string;
  rank: number;
  image: string;
};

export type Player = {
  id: number;
  cards: Card[];
  score: number;
  skipped: boolean; // тоглолтонд орсон эсэх (false=өнжсөн)
  tricksWon: number; // тухайн тоглолтод авсан гэрийн тоо
};

export type TrickPlay = { playerId: number; card: Card };

export type Trick = {
  leadCard: Card;
  leadPlayer: number;
  plays: TrickPlay[];
};

export type GameState = {
  players: Player[];
  deck: Card[]; // газрын мод
  topCard: Card; // хөзөр (trump suit)
  currentPlayer: number; // dealer (ажил хийж байгаа хүн)
  trumpSuit: string; // тухайн тоглолтын хөзрийн өнгө
};

export type Phase =
  | "decide" // орох эсэхээ шийдэх (аман хүзүүгээс эхлэн)
  | "swap" // солилцоо
  | "dealerSwap" // dealer онцгой эрх: нэг карт хаяж topCard авах
  | "playing" // тоглолт явагдаж байна
  | "waitingBot"; // bot хийж байна

export const PLAYER_LABELS = ["Та", "Bot 1", "Bot 2", "Bot 3", "Bot 4"];
