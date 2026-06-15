"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CardsData from "../../assistent/cards.json";
import {
  Card,
  GameState,
  Phase,
  Player,
  Trick,
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

  // ── Ref+State хамт тохируулах хэрэгслүүд ────────────────────────────────
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

  const sendWs = (msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  // ── Дараагийн тоглогч хэн болохыг шийдэж phase тохируулах ──────────────
  // isHuman=true бол хүлээх, bot бол автоматаар, өөрөө бол идэвхтэй phase
  const resolveNextDecide = (
    gs: GameState,
    ord: number[],
    nextIdx: number,
    slotsData: Slot[],
    myIdx: number,
  ) => {
    if (nextIdx >= ord.length) {
      startSwapPhase(gs, slotsData, myIdx);
      return;
    }
    setDecideIdxSynced(nextIdx);
    const nextPid = ord[nextIdx];
    if (nextPid === myIdx) {
      setPhase("decide");
    } else if (slotsData[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botDecide(gs, ord, nextIdx, slotsData, myIdx), 800);
    } else {
      // Өөр хүн тоглогч — зүгээр хүлээнэ
      setPhase("waitingBot");
    }
  };

  const resolveNextSwap = (
    gs: GameState,
    ord: number[],
    nextIdx: number,
    slotsData: Slot[],
    myIdx: number,
  ) => {
    if (nextIdx >= ord.length) {
      startDealerSwap(gs, slotsData, myIdx);
      return;
    }
    setSwapIdxSynced(nextIdx);
    const nextPid = ord[nextIdx];
    if (nextPid === myIdx) {
      setPhase("swap");
    } else if (slotsData[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botSwap(gs, ord, nextIdx, slotsData, myIdx), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const resolveNextPlay = (
    gs: GameState,
    ord: number[],
    nextIdx: number,
    trick: Trick,
    slotsData: Slot[],
    myIdx: number,
  ) => {
    if (nextIdx >= ord.length) {
      setTimeout(() => resolveTrick(gs, trick, ord, slotsData, myIdx), 600);
      return;
    }
    setCurrentPlayIdxSynced(nextIdx);
    const nextPid = ord[nextIdx];
    if (nextPid === myIdx) {
      setPhase("playing");
    } else if (slotsData[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botPlay(gs, ord, nextIdx, trick, slotsData, myIdx), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  // ── WebSocket ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !roomId || !WS_URL) return;
    let isMounted = true;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/real_room/${roomId}/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          setWsConnected(true);
          setMessage("");
        }
      };
      ws.onmessage = (e) => {
        if (isMounted) handleWsMessage(JSON.parse(e.data));
      };
      ws.onerror = () => {
        if (isMounted) {
          setWsConnected(false);
          setMessage("⚠️ WebSocket алдаа");
        }
      };
      ws.onclose = (e) => {
        if (!isMounted) return;
        setWsConnected(false);
        if (e.code !== 1000)
          setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
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

  // ── WS мессеж боловсруулах ───────────────────────────────────────────────
  // ГҮЙЦЭТГЭЛ: WS message ирэхэд зөвхөн state шинэчлэх.
  // Дараагийн хүн тоглогч бол phase="waitingBot" (хүлээх),
  // bot бол автоматаар, өөрөө бол идэвхтэй phase.
  const handleWsMessage = useCallback((msg: Record<string, unknown>) => {
    const type = msg.type as string;
    const gs = gameRef.current;
    const slotsData = slotsRef.current;
    const myIdx = mySlotRef.current;

    if (type === "room_state" || type === "game_started") {
      initFromData(msg.data as Record<string, unknown>);
    } else if (type === "player_decided") {
      if (!gs) return;
      const slotIdx = msg.slotIndex as number;
      const joining = msg.joining as boolean;

      // Өөрийн болон bot-ын шийдвэр local-д аль хэдийн тооцсон тул WS echo-г үл тооцно
      // Зөвхөн өөр хүн тоглогчийн мессежийг боловсруулна
      if (slotIdx === myIdx || slotsData[slotIdx]?.isBot) return;

      const newPlayers = gs.players.map((p: Player) =>
        p.id === slotIdx ? { ...p, skipped: !joining } : p,
      );
      const newGs = { ...gs, players: newPlayers };
      setGameSynced(newGs);

      const ord = decideOrderRef.current;
      const curIdx = ord.indexOf(slotIdx);
      resolveNextDecide(newGs, ord, curIdx + 1, slotsData, myIdx);
    } else if (type === "cards_swapped") {
      if (!gs) return;
      const count = msg.count as number;
      const slotIdx = msg.slotIndex as number;

      // Зөвхөн өөр хүн тоглогчийн swap мессежийг боловсруулна
      if (slotIdx === myIdx || slotsData[slotIdx]?.isBot) return;

      const newDeck = gs.deck.slice(count);
      const newGs = { ...gs, deck: newDeck };
      setGameSynced(newGs);

      const swapOrd = swapOrderRef.current;
      const curIdx = swapOrd.indexOf(slotIdx);
      resolveNextSwap(newGs, swapOrd, curIdx + 1, slotsData, myIdx);
    } else if (type === "card_played") {
      if (!gs) return;
      const slotIdx = msg.slotIndex as number;
      const card = msg.card as Card;

      // Зөвхөн өөр хүн тоглогчийн карт тоглосон мессежийг боловсруулна
      if (slotIdx === myIdx || slotsData[slotIdx]?.isBot) return;

      const newPlayers = gs.players.map((p: Player) =>
        p.id === slotIdx
          ? { ...p, cards: p.cards.filter((c: Card) => c.id !== card.id) }
          : p,
      );
      const newGs = { ...gs, players: newPlayers };

      const prevTrick = currentTrickRef.current;
      const newTrick: Trick = prevTrick
        ? {
            ...prevTrick,
            plays: [...prevTrick.plays, { playerId: slotIdx, card }],
          }
        : {
            leadCard: card,
            leadPlayer: slotIdx,
            plays: [{ playerId: slotIdx, card }],
          };

      currentTrickRef.current = newTrick;
      setCurrentTrick(newTrick);
      setGameSynced(newGs);

      const playOrd = playOrderRef.current;
      const curIdx = playOrd.indexOf(slotIdx);
      resolveNextPlay(newGs, playOrd, curIdx + 1, newTrick, slotsData, myIdx);
    } else if (type === "round_ended") {
      const data = msg.data as Record<string, unknown>;
      if ((data.status as string) === "finished") {
        setMessage("🎉 Тоглоом дууслаа!");
        setPhase("playing");
      } else {
        initFromData(data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Тоглоом эхлүүлэх ────────────────────────────────────────────────────
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

    resolveNextDecide(gs, order, 0, slotsData, myActualIdx);
  };

  // ── 1-р шат: Орох/өнжих ─────────────────────────────────────────────────
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

    // Bot-ын шийдвэрийг WS-ээр илгээнэ
    sendWs({ type: "decide", slotIndex: playerId, joining: shouldJoin });

    const newPlayers = gs.players.map((p: Player) =>
      p.id === playerId ? { ...p, skipped: !shouldJoin } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);
    resolveNextDecide(newGs, order, idx + 1, slotsData, myIdx);
  };

  const handlePlayerJoin = (joining: boolean): void => {
    const gs = gameRef.current;
    if (!gs) return;
    const ord = decideOrderRef.current;
    const idx = decideIdxRef.current;
    const myIdx = mySlotRef.current;
    const slotsData = slotsRef.current;

    sendWs({ type: "decide", slotIndex: myIdx, joining });

    const newPlayers = gs.players.map((p: Player) =>
      p.id === myIdx ? { ...p, skipped: !joining } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);
    resolveNextDecide(newGs, ord, idx + 1, slotsData, myIdx);
  };

  // ── 2-р шат: Солилцоо ────────────────────────────────────────────────────
  const startSwapPhase = (
    gs: GameState,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid: number) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
    );
    setSwapOrderSynced(entered);
    setSwapIdxSynced(0);
    setSelectedSwaps([]);

    if (entered.length === 0) {
      startDealerSwap(gs, slotsData, myIdx);
      return;
    }
    resolveNextSwap(gs, entered, 0, slotsData, myIdx);
  };

  const botSwap = (
    gs: GameState,
    order: number[],
    idx: number,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const playerId = order[idx];
    const player = gs.players.find((p: Player) => p.id === playerId)!;
    const maxSwap = Math.min(gs.deck.length, player.cards.length);

    let toDiscard: Card[] = [];
    if (maxSwap > 0) {
      const sorted = [...player.cards]
        .filter((c: Card) => c.suit !== gs.trumpSuit)
        .sort((a, b) => a.rank - b.rank);
      const swapCount = Math.min(
        Math.floor(Math.random() * Math.min(sorted.length, maxSwap)) + 1,
        maxSwap,
      );
      toDiscard = sorted.slice(0, swapCount);
    }

    sendWs({
      type: "swap_cards",
      slotIndex: playerId,
      count: toDiscard.length,
    });

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
    resolveNextSwap(newGs, order, idx + 1, slotsData, myIdx);
  };

  const handlePlayerSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    const ord = swapOrderRef.current;
    const idx = swapIdxRef.current;
    const myIdx = mySlotRef.current;
    const slotsData = slotsRef.current;

    sendWs({
      type: "swap_cards",
      slotIndex: myIdx,
      count: selectedSwaps.length,
    });

    const drawn = gs.deck.slice(0, selectedSwaps.length);
    const remainingDeck = gs.deck.slice(selectedSwaps.length);
    const discardIds = selectedSwaps.map((c: Card) => c.id);
    const newHand = [
      ...gs.players[myIdx].cards.filter(
        (c: Card) => !discardIds.includes(c.id),
      ),
      ...drawn,
    ];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === myIdx ? { ...p, cards: newHand } : p,
    );
    const newGs = { ...gs, players: newPlayers, deck: remainingDeck };
    setGameSynced(newGs);
    setSelectedSwaps([]);
    resolveNextSwap(newGs, ord, idx + 1, slotsData, myIdx);
  };

  const handleSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotRef.current, count: 0 });
    resolveNextSwap(
      gs,
      swapOrderRef.current,
      swapIdxRef.current + 1,
      slotsRef.current,
      mySlotRef.current,
    );
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

  // ── Dealer онцгой эрх ────────────────────────────────────────────────────
  const startDealerSwap = (
    gs: GameState,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const dealer = gs.players.find((p: Player) => p.id === gs.currentPlayer)!;
    if (dealer.skipped) {
      startPlayPhase(gs, slotsData, myIdx);
      return;
    }
    if (gs.currentPlayer === myIdx) {
      setPhase("dealerSwap");
    } else if (slotsData[gs.currentPlayer]?.isBot) {
      const sorted = [...dealer.cards].sort((a, b) => a.rank - b.rank);
      sendWs({ type: "swap_cards", slotIndex: gs.currentPlayer, count: 1 });
      const newHand = [
        ...dealer.cards.filter((c: Card) => c.id !== sorted[0].id),
        gs.topCard,
      ];
      const newPlayers = gs.players.map((p: Player) =>
        p.id === gs.currentPlayer ? { ...p, cards: newHand } : p,
      );
      const newGs = { ...gs, players: newPlayers };
      setGameSynced(newGs);
      startPlayPhase(newGs, slotsData, myIdx);
    } else {
      // Dealer нь өөр хүн тоглогч — хүлээнэ
      setPhase("waitingBot");
    }
  };

  const handleDealerSwap = (card: Card): void => {
    const gs = gameRef.current;
    if (!gs) return;
    const myIdx = mySlotRef.current;
    const slotsData = slotsRef.current;

    sendWs({ type: "swap_cards", slotIndex: myIdx, count: 1 });

    const newHand = [
      ...gs.players[myIdx].cards.filter((c: Card) => c.id !== card.id),
      gs.topCard,
    ];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === myIdx ? { ...p, cards: newHand } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);
    startPlayPhase(newGs, slotsData, myIdx);
  };

  const handleDealerSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotRef.current, count: 0 });
    startPlayPhase(gs, slotsRef.current, mySlotRef.current);
  };

  // ── 3-р шат: Тоглолт ─────────────────────────────────────────────────────
  const startPlayPhase = (
    gs: GameState,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
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

    resolveNextPlay(gs, entered, 0, null as unknown as Trick, slotsData, myIdx);
  };

  const legalCards = (
    player: Player,
    trick: Trick | null,
    gs: GameState,
    pos: number,
    total: number,
  ): Card[] => {
    if (!trick) return player.cards;
    const lead = trick.leadCard;
    const isLast = pos === total - 1;
    const same = player.cards.filter((c) => c.suit === lead.suit);
    const higher = same.filter((c) => c.rank > lead.rank);
    const trump = player.cards.filter((c) => c.suit === gs.trumpSuit);
    if (lead.suit === gs.trumpSuit) {
      if (higher.length > 0) return higher;
      if (same.length > 0) return same;
      return player.cards;
    }
    if (higher.length > 0) return higher;
    if (same.length > 0) return same;
    if (!isLast && trump.length > 0) return trump;
    return player.cards;
  };

  const botPlay = (
    gs: GameState,
    order: number[],
    idx: number,
    trick: Trick | null,
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const playerId = order[idx];
    const player = gs.players.find((p) => p.id === playerId)!;
    const legal = legalCards(player, trick, gs, idx, order.length);
    const card = [...legal].sort((a, b) => b.rank - a.rank)[0];

    sendWs({ type: "play_card", slotIndex: playerId, card });

    const newPlayers = gs.players.map((p) =>
      p.id === playerId
        ? { ...p, cards: p.cards.filter((c) => c.id !== card.id) }
        : p,
    );
    const newTrick: Trick = trick
      ? { ...trick, plays: [...trick.plays, { playerId, card }] }
      : { leadCard: card, leadPlayer: playerId, plays: [{ playerId, card }] };

    const newGs = { ...gs, players: newPlayers };
    currentTrickRef.current = newTrick;
    setGameSynced(newGs);
    setCurrentTrick(newTrick);

    resolveNextPlay(newGs, order, idx + 1, newTrick, slotsData, myIdx);
  };

  const handlePlayerPlay = (): void => {
    const gs = gameRef.current;
    if (!gs || !selectedPlay || phase !== "playing") return;
    const myIdx = mySlotRef.current;
    const slotsData = slotsRef.current;
    const ord = playOrderRef.current;
    const idx = currentPlayIdxRef.current;
    const trick = currentTrickRef.current;

    const legal = legalCards(gs.players[myIdx], trick, gs, idx, ord.length);
    if (!legal.find((c) => c.id === selectedPlay.id)) {
      setMessage("⚠️ Энэ картыг тоглох боломжгүй!");
      return;
    }
    setMessage("");
    sendWs({ type: "play_card", slotIndex: myIdx, card: selectedPlay });

    const newPlayers = gs.players.map((p) =>
      p.id === myIdx
        ? { ...p, cards: p.cards.filter((c) => c.id !== selectedPlay.id) }
        : p,
    );
    const newTrick: Trick = trick
      ? {
          ...trick,
          plays: [...trick.plays, { playerId: myIdx, card: selectedPlay }],
        }
      : {
          leadCard: selectedPlay,
          leadPlayer: myIdx,
          plays: [{ playerId: myIdx, card: selectedPlay }],
        };

    const newGs = { ...gs, players: newPlayers };
    currentTrickRef.current = newTrick;
    setGameSynced(newGs);
    setCurrentTrick(newTrick);
    setSelectedPlay(null);

    resolveNextPlay(newGs, ord, idx + 1, newTrick, slotsData, myIdx);
  };

  // ── Гэрийн хожигч ────────────────────────────────────────────────────────
  const resolveTrick = (
    gs: GameState,
    trick: Trick,
    order: number[],
    slotsData: Slot[],
    myIdx: number,
  ): void => {
    const trumpPlays = trick.plays.filter((p) => p.card.suit === gs.trumpSuit);
    const leadPlays = trick.plays.filter(
      (p) => p.card.suit === trick.leadCard.suit,
    );
    const winner =
      trumpPlays.length > 0
        ? trumpPlays.reduce((b, c) => (c.card.rank > b.card.rank ? c : b))
        : leadPlays.reduce((b, c) => (c.card.rank > b.card.rank ? c : b));

    const newPlayers = gs.players.map((p) =>
      p.id === winner.playerId ? { ...p, tricksWon: p.tricksWon + 1 } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGameSynced(newGs);

    const winnerName =
      slotsData[winner.playerId]?.username ?? PLAYER_LABELS[winner.playerId];
    setMessage(`🏠 ${winnerName} гэр авлаа!`);

    const allEmpty = newGs.players
      .filter((p) => !p.skipped)
      .every((p) => p.cards.length === 0);

    if (allEmpty) {
      setTimeout(() => endRound(newGs), 1000);
    } else {
      setTimeout(() => {
        const newOrder = orderFrom(winner.playerId).filter(
          (pid) => !newGs.players.find((p) => p.id === pid)!.skipped,
        );
        setPlayOrderSynced(newOrder);
        setCurrentPlayIdxSynced(0);
        currentTrickRef.current = null;
        setCurrentTrick(null);
        setSelectedPlay(null);
        resolveNextPlay(
          newGs,
          newOrder,
          0,
          null as unknown as Trick,
          slotsData,
          myIdx,
        );
      }, 1200);
    }
  };

  const endRound = async (gs: GameState): Promise<void> => {
    const tricksWon: Record<string, number> = {};
    gs.players.forEach((p) => {
      if (!p.skipped) tricksWon[String(p.id)] = p.tricksWon;
    });
    sendWs({ type: "end_round", slotIndex: mySlotRef.current, tricksWon });
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
  const legalIds = new Set(legalNow.map((c) => c.id));
  const maxSwapNow = Math.min(game.deck.length, humanPlayer?.cards.length ?? 0);
  const slotLabels =
    slots.length > 0
      ? slots.map((s) => s.username || PLAYER_LABELS[s.slotIndex])
      : Array.from({ length: 5 }, (_, i) => PLAYER_LABELS[i]);

  return (
    <div className="relative h-[100dvh] w-full bg-slate-900 text-white overflow-hidden select-none">
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
        onSelectPlayCard={(card) => setSelectedPlay(card)}
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
