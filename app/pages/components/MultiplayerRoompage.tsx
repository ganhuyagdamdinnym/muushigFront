"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CardsData from "../../assistent/cards.json";
import {
  Card,
  GameState,
  Phase,
  Player,
  Trick,
  TrickPlay,
  PLAYER_LABELS,
} from "../../model/types";
import GameHeader from "../../pages/components/GameHeader";
import PlayerArea from "../../pages/components/PlayerArea";
import CenterArea from "../../pages/components/CenterArea";
import ActionButtons from "../../pages/components/ActionButtons";
import ScoreTable from "../../pages/components/ScoreTable";

const nextId = (id: number): number => (id === 4 ? 0 : id + 1);

const orderFrom = (start: number): number[] => {
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

type Props = {
  roomId: string;
  userId: string;
};

const MultiplayerRoomPage = ({ roomId, userId }: Props) => {
  const wsRef = useRef<WebSocket | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const slotsRef = useRef<Slot[]>([]);
  const mySlotRef = useRef<number>(0);
  const currentTrickRef = useRef<Trick | null>(null);
  const decideOrderRef = useRef<number[]>([]);
  const decideIdxRef = useRef<number>(0);
  const swapOrderRef = useRef<number[]>([]);
  const swapIdxRef = useRef<number>(0);
  const playOrderRef = useRef<number[]>([]);
  const currentPlayIdxRef = useRef<number>(0);

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
  const [wsConnected, setWsConnected] = useState(false);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

  // ── Synced setters ────────────────────────────────────────────────────────
  const setGameSynced = (gs: GameState) => {
    gameRef.current = gs;
    setGame(gs);
  };
  const setSlotsSynced = (s: Slot[]) => {
    slotsRef.current = s;
    setSlots(s);
  };
  const setDecideOrderSynced = (o: number[]) => {
    decideOrderRef.current = o;
    setDecideOrder(o);
  };
  const setDecideIdxSynced = (i: number) => {
    decideIdxRef.current = i;
    setDecideIdx(i);
  };
  const setSwapOrderSynced = (o: number[]) => {
    swapOrderRef.current = o;
    setSwapOrder(o);
  };
  const setSwapIdxSynced = (i: number) => {
    swapIdxRef.current = i;
    setSwapIdx(i);
  };
  const setPlayOrderSynced = (o: number[]) => {
    playOrderRef.current = o;
    setPlayOrder(o);
  };
  const setCurrentPlayIdxSynced = (i: number) => {
    currentPlayIdxRef.current = i;
    setCurrentPlayIdx(i);
  };

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const sendWs = (msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  useEffect(() => {
    if (!userId || !roomId || !WS_URL) return;
    let isMounted = true;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/real_room/${roomId}/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.log("[WS] Connected");
        setWsConnected(true);
        setMessage("");
      };

      ws.onmessage = (e) => {
        if (!isMounted) return;
        const msg = JSON.parse(e.data);
        handleWsMessage(msg);
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setWsConnected(false);
        setMessage("⚠️ WebSocket алдаа гарлаа");
      };

      ws.onclose = (e) => {
        if (!isMounted) return;
        setWsConnected(false);
        console.log("[WS] Closed:", e.code, e.reason);
        // Автоматаар дахин холбогдох (3 секундын дараа)
        if (isMounted && e.code !== 1000) {
          setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      wsRef.current?.close(1000, "unmount");
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, WS_URL]);

  const handleWsMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const type = msg.type as string;

      if (type === "room_state" || type === "game_started") {
        initFromData(msg.data as Record<string, unknown>);
      } else if (type === "player_decided") {
        const slotIdx = msg.slotIndex as number;
        const joining = msg.joining as boolean;
        const gs = gameRef.current;
        if (!gs) return;
        const newPlayers = gs.players.map((p: Player) =>
          p.id === slotIdx ? { ...p, skipped: !joining } : p,
        );
        const newGs = { ...gs, players: newPlayers };
        setGameSynced(newGs);

        const nextIdx = decideIdxRef.current + 1;
        setDecideIdxSynced(nextIdx);
        const ord = decideOrderRef.current;
        if (nextIdx >= ord.length) {
          setTimeout(() => startSwapPhase(newGs), 100);
        } else {
          const nextPid = ord[nextIdx];
          const myIdx = mySlotRef.current;
          if (nextPid === myIdx) {
            setPhase("decide");
          } else if (slotsRef.current[nextPid]?.isBot) {
            setPhase("waitingBot");
            setTimeout(
              () => botDecide(newGs, ord, nextIdx, slotsRef.current, myIdx),
              800,
            );
          } else {
            setPhase("waitingBot");
          }
        }
      } else if (type === "cards_swapped") {
        const count = msg.count as number;
        const slotIdx = msg.slotIndex as number;
        const gs = gameRef.current;
        if (!gs) return;
        const newDeck = gs.deck.slice(count);
        const newGs = { ...gs, deck: newDeck };
        setGameSynced(newGs);

        const nextIdx = swapIdxRef.current + 1;
        setSwapIdxSynced(nextIdx);
        const ord = swapOrderRef.current;
        if (nextIdx >= ord.length) {
          setTimeout(() => startDealerSwap(newGs), 100);
        } else {
          const nextPid = ord[nextIdx];
          if (nextPid === mySlotRef.current) {
            setPhase("swap");
          } else if (slotsRef.current[nextPid]?.isBot) {
            setPhase("waitingBot");
            setTimeout(() => botSwap(newGs, ord, nextIdx), 800);
          } else {
            setPhase("waitingBot");
          }
        }
      } else if (type === "card_played") {
        const slotIdx = msg.slotIndex as number;
        const card = msg.card as Card;
        const gs = gameRef.current;
        if (!gs) return;
        const newPlayers = gs.players.map((p: Player) =>
          p.id === slotIdx
            ? { ...p, cards: p.cards.filter((c: Card) => c.id !== card.id) }
            : p,
        );
        const newGs = { ...gs, players: newPlayers };

        const newTrick: Trick = currentTrickRef.current
          ? {
              ...currentTrickRef.current,
              plays: [
                ...currentTrickRef.current.plays,
                { playerId: slotIdx, card },
              ],
            }
          : {
              leadCard: card,
              leadPlayer: slotIdx,
              plays: [{ playerId: slotIdx, card }],
            };
        currentTrickRef.current = newTrick;
        setCurrentTrick(newTrick);
        setGameSynced(newGs);

        const nextIdx = currentPlayIdxRef.current + 1;
        setCurrentPlayIdxSynced(nextIdx);
        const ord = playOrderRef.current;
        if (nextIdx >= ord.length) {
          setTimeout(() => resolveTrick(newGs, newTrick, ord), 600);
        } else {
          const nextPid = ord[nextIdx];
          const myIdx = mySlotRef.current;
          if (nextPid === myIdx) {
            setPhase("playing");
          } else if (slotsRef.current[nextPid]?.isBot) {
            setPhase("waitingBot");
            setTimeout(() => botPlay(newGs, ord, nextIdx, newTrick), 800);
          } else {
            setPhase("waitingBot");
          }
        }
      } else if (type === "round_ended") {
        const data = msg.data as Record<string, unknown>;
        if ((data.status as string) === "finished") {
          setMessage("🎉 Тоглоом дууслаа!");
          setPhase("playing");
        } else {
          initFromData(data);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Room data → GameState ─────────────────────────────────────────────────
  const initFromData = (data: Record<string, unknown>) => {
    const slotsData = data.slots as Slot[];
    setSlotsSynced(slotsData);

    const myIdx = slotsData.findIndex((s: Slot) => s.userId === userId);
    const myActualIdx = myIdx >= 0 ? myIdx : 0;
    mySlotRef.current = myActualIdx;
    setMySlotIndex(myActualIdx);

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

    setGameSynced(gs);
    currentTrickRef.current = null;
    setCurrentTrick(null);
    setSelectedPlay(null);
    setSelectedSwaps([]);

    const order = orderFrom(nextId(dealer));
    setDecideOrderSynced(order);
    setDecideIdxSynced(0);
    setMessage("");

    const firstPid = order[0];
    if (firstPid === myActualIdx) {
      setPhase("decide");
    } else if (slotsData[firstPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botDecide(gs, order, 0, slotsData, myActualIdx), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  // ── Шат 1: Орох/өнжих ───────────────────────────────────────────────────
  const botDecide = (
    gs: GameState,
    order: number[],
    idx: number,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const playerId = order[idx];
    const player = gs.players.find((p: Player) => p.id === playerId)!;
    const enteredCount = gs.players.filter((p: Player) => !p.skipped).length;
    const remaining = order.length - idx;
    const autoJoin = enteredCount === 0 && remaining <= 2;
    const trumpCards = player.cards.filter(
      (c: Card) => c.suit === gs.trumpSuit,
    );
    const highCards = player.cards.filter((c: Card) => c.rank >= 11);
    const shouldJoin =
      autoJoin || trumpCards.length >= 1 || highCards.length >= 2;
    advanceDecide(gs, order, idx, shouldJoin, slotsData, myIdx);
  };

  const advanceDecide = (
    gs: GameState,
    order: number[],
    idx: number,
    joining: boolean,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const playerId = order[idx];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === playerId ? { ...p, skipped: !joining } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      startSwapPhase(newGs);
      return;
    }

    setDecideIdxSynced(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === myIdx) {
      setPhase("decide");
    } else if (slotsData[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botDecide(newGs, order, nextIdx, slotsData, myIdx), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const handlePlayerJoin = (joining: boolean): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "decide", slotIndex: mySlotRef.current, joining });
    advanceDecide(
      gs,
      decideOrderRef.current,
      decideIdxRef.current,
      joining,
      slotsRef.current,
      mySlotRef.current,
    );
  };

  // ── Шат 2: Солилцоо ─────────────────────────────────────────────────────
  const startSwapPhase = (gs: GameState): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid: number) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
    );
    setSwapOrderSynced(entered);
    setSwapIdxSynced(0);
    setSelectedSwaps([]);

    if (entered.length === 0) {
      startDealerSwap(gs);
      return;
    }

    const first = entered[0];
    if (first === mySlotRef.current) {
      setPhase("swap");
    } else if (slotsRef.current[first]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botSwap(gs, entered, 0), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const botSwap = (gs: GameState, order: number[], idx: number): void => {
    const playerId = order[idx];
    const player = gs.players.find((p: Player) => p.id === playerId)!;
    const maxSwap = Math.min(gs.deck.length, player.cards.length);
    if (maxSwap === 0) {
      advanceSwap(gs, order, idx, []);
      return;
    }
    const sorted = [...player.cards]
      .filter((c: Card) => c.suit !== gs.trumpSuit)
      .sort((a: Card, b: Card) => a.rank - b.rank);
    const swapCount = Math.min(
      Math.floor(Math.random() * Math.min(sorted.length, maxSwap)) + 1,
      maxSwap,
    );
    advanceSwap(gs, order, idx, sorted.slice(0, swapCount));
  };

  const advanceSwap = (
    gs: GameState,
    order: number[],
    idx: number,
    toDiscard: Card[],
  ): void => {
    const playerId = order[idx];
    const player = gs.players.find((p: Player) => p.id === playerId)!;
    const drawn = gs.deck.slice(0, toDiscard.length);
    const remainingDeck = gs.deck.slice(toDiscard.length);
    const discardIds = toDiscard.map((c: Card) => c.id);
    const newHand = [
      ...player.cards.filter((c: Card) => !discardIds.includes(c.id)),
      ...drawn,
    ];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === playerId ? { ...p, cards: newHand } : p,
    );
    const newGs = { ...gs, players: newPlayers, deck: remainingDeck };
    setGameSynced(newGs);
    setSelectedSwaps([]);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      startDealerSwap(newGs);
      return;
    }

    setSwapIdxSynced(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === mySlotRef.current) {
      setPhase("swap");
    } else if (slotsRef.current[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botSwap(newGs, order, nextIdx), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const handlePlayerSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({
      type: "swap_cards",
      slotIndex: mySlotRef.current,
      count: selectedSwaps.length,
    });
    advanceSwap(gs, swapOrderRef.current, swapIdxRef.current, selectedSwaps);
  };

  const handleSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotRef.current, count: 0 });
    advanceSwap(gs, swapOrderRef.current, swapIdxRef.current, []);
  };

  const toggleSwapCard = (card: Card): void => {
    const gs = gameRef.current;
    if (!gs) return;
    const maxSwap = Math.min(
      gs.deck.length,
      gs.players[mySlotRef.current].cards.length,
    );
    setSelectedSwaps((prev: Card[]) => {
      const exists = prev.find((c: Card) => c.id === card.id);
      if (exists) return prev.filter((c: Card) => c.id !== card.id);
      if (prev.length >= maxSwap) return prev;
      return [...prev, card];
    });
  };

  // ── Dealer онцгой эрх ───────────────────────────────────────────────────
  const startDealerSwap = (gs: GameState): void => {
    const dealer = gs.players.find((p: Player) => p.id === gs.currentPlayer)!;
    if (dealer.skipped) {
      startPlayPhase(gs);
      return;
    }
    if (gs.currentPlayer === mySlotRef.current) {
      setPhase("dealerSwap");
    } else if (slotsRef.current[gs.currentPlayer]?.isBot) {
      const sorted = [...dealer.cards].sort(
        (a: Card, b: Card) => a.rank - b.rank,
      );
      applyDealerSwap(gs, sorted[0]);
    } else {
      setPhase("waitingBot");
    }
  };

  const applyDealerSwap = (gs: GameState, toDiscard: Card): void => {
    const dealer = gs.players.find((p: Player) => p.id === gs.currentPlayer)!;
    const newHand = [
      ...dealer.cards.filter((c: Card) => c.id !== toDiscard.id),
      gs.topCard,
    ];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === gs.currentPlayer ? { ...p, cards: newHand } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);
    startPlayPhase(newGs);
  };

  const handleDealerSwap = (card: Card): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotRef.current, count: 1 });
    applyDealerSwap(gs, card);
  };

  const handleDealerSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotRef.current, count: 0 });
    startPlayPhase(gs);
  };

  // ── Шат 3: Тоглолт ─────────────────────────────────────────────────────
  const startPlayPhase = (gs: GameState): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid: number) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
    );
    if (entered.length === 0) {
      endRound(gs);
      return;
    }

    setPlayOrderSynced(entered);
    setCurrentPlayIdxSynced(0);
    currentTrickRef.current = null;
    setCurrentTrick(null);
    setSelectedPlay(null);
    setMessage("");

    const first = entered[0];
    if (first === mySlotRef.current) {
      setPhase("playing");
    } else if (slotsRef.current[first]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botPlay(gs, entered, 0, null), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const legalCards = (
    player: Player,
    trick: Trick | null,
    gs: GameState,
    positionInTrick: number,
    totalInTrick: number,
  ): Card[] => {
    if (!trick) return player.cards;
    const lead = trick.leadCard;
    const isLastPlayer = positionInTrick === totalInTrick - 1;
    const samesuit = player.cards.filter((c: Card) => c.suit === lead.suit);
    const higher = samesuit.filter((c: Card) => c.rank > lead.rank);
    const trump = player.cards.filter((c: Card) => c.suit === gs.trumpSuit);
    const leadIsTrump = lead.suit === gs.trumpSuit;
    if (leadIsTrump) {
      if (higher.length > 0) return higher;
      if (samesuit.length > 0) return samesuit;
      return player.cards;
    }
    if (higher.length > 0) return higher;
    if (samesuit.length > 0) return samesuit;
    if (!isLastPlayer && trump.length > 0) return trump;
    return player.cards;
  };

  const botPlay = (
    gs: GameState,
    order: number[],
    idx: number,
    trick: Trick | null,
  ): void => {
    const playerId = order[idx];
    const player = gs.players.find((p: Player) => p.id === playerId)!;
    const legal = legalCards(player, trick, gs, idx, order.length);
    const card = [...legal].sort((a: Card, b: Card) => b.rank - a.rank)[0];
    processPlay(gs, order, idx, trick, card, false);
  };

  const processPlay = (
    gs: GameState,
    order: number[],
    idx: number,
    trick: Trick | null,
    card: Card,
    isMe: boolean,
  ): void => {
    const playerId = order[idx];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === playerId
        ? { ...p, cards: p.cards.filter((c: Card) => c.id !== card.id) }
        : p,
    );
    const newTrick: Trick = trick
      ? { ...trick, plays: [...trick.plays, { playerId, card }] }
      : { leadCard: card, leadPlayer: playerId, plays: [{ playerId, card }] };

    const newGs = { ...gs, players: newPlayers };
    currentTrickRef.current = newTrick;
    setGameSynced(newGs);
    setCurrentTrick(newTrick);
    setSelectedPlay(null);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      setTimeout(() => resolveTrick(newGs, newTrick, order), 600);
      return;
    }

    setCurrentPlayIdxSynced(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === mySlotRef.current) {
      setPhase("playing");
    } else if (slotsRef.current[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botPlay(newGs, order, nextIdx, newTrick), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const handlePlayerPlay = (): void => {
    const gs = gameRef.current;
    if (!gs || !selectedPlay || phase !== "playing") return;
    const legal = legalCards(
      gs.players[mySlotRef.current],
      currentTrickRef.current,
      gs,
      currentPlayIdxRef.current,
      playOrderRef.current.length,
    );
    if (!legal.find((c: Card) => c.id === selectedPlay.id)) {
      setMessage("⚠️ Энэ картыг тоглох боломжгүй!");
      return;
    }
    setMessage("");
    sendWs({
      type: "play_card",
      slotIndex: mySlotRef.current,
      card: selectedPlay,
    });
    processPlay(
      gs,
      playOrderRef.current,
      currentPlayIdxRef.current,
      currentTrickRef.current,
      selectedPlay,
      true,
    );
  };

  // ── Гэрийн хожигч ──────────────────────────────────────────────────────
  const resolveTrick = (gs: GameState, trick: Trick, order: number[]): void => {
    const trumpPlays = trick.plays.filter(
      (p: TrickPlay) => p.card.suit === gs.trumpSuit,
    );
    const leadSuitPlays = trick.plays.filter(
      (p: TrickPlay) => p.card.suit === trick.leadCard.suit,
    );
    const winner: TrickPlay =
      trumpPlays.length > 0
        ? trumpPlays.reduce((best: TrickPlay, cur: TrickPlay) =>
            cur.card.rank > best.card.rank ? cur : best,
          )
        : leadSuitPlays.reduce((best: TrickPlay, cur: TrickPlay) =>
            cur.card.rank > best.card.rank ? cur : best,
          );

    const newPlayers = gs.players.map((p: Player) =>
      p.id === winner.playerId ? { ...p, tricksWon: p.tricksWon + 1 } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);

    const winnerName =
      slotsRef.current[winner.playerId]?.username ??
      PLAYER_LABELS[winner.playerId];
    setMessage(`🏠 ${winnerName} гэр авлаа!`);

    const allEmpty = newGs.players
      .filter((p: Player) => !p.skipped)
      .every((p: Player) => p.cards.length === 0);

    if (allEmpty) {
      setTimeout(() => endRound(newGs), 1000);
    } else {
      setTimeout(() => {
        const newOrder = orderFrom(winner.playerId).filter(
          (pid: number) =>
            !newGs.players.find((p: Player) => p.id === pid)!.skipped,
        );
        setPlayOrderSynced(newOrder);
        setCurrentPlayIdxSynced(0);
        currentTrickRef.current = null;
        setCurrentTrick(null);
        setSelectedPlay(null);

        const first = newOrder[0];
        if (first === mySlotRef.current) {
          setPhase("playing");
        } else if (slotsRef.current[first]?.isBot) {
          setPhase("waitingBot");
          setTimeout(() => botPlay(newGs, newOrder, 0, null), 800);
        } else {
          setPhase("waitingBot");
        }
      }, 1200);
    }
  };

  // ── Тоглолт дуусах ─────────────────────────────────────────────────────
  const endRound = async (gs: GameState): Promise<void> => {
    const tricksWon: Record<string, number> = {};
    gs.players.forEach((p: Player) => {
      if (!p.skipped) tricksWon[String(p.id)] = p.tricksWon;
    });
    sendWs({
      type: "end_round",
      slotIndex: mySlotRef.current, // ← slotIndex нэмсэн
      tricksWon,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xl">
        {wsConnected ? "Тоглоом ачаалж байна..." : "Холбогдож байна..."}
      </div>
    );
  }

  const humanPlayer = game.players[mySlotIndex];
  const isHumanDealer = game.currentPlayer === mySlotIndex;

  const legalNow: Card[] =
    phase === "playing" &&
    currentPlayIdx < playOrder.length &&
    playOrder[currentPlayIdx] === mySlotIndex
      ? legalCards(
          humanPlayer,
          currentTrick,
          game,
          currentPlayIdx,
          playOrder.length,
        )
      : [];
  const legalIds = new Set(legalNow.map((c: Card) => c.id));
  const maxSwapNow = Math.min(game.deck.length, humanPlayer?.cards.length ?? 0);

  const slotLabels =
    slots.length > 0
      ? slots.map((s) => s.username || PLAYER_LABELS[s.slotIndex])
      : PLAYER_LABELS;

  return (
    <div className="relative h-screen w-full bg-slate-900 text-white overflow-hidden select-none">
      <GameHeader game={game} phase={phase} message={message} />
      <PlayerArea
        game={game}
        phase={phase}
        decideOrder={decideOrder}
        decideIdx={decideIdx}
        swapOrder={swapOrder}
        swapIdx={swapIdx}
        playOrder={playOrder}
        currentPlayIdx={currentPlayIdx}
        selectedSwaps={selectedSwaps}
        selectedPlay={selectedPlay}
        legalIds={legalIds}
        mySlotIndex={mySlotIndex}
        slotLabels={slotLabels}
        onToggleSwapCard={toggleSwapCard}
        onSelectPlayCard={(card: Card) => setSelectedPlay(card)}
      />
      <CenterArea game={game} currentTrick={currentTrick} />
      <ActionButtons
        phase={phase}
        decideOrder={decideOrder}
        decideIdx={decideIdx}
        swapOrder={swapOrder}
        swapIdx={swapIdx}
        playOrder={playOrder}
        currentPlayIdx={currentPlayIdx}
        selectedSwaps={selectedSwaps}
        selectedPlay={selectedPlay}
        maxSwapNow={maxSwapNow}
        isHumanDealer={isHumanDealer}
        mySlotIndex={mySlotIndex}
        onJoin={handlePlayerJoin}
        onSwap={handlePlayerSwap}
        onSkipSwap={handleSkipSwap}
        onDealerSwap={handleDealerSwap}
        onDealerSkipSwap={handleDealerSkipSwap}
        onPlay={handlePlayerPlay}
      />
      <ScoreTable players={game.players} slotLabels={slotLabels} />
    </div>
  );
};

export default MultiplayerRoomPage;
