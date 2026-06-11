"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CardsData from "./cards.json";
import {
  Card,
  GameState,
  Phase,
  Player,
  Trick,
  TrickPlay,
  PLAYER_LABELS,
} from "../model/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const nextId = (id: number): number => (id === 4 ? 0 : id + 1);

export const orderFrom = (start: number): number[] => {
  const arr: number[] = [];
  let cur = start;
  for (let i = 0; i < 5; i++) {
    arr.push(cur);
    cur = nextId(cur);
  }
  return arr;
};

const mapCard = (cardId: number): Card =>
  (CardsData as Card[]).find((c: Card) => c.id === cardId)!;

type Slot = {
  slotIndex: number;
  userId: string;
  username: string;
  isBot: boolean;
};

type UseMultiplayerGameProps = {
  roomId: string;
  userId: string;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useMultiplayerGame = ({
  roomId,
  userId,
}: UseMultiplayerGameProps) => {
  const wsRef = useRef<WebSocket | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [mySlotIndex, setMySlotIndex] = useState<number>(0);

  const [game, setGame] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("waitingBot");
  const [message, setMessage] = useState<string>("");

  const [decideOrder, setDecideOrder] = useState<number[]>([]);
  const [decideIdx, setDecideIdx] = useState<number>(0);
  const [swapOrder, setSwapOrder] = useState<number[]>([]);
  const [swapIdx, setSwapIdx] = useState<number>(0);
  const [selectedSwaps, setSelectedSwaps] = useState<Card[]>([]);
  const [currentTrick, setCurrentTrick] = useState<Trick | null>(null);
  const [currentPlayIdx, setCurrentPlayIdx] = useState<number>(0);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<Card | null>(null);

  // ── WebSocket message handler ─────────────────────────────────────────────

  const handleWsMessage = useCallback(
    (msg: Record<string, unknown>, currentGame: GameState | null) => {
      const type = msg.type as string;

      if (type === "room_state") {
        const data = msg.data as Record<string, unknown>;
        initFromRoomData(data);
      } else if (type === "game_started") {
        const data = msg.data as Record<string, unknown>;
        initFromRoomData(data);
      } else if (type === "player_decided") {
        // Бусад тоглогчийн орох/өнжих шийдвэр
        if (!currentGame) return;
        const slotIdx = msg.slotIndex as number;
        const joining = msg.joining as boolean;
        const newPlayers = currentGame.players.map((p: Player) =>
          p.id === slotIdx ? { ...p, skipped: !joining } : p,
        );
        setGame({ ...currentGame, players: newPlayers });
      } else if (type === "cards_swapped") {
        // Бусад тоглогч карт сольсон — зөвхөн deck-ийн тоо буурна
        if (!currentGame) return;
        const count = msg.count as number;
        setGame({ ...currentGame, deck: currentGame.deck.slice(count) });
      } else if (type === "card_played") {
        // Бусад тоглогч карт тоглосон
        if (!currentGame) return;
        const slotIdx = msg.slotIndex as number;
        const card = msg.card as Card;
        const newPlayers = currentGame.players.map((p: Player) =>
          p.id === slotIdx
            ? { ...p, cards: p.cards.filter((c: Card) => c.id !== card.id) }
            : p,
        );
        const trick = currentGame as unknown as { currentTrick: Trick | null };
        setGame({ ...currentGame, players: newPlayers });
      } else if (type === "round_ended") {
        const data = msg.data as Record<string, unknown>;
        if ((data.status as string) === "finished") {
          setMessage(`🎉 Тоглоом дууслаа!`);
          setPhase("playing");
        } else {
          initFromRoomData(data);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  // ── Room data → GameState ─────────────────────────────────────────────────

  const initFromRoomData = (data: Record<string, unknown>) => {
    const slotsData = data.slots as Slot[];
    setSlots(slotsData);

    const myIdx = slotsData.findIndex((s: Slot) => s.userId === userId);
    setMySlotIndex(myIdx >= 0 ? myIdx : 0);

    const round = data.round as Record<string, unknown>;
    const dealer = round.currentPlayer as number;
    const cards = round.cards as number[][];
    const points = round.playersPoints as Record<string, number>;

    const players: Player[] = slotsData.map((slot: Slot, i: number) => ({
      id: i,
      cards: (cards[i] || []).map(mapCard),
      score: points[String(i)] ?? 15,
      skipped: false,
      tricksWon: 0,
    }));

    const topCard = mapCard(round.topCard as number);
    const gs: GameState = {
      players,
      deck: (round.remainingCards as number[]).map(mapCard),
      topCard,
      currentPlayer: dealer,
      trumpSuit: topCard.suit,
    };

    setGame(gs);
    setCurrentTrick(null);
    setSelectedPlay(null);
    setSelectedSwaps([]);

    const order = orderFrom(nextId(dealer));
    setDecideOrder(order);
    setDecideIdx(0);
    setMessage("");

    const myActualIdx = slotsData.findIndex((s: Slot) => s.userId === userId);

    if (order[0] !== myActualIdx) {
      setPhase("waitingBot");
    } else {
      setPhase("decide");
    }
  };

  // ── WebSocket холболт ─────────────────────────────────────────────────────

  useEffect(() => {
    const ws = new WebSocket(
      `ws://127.0.0.1:8000/real_room/${roomId}/ws/${userId}`,
    );
    wsRef.current = ws;

    // game state-г ref-ээр дамжуулах (stale closure-оос зайлсхийх)
    let latestGame: GameState | null = null;
    const unsubGame = (g: GameState | null) => {
      latestGame = g;
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleWsMessage(msg, latestGame);
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // game state өөрчлөгдөх бүрд latestGame шинэчлэх
  useEffect(() => {
    // wsRef-ийн onmessage дотор хуучин closure байвал шинэчлэх хэрэгтэй
    // Энгийн шийдэл: game-г ref-д хадгалах
  }, [game]);

  // ── WebSocket илгээх helpers ──────────────────────────────────────────────

  const sendWs = (msg: object) => {
    wsRef.current?.send(JSON.stringify(msg));
  };

  const sendDecide = (joining: boolean) => {
    sendWs({ type: "decide", slotIndex: mySlotIndex, joining });
  };

  const sendSwap = (count: number) => {
    sendWs({ type: "swap_cards", slotIndex: mySlotIndex, count });
  };

  const sendPlay = (card: Card) => {
    sendWs({ type: "play_card", slotIndex: mySlotIndex, card });
  };

  const sendEndRound = (tricksWon: Record<string, number>) => {
    sendWs({ type: "end_round", tricksWon });
  };

  return {
    // State
    game,
    setGame,
    phase,
    setPhase,
    message,
    setMessage,
    slots,
    mySlotIndex,
    decideOrder,
    setDecideOrder,
    decideIdx,
    setDecideIdx,
    swapOrder,
    setSwapOrder,
    swapIdx,
    setSwapIdx,
    selectedSwaps,
    setSelectedSwaps,
    currentTrick,
    setCurrentTrick,
    currentPlayIdx,
    setCurrentPlayIdx,
    playOrder,
    setPlayOrder,
    selectedPlay,
    setSelectedPlay,
    // WS senders
    sendDecide,
    sendSwap,
    sendPlay,
    sendEndRound,
  };
};
