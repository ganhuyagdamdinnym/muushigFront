"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

// ── Component ────────────────────────────────────────────────────────────────

const RoomPage = () => {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [game, setGame] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("waitingBot");

  const [decideOrder, setDecideOrder] = useState<number[]>([]);
  const [decideIdx, setDecideIdx] = useState(0);

  const [swapOrder, setSwapOrder] = useState<number[]>([]);
  const [swapIdx, setSwapIdx] = useState(0);
  const [selectedSwaps, setSelectedSwaps] = useState<Card[]>([]);

  const [currentTrick, setCurrentTrick] = useState<Trick | null>(null);
  const [currentPlayIdx, setCurrentPlayIdx] = useState<number>(0);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<Card | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const mapCard = (cardId: number): Card =>
      (CardsData as Card[]).find((c: Card) => c.id === cardId)!;

    const doFetch = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/room/${id}`);
        const data = await res.json();
        console.log("Fetched room data:", data);
        const round = data.round;
        const dealer: number = round.currentPlayer;

        const players: Player[] = [
          {
            id: 0,
            cards: round.playerCards.map(mapCard),
            score: round.playersPoints.player,
            skipped: false,
            tricksWon: 0,
          },
          {
            id: 1,
            cards: round.bot1Cards.map(mapCard),
            score: round.playersPoints.bot1,
            skipped: false,
            tricksWon: 0,
          },
          {
            id: 2,
            cards: round.bot2Cards.map(mapCard),
            score: round.playersPoints.bot2,
            skipped: false,
            tricksWon: 0,
          },
          {
            id: 3,
            cards: round.bot3Cards.map(mapCard),
            score: round.playersPoints.bot3,
            skipped: false,
            tricksWon: 0,
          },
          {
            id: 4,
            cards: round.bot4Cards.map(mapCard),
            score: round.playersPoints.bot4,
            skipped: false,
            tricksWon: 0,
          },
        ];

        const topCard = mapCard(round.topCard);
        const gs: GameState = {
          players,
          deck: round.remainingCards.map(mapCard),
          topCard,
          currentPlayer: dealer,
          trumpSuit: topCard.suit,
        };

        setGame(gs);

        const order = orderFrom(nextId(dealer));
        setDecideOrder(order);
        setDecideIdx(0);
        setMessage("");

        if (order[0] !== 0) {
          setPhase("waitingBot");
          setTimeout(() => botDecide(gs, order, 0), 800);
        } else {
          setPhase("decide");
        }
      } catch (err) {
        console.error("Fetch room error:", err);
      }
    };

    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Шат 1: Орох/өнжих ───────────────────────────────────────────────────

  const botDecide = (gs: GameState, order: number[], idx: number): void => {
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
    advanceDecide(gs, order, idx, shouldJoin);
  };

  const advanceDecide = (
    gs: GameState,
    order: number[],
    idx: number,
    joining: boolean,
  ): void => {
    const playerId = order[idx];
    const newPlayers = gs.players.map((p: Player) =>
      p.id === playerId ? { ...p, skipped: !joining } : p,
    );
    const newGs = { ...gs, players: newPlayers };
    setGame(newGs);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      startSwapPhase(newGs);
      return;
    }

    setDecideIdx(nextIdx);
    const nextPlayerId = order[nextIdx];

    if (nextPlayerId === 0) {
      setPhase("decide");
    } else {
      setPhase("waitingBot");
      setTimeout(() => botDecide(newGs, order, nextIdx), 800);
    }
  };

  const handlePlayerJoin = (joining: boolean): void => {
    if (!game) return;
    advanceDecide(game, decideOrder, decideIdx, joining);
  };

  // ── Шат 2: Солилцоо ─────────────────────────────────────────────────────

  const startSwapPhase = (gs: GameState): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
    );
    setSwapOrder(entered);
    setSwapIdx(0);
    setSelectedSwaps([]);

    if (entered.length === 0) {
      startDealerSwap(gs);
      return;
    }

    const first = entered[0];
    if (first === 0) {
      setPhase("swap");
    } else {
      setPhase("waitingBot");
      setTimeout(() => botSwap(gs, entered, 0), 800);
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
    setGame(newGs);
    setSelectedSwaps([]);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      startDealerSwap(newGs);
      return;
    }

    setSwapIdx(nextIdx);
    const nextPlayerId = order[nextIdx];

    if (nextPlayerId === 0) {
      setPhase("swap");
    } else {
      setPhase("waitingBot");
      setTimeout(() => botSwap(newGs, order, nextIdx), 800);
    }
  };

  const handlePlayerSwap = (): void => {
    if (!game) return;
    advanceSwap(game, swapOrder, swapIdx, selectedSwaps);
  };

  const handleSkipSwap = (): void => {
    if (!game) return;
    advanceSwap(game, swapOrder, swapIdx, []);
  };

  const toggleSwapCard = (card: Card): void => {
    if (!game) return;
    const maxSwap = Math.min(game.deck.length, game.players[0].cards.length);
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
    if (gs.currentPlayer === 0) {
      setPhase("dealerSwap");
    } else {
      const sorted = [...dealer.cards].sort(
        (a: Card, b: Card) => a.rank - b.rank,
      );
      applyDealerSwap(gs, sorted[0]);
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
    setGame(newGs);
    startPlayPhase(newGs);
  };

  const handleDealerSwap = (card: Card): void => {
    if (!game) return;
    applyDealerSwap(game, card);
  };

  const handleDealerSkipSwap = (): void => {
    if (!game) return;
    startPlayPhase(game);
  };

  // ── Шат 3: Тоглолт ─────────────────────────────────────────────────────

  const startPlayPhase = (gs: GameState): void => {
    const entered = orderFrom(nextId(gs.currentPlayer)).filter(
      (pid) => !gs.players.find((p: Player) => p.id === pid)!.skipped,
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

    if (entered[0] !== 0) {
      setPhase("waitingBot");
      setTimeout(() => botPlay(gs, entered, 0, null), 800);
    } else {
      setPhase("playing");
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
    processPlay(gs, order, idx, trick, card);
  };

  const processPlay = (
    gs: GameState,
    order: number[],
    idx: number,
    trick: Trick | null,
    card: Card,
  ) => {
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
    setGame(newGs);
    setCurrentTrick(newTrick);
    setSelectedPlay(null);

    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      setTimeout(() => resolveTrick(newGs, newTrick, order), 600);
      return;
    }

    setCurrentPlayIdx(nextIdx);
    if (order[nextIdx] === 0) {
      setPhase("playing");
    } else {
      setPhase("waitingBot");
      setTimeout(() => botPlay(newGs, order, nextIdx, newTrick), 800);
    }
  };

  const handlePlayerPlay = (): void => {
    if (!game || !selectedPlay || phase !== "playing") return;
    const legal = legalCards(
      game.players[0],
      currentTrick,
      game,
      currentPlayIdx,
      playOrder.length,
    );
    if (!legal.find((c: Card) => c.id === selectedPlay.id)) {
      setMessage("⚠️ Энэ картыг тоглох боломжгүй!");
      return;
    }
    setMessage("");
    processPlay(game, playOrder, currentPlayIdx, currentTrick, selectedPlay);
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
    setGame(newGs);
    setMessage(`🏠 ${PLAYER_LABELS[winner.playerId]} гэр авлаа!`);

    const allEmpty = newGs.players
      .filter((p: Player) => !p.skipped)
      .every((p: Player) => p.cards.length === 0);

    if (allEmpty) {
      setTimeout(() => endRound(newGs), 1000);
    } else {
      setTimeout(() => {
        const newOrder = orderFrom(winner.playerId).filter(
          (pid) => !newGs.players.find((p: Player) => p.id === pid)!.skipped,
        );
        setPlayOrder(newOrder);
        setCurrentPlayIdx(0);
        setCurrentTrick(null);
        setSelectedPlay(null);

        if (newOrder[0] === 0) {
          setPhase("playing");
        } else {
          setPhase("waitingBot");
          setTimeout(() => botPlay(newGs, newOrder, 0, null), 800);
        }
      }, 1200);
    }
  };

  // ── Тоглолт дуусах ─────────────────────────────────────────────────────

  const endRound = async (gs: GameState): Promise<void> => {
    const playerKeys = ["player", "bot1", "bot2", "bot3", "bot4"];

    // Өнжсөн тоглогчийг илгээхгүй → backend -1 гэж тооцно
    const tricksWon: Record<string, number> = {};
    gs.players.forEach((p: Player, i: number) => {
      if (!p.skipped) {
        tricksWon[playerKeys[i]] = p.tricksWon;
      }
    });

    try {
      const res = await fetch(`http://127.0.0.1:8000/room/${id}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tricksWon),
      });
      const data = await res.json();

      // Тоглоом дууссан
      if (data.status === "finished") {
        const pts: Record<string, number> = data.playersPoints;
        const winnerKey = Object.entries(pts).find(([, v]) => v <= 0)?.[0];
        const winnerLabel = winnerKey
          ? PLAYER_LABELS[playerKeys.indexOf(winnerKey)]
          : "?";
        setMessage(`🎉 ${winnerLabel} тоглоомыг дуусгалаа!`);
        setPhase("playing"); // товч харуулахгүй байх
        return;
      }

      // Шинэ round ирлээ → state-г шинэчил
      const mapCard = (cardId: number): Card =>
        (CardsData as Card[]).find((c: Card) => c.id === cardId)!;

      const round = data.round;
      const dealer: number = round.currentPlayer;

      const players: Player[] = [
        {
          id: 0,
          cards: round.playerCards.map(mapCard),
          score: round.playersPoints.player,
          skipped: false,
          tricksWon: 0,
        },
        {
          id: 1,
          cards: round.bot1Cards.map(mapCard),
          score: round.playersPoints.bot1,
          skipped: false,
          tricksWon: 0,
        },
        {
          id: 2,
          cards: round.bot2Cards.map(mapCard),
          score: round.playersPoints.bot2,
          skipped: false,
          tricksWon: 0,
        },
        {
          id: 3,
          cards: round.bot3Cards.map(mapCard),
          score: round.playersPoints.bot3,
          skipped: false,
          tricksWon: 0,
        },
        {
          id: 4,
          cards: round.bot4Cards.map(mapCard),
          score: round.playersPoints.bot4,
          skipped: false,
          tricksWon: 0,
        },
      ];

      const topCard = mapCard(round.topCard);
      const newGs: GameState = {
        players,
        deck: round.remainingCards.map(mapCard),
        topCard,
        currentPlayer: dealer,
        trumpSuit: topCard.suit,
      };

      setGame(newGs);
      setCurrentTrick(null);
      setSelectedPlay(null);
      setSelectedSwaps([]);

      const order = orderFrom(nextId(dealer));
      setDecideOrder(order);
      setDecideIdx(0);
      setMessage("🔄 Шинэ round эхэллээ!");

      if (order[0] !== 0) {
        setPhase("waitingBot");
        setTimeout(() => botDecide(newGs, order, 0), 800);
      } else {
        setPhase("decide");
      }
    } catch (err) {
      console.error("endRound error:", err);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xl">
        Уншиж байна...
      </div>
    );
  }

  const humanPlayer = game.players[0];
  const isHumanDealer = game.currentPlayer === 0;

  const legalNow: Card[] =
    phase === "playing" &&
    currentPlayIdx < playOrder.length &&
    playOrder[currentPlayIdx] === 0
      ? legalCards(
          humanPlayer,
          currentTrick,
          game,
          currentPlayIdx,
          playOrder.length,
        )
      : [];
  const legalIds = new Set(legalNow.map((c: Card) => c.id));

  const maxSwapNow = Math.min(game.deck.length, humanPlayer.cards.length);

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
        onJoin={handlePlayerJoin}
        onSwap={handlePlayerSwap}
        onSkipSwap={handleSkipSwap}
        onDealerSwap={handleDealerSwap}
        onDealerSkipSwap={handleDealerSkipSwap}
        onPlay={handlePlayerPlay}
      />

      <ScoreTable players={game.players} />
    </div>
  );
};

export default RoomPage;
