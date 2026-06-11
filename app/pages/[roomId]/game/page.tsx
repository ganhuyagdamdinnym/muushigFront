"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MultiplayerRoomPage from "../../components/MultiplayerRoompage";

export default function GamePage() {
  const params = useParams();
  const roomId = Array.isArray(params.roomId)
    ? params.roomId[0]
    : (params.roomId as string);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    setUserId(id ?? "");
  }, []);

  if (userId === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xl">
        Уншиж байна...
      </div>
    );
  }

  return <MultiplayerRoomPage roomId={roomId} userId={userId} />;
}
