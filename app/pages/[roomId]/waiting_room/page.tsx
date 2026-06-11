"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WaitingRoom from "../../components/Waiting_room";

export default function WaitingRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [userId, setUserId] = useState<string | null>(null); // null = loading
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    const name = localStorage.getItem("username") || "Тоглогч";
    setUserId(id ?? "");
    setUsername(name);
  }, []);

  // userId null байхад (loading) render хийхгүй
  if (userId === null)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        Уншиж байна...
      </div>
    );

  return <WaitingRoom roomId={roomId} userId={userId} username={username} />;
}
