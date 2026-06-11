"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = {
  slotIndex: number;
  userId: string | null;
  username: string | null;
  isBot: boolean;
};

type RoomData = {
  roomId: string;
  status: string;
  slots: Slot[]; // ← байгаа
  round?: unknown;
};

type Props = {
  roomId: string;
  userId: string;
  username: string;
};

const WaitingRoom = ({ roomId, userId, username }: Props) => {
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return; // ← userId хоосон байвал WebSocket нээхгүй

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/real_room/${roomId}/ws/${userId}`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setError(""); // холбогдсон бол алдааг арилга
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "room_state") {
        setRoom(msg.data);
      } else if (msg.type === "player_joined" || msg.type === "player_left") {
        fetchRoom();
      } else if (msg.type === "game_started") {
        router.push(`/pages/${roomId}/game`);
      }
    };

    ws.onerror = () => setError("WebSocket холбогдож чадсангүй");

    fetchRoom();

    return () => ws.close();
  }, [roomId, userId]); // ← userId нэмэх

  const fetchRoom = async () => {
    console.log("check id", roomId, userId, username);
    const res = await fetch(`http://127.0.0.1:8000/real_room/${roomId}`);
    const data = await res.json();
    console.log("room data:", data);
    setRoom(data);
    // Тоглоом аль хэдийн эхэлсэн бол шууд шилж
    if (data.status === "playing") {
      router.push(`/pages/${roomId}/game`);
    }
  };

  const handleStart = () => {
    wsRef.current?.send(JSON.stringify({ type: "start_game" }));
  };

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        Уншиж байна...
      </div>
    );
  }

  const humanCount = (room.slots ?? []).filter(
    (s: Slot) => s.userId !== null && !s.isBot,
  ).length;

  const canStart = humanCount >= 2;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h1 className="text-xl font-bold text-green-400 text-center mb-1">
          Муушиг — Хүлээлгийн өрөө
        </h1>
        <p className="text-xs text-slate-400 text-center mb-5">
          Room:{" "}
          <span className="text-slate-300 font-mono">
            {roomId.slice(0, 8)}...
          </span>
        </p>

        {/* Slot-уудын жагсаалт */}
        <div className="flex flex-col gap-2 mb-6">
          {room.slots.map((slot) => (
            <div
              key={slot.slotIndex}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                slot.userId
                  ? "bg-slate-700 border-slate-600"
                  : "bg-slate-800/50 border-dashed border-slate-700"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  slot.userId ? "bg-green-400" : "bg-slate-600"
                }`}
              />
              <span className="text-sm flex-1">
                {slot.userId
                  ? slot.isBot
                    ? `🤖 ${slot.username}`
                    : slot.userId === userId
                      ? `${slot.username} (Та)`
                      : slot.username
                  : "Хүлээж байна..."}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-3">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
          >
            {canStart
              ? `▶ Эхлүүлэх (${humanCount} тоглогч, үлдсэнийг bot орлоно)`
              : "2+ тоглогч хүлээж байна..."}
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          >
            ← Гарах
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
