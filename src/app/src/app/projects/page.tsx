"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { VideoCard } from "@/components/home/video-card";
import { Folder } from "lucide-react";

export default function ProjectsPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnails, setThumbnails] = useState([
    { id: "1", title: "Gaming Moments", thumbnailUrl: "https://picsum.photos/seed/1/640/360", resolution: "1280x720", dateAdded: "2 days ago" }
  ]);
  const { toast } = useToast();
  const router = useRouter();

  const handleAdd = () => {
    toast({ title: "Feature coming soon", description: "This will add a new video to your projects." });
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-4">
            <Folder className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">My Projects</h1>
        </div>
        <div className="flex gap-2 max-w-xl">
          <Input placeholder="Paste YouTube link" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          <Button onClick={handleAdd}>ADD</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {thumbnails.map(t => (
            <VideoCard key={t.id} {...t} onEdit={(id, url) => router.push(`/?videoId=${id}&thumbnailUrl=${url}`)} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
