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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

const MultiplayerRoomPage = ({ roomId, userId }: Props) => {
  const wsRef = useRef<WebSocket | null>(null);
  const gameRef = useRef<GameState | null>(null); // stale closure-оос зайлсхийх

  const [slots, setSlots] = useState<Slot[]>([]);
  const mySlotRef = useRef<number>(0);
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

  // game state-г ref-д хадгалах (timeout callback-уудад хэрэглэнэ)
  const setGameSynced = (gs: GameState) => {
    gameRef.current = gs;
    setGame(gs);
  };

  // ── WebSocket ─────────────────────────────────────────────────────────────

  const sendWs = (msg: object) => {
    wsRef.current?.send(JSON.stringify(msg));
  };

  useEffect(() => {
    const ws = new WebSocket(
      `ws://127.0.0.1:8000/real_room/${roomId}/ws/${userId}`,
    );
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleWsMessage(msg);
    };

    ws.onerror = () => setMessage("⚠️ WebSocket алдаа гарлаа");

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const handleWsMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const type = msg.type as string;

      if (type === "room_state" || type === "game_started") {
        initFromData(msg.data as Record<string, unknown>);
      } else if (type === "player_decided") {
        // Өөр хүний орох/өнжих шийдвэр
        const slotIdx = msg.slotIndex as number;
        const joining = msg.joining as boolean;
        const gs = gameRef.current;
        if (!gs) return;
        const newPlayers = gs.players.map((p: Player) =>
          p.id === slotIdx ? { ...p, skipped: !joining } : p,
        );
        const newGs = { ...gs, players: newPlayers };
        setGameSynced(newGs);

        // Дараагийн алхам руу шилжих
        setDecideIdx((prev) => {
          const nextIdx = prev + 1;
          setDecideOrder((order) => {
            if (nextIdx >= order.length) {
              setTimeout(() => startSwapPhase(newGs), 100);
            } else {
              const nextPid = order[nextIdx];
              const myIdx = slots.findIndex((s) => s.userId === userId);
              if (nextPid === myIdx) {
                setPhase("decide");
              } else if (!slots[nextPid]?.isBot) {
                setPhase("waitingBot"); // өөр хүн шийдэж байна
              } else {
                setPhase("waitingBot");
                setTimeout(() => botDecideFromRef(newGs, order, nextIdx), 800);
              }
            }
            return order;
          });
          return nextIdx;
        });
      } else if (type === "cards_swapped") {
        // Өөр хүн карт сольсон
        const slotIdx = msg.slotIndex as number;
        const count = msg.count as number;
        const gs = gameRef.current;
        if (!gs) return;
        // Deck-ийг багасга (яг ямар карт авснийг мэдэхгүй тул хаяж буй тоогоор)
        const newDeck = gs.deck.slice(count);
        const newPlayers = gs.players.map((p: Player) =>
          p.id === slotIdx
            ? {
                ...p,
                cards: Array(p.cards.length - count + count)
                  .fill(null)
                  .map((_, i) =>
                    i < p.cards.length - count
                      ? p.cards[i]
                      : {
                          id: -1,
                          name: "?",
                          suit: "?",
                          rank: 0,
                          image: "card_back.png",
                        },
                  ),
              }
            : p,
        );
        setGameSynced({ ...gs, deck: newDeck });
        advanceSwapAfterOther(gs, newDeck);
      } else if (type === "card_played") {
        // Өөр хүн карт тоглосон
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

        setCurrentTrick((prev) => {
          const newTrick: Trick = prev
            ? { ...prev, plays: [...prev.plays, { playerId: slotIdx, card }] }
            : {
                leadCard: card,
                leadPlayer: slotIdx,
                plays: [{ playerId: slotIdx, card }],
              };

          setCurrentPlayIdx((pidx) => {
            const nextIdx = pidx + 1;
            setPlayOrder((order) => {
              if (nextIdx >= order.length) {
                setTimeout(() => resolveTrick(newGs, newTrick, order), 600);
              } else {
                setCurrentPlayIdx(nextIdx);
                const nextPid = order[nextIdx];
                const myIdx = slots.findIndex((s) => s.userId === userId);
                if (nextPid === myIdx) {
                  setPhase("playing");
                } else if (slots[nextPid]?.isBot) {
                  setPhase("waitingBot");
                  setTimeout(
                    () => botPlay(newGs, order, nextIdx, newTrick),
                    800,
                  );
                } else {
                  setPhase("waitingBot");
                }
              }
              return order;
            });
            return nextIdx;
          });
          return newTrick;
        });

        setGameSynced(newGs);
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
    },
    [slots, userId],
  );

  // ── Room data → GameState ─────────────────────────────────────────────────

  const initFromData = (data: Record<string, unknown>) => {
    const slotsData = data.slots as Slot[];
    setSlots(slotsData);

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
    setCurrentTrick(null);
    setSelectedPlay(null);
    setSelectedSwaps([]);

    const order = orderFrom(nextId(dealer));
    setDecideOrder(order);
    setDecideIdx(0);
    setMessage("");

    const firstPid = order[0];
    if (firstPid === myActualIdx) {
      setPhase("decide");
    } else if (slotsData[firstPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botDecide(gs, order, 0, slotsData, myActualIdx), 800);
    } else {
      setPhase("waitingBot"); // өөр хүн шийдэнэ
    }
  };

  // ── Bot helper (ref-ээс авна) ─────────────────────────────────────────────

  const botDecideFromRef = (gs: GameState, order: number[], idx: number) => {
    botDecide(gs, order, idx, slots, mySlotIndex);
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

    setDecideIdx(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === myIdx) {
      setPhase("decide");
    } else if (slotsData[nextPid]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botDecide(newGs, order, nextIdx, slotsData, myIdx), 800);
    } else {
      setPhase("waitingBot"); // өөр хүний ээлж
    }
  };

  const handlePlayerJoin = (joining: boolean): void => {
    const gs = gameRef.current;
    if (!gs) return;
    // WebSocket-ээр бусдад мэдэгд
    sendWs({ type: "decide", slotIndex: mySlotIndex, joining });
    advanceDecide(gs, decideOrder, decideIdx, joining, slots, mySlotIndex);
  };

  // ── Шат 2: Солилцоо ─────────────────────────────────────────────────────

  const startSwapPhase = (gs: GameState): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid: number) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
    );
    setSwapOrder(entered);
    setSwapIdx(0);
    setSelectedSwaps([]);

    if (entered.length === 0) {
      startDealerSwap(gs);
      return;
    }

    const first = entered[0];
    if (first === mySlotIndex) {
      setPhase("swap");
    } else if (slots[first]?.isBot) {
      setPhase("waitingBot");
      setTimeout(() => botSwap(gs, entered, 0), 800);
    } else {
      setPhase("waitingBot");
    }
  };

  const advanceSwapAfterOther = (gs: GameState, newDeck: Card[]) => {
    const newGs = { ...gs, deck: newDeck };
    setSwapIdx((prev) => {
      const nextIdx = prev + 1;
      setSwapOrder((order) => {
        if (nextIdx >= order.length) {
          setTimeout(() => startDealerSwap(newGs), 100);
        } else {
          const nextPid = order[nextIdx];
          if (nextPid === mySlotIndex) {
            setPhase("swap");
          } else if (slots[nextPid]?.isBot) {
            setPhase("waitingBot");
            setTimeout(() => botSwap(newGs, order, nextIdx), 800);
          } else {
            setPhase("waitingBot");
          }
        }
        return order;
      });
      return nextIdx;
    });
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

    setSwapIdx(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === mySlotIndex) {
      setPhase("swap");
    } else if (slots[nextPid]?.isBot) {
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
      slotIndex: mySlotIndex,
      count: selectedSwaps.length,
    });
    advanceSwap(gs, swapOrder, swapIdx, selectedSwaps);
  };

  const handleSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotIndex, count: 0 });
    advanceSwap(gs, swapOrder, swapIdx, []);
  };

  const toggleSwapCard = (card: Card): void => {
    const gs = gameRef.current;
    if (!gs) return;
    const maxSwap = Math.min(
      gs.deck.length,
      gs.players[mySlotIndex].cards.length,
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
    if (gs.currentPlayer === mySlotIndex) {
      setPhase("dealerSwap");
    } else if (slots[gs.currentPlayer]?.isBot) {
      const sorted = [...dealer.cards].sort(
        (a: Card, b: Card) => a.rank - b.rank,
      );
      applyDealerSwap(gs, sorted[0]);
    }
    // else: өөр хүн dealer → WS-ээр мэдэгдэнэ
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
    sendWs({ type: "swap_cards", slotIndex: mySlotIndex, count: 1 });
    applyDealerSwap(gs, card);
  };

  const handleDealerSkipSwap = (): void => {
    const gs = gameRef.current;
    if (!gs) return;
    sendWs({ type: "swap_cards", slotIndex: mySlotIndex, count: 0 });
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

    setPlayOrder(entered);
    setCurrentPlayIdx(0);
    setCurrentTrick(null);
    setSelectedPlay(null);
    setMessage("");

    const first = entered[0];
    if (first === mySlotIndex) {
      setPhase("playing");
    } else if (slots[first]?.isBot) {
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
    setGameSynced(newGs);
    setCurrentTrick(newTrick);
    setSelectedPlay(null);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      setTimeout(() => resolveTrick(newGs, newTrick, order), 600);
      return;
    }

    setCurrentPlayIdx(nextIdx);
    const nextPid = order[nextIdx];

    if (nextPid === mySlotIndex) {
      setPhase("playing");
    } else if (slots[nextPid]?.isBot) {
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
      gs.players[mySlotIndex],
      currentTrick,
      gs,
      currentPlayIdx,
      playOrder.length,
    );
    if (!legal.find((c: Card) => c.id === selectedPlay.id)) {
      setMessage("⚠️ Энэ картыг тоглох боломжгүй!");
      return;
    }
    setMessage("");
    sendWs({ type: "play_card", slotIndex: mySlotIndex, card: selectedPlay });
    processPlay(
      gs,
      playOrder,
      currentPlayIdx,
      currentTrick,
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
      slots[winner.playerId]?.username ?? PLAYER_LABELS[winner.playerId];
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
        setPlayOrder(newOrder);
        setCurrentPlayIdx(0);
        setCurrentTrick(null);
        setSelectedPlay(null);

        const first = newOrder[0];
        if (first === mySlotIndex) {
          setPhase("playing");
        } else if (slots[first]?.isBot) {
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
      if (!p.skipped) {
        tricksWon[String(p.id)] = p.tricksWon;
      }
    });

    // Зөвхөн mySlotIndex === dealer+1 (эхний тоглогч) broadcast хийнэ
    // Хялбар болгохын тулд бүгд илгээнэ — backend давхардалтай байсан ч сүүлчийн нь хүчинтэй
    sendWs({ type: "end_round", tricksWon });
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xl">
        Уншиж байна...
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

  // PLAYER_LABELS-ийг slot username-ээр дарж бичих
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
