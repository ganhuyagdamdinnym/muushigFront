"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RoomInfo = {
  roomId: string;
  playerCount: number;
  players: string[];
};

export function ButtonDemo() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchRooms = () => {
      fetch(`${API_URL}/real_room/list`)
        .then((r) => r.json())
        .then(setRooms)
        .catch(() => {});
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/room/create`, { method: "POST" });
      const data = await res.json();
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      console.error("Room create error:", err);
    }
  };

  const handleCreateMultiplayerRoom = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const username = localStorage.getItem("username") || "Тоглогч";
      if (!userId) {
        router.push("/pages/login");
        return;
      }

      const res = await fetch(`${API_URL}/real_room/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      });
      const data = await res.json();
      router.push(`/pages/${data.roomId}/waiting_room`);
    } catch (err) {
      console.error("Multiplayer room create error:", err);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const userId = localStorage.getItem("user_id");
      const username = localStorage.getItem("username") || "Тоглогч";
      if (!userId) {
        router.push("/pages/login");
        return;
      }

      await fetch(`${API_URL}/real_room/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      });
      router.push(`/pages/${roomId}/waiting_room`);
    } catch (err) {
      console.error("Join room error:", err);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Bot-той тоглох */}
      <Button
        onClick={handleCreateRoom}
        className="w-full text-sm font-normal bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 transition-colors py-2.5 px-4 rounded-xl h-auto"
      >
        Тоглоом эхлүүлэх (Bot-той)
      </Button>

      {/* Шинэ multiplayer өрөө */}
      <button
        onClick={handleCreateMultiplayerRoom}
        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white font-medium text-sm rounded-xl transition-colors border border-slate-700/50 touch-manipulation"
      >
        + Шинэ өрөө үүсгэх
      </button>

      {/* Байгаа өрөөнүүд */}
      {rooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 text-center">
            Нэгдэж болох өрөөнүүд
          </p>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-0.5">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                onClick={() => handleJoinRoom(room.roomId)}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-sm rounded-xl transition-colors border border-slate-600/50 flex items-center justify-between gap-2 touch-manipulation"
              >
                <span className="truncate text-left">
                  {room.players.join(", ")}
                </span>
                <span className="text-slate-400 text-xs shrink-0">
                  {room.playerCount}/5
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
