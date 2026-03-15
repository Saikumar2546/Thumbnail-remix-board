"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { ThumbnailExtractor } from "@/components/editor/thumbnail-extractor";
import { ThumbnailEditor } from "@/components/editor/thumbnail-editor";

export default function HomePage() {
  const [currentEditingThumbnail, setCurrentEditingThumbnail] = useState<string | null>(null);
  const [currentEditingVideoId, setCurrentEditingVideoId] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const videoId = searchParams.get('videoId');
    const thumbnailUrl = searchParams.get('thumbnailUrl');

    if (videoId && thumbnailUrl) {
      setCurrentEditingThumbnail(thumbnailUrl);
      setCurrentEditingVideoId(videoId);
      toast({
        title: "Thumbnail Loaded",
        description: `Now editing thumbnail for video ID: ${videoId}`,
      });
    }
  }, [searchParams, toast, router]);

  const handleThumbnailExtracted = (thumbnailUrl: string, videoId: string) => {
    setCurrentEditingThumbnail(thumbnailUrl);
    setCurrentEditingVideoId(videoId);
    toast({ title: "Thumbnail Ready", description: "You can now edit the thumbnail." });
  };
  
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Thumbnail Editor</h1>
        <div className="space-y-6">
            <ThumbnailExtractor onThumbnailExtracted={handleThumbnailExtracted} />
            <ThumbnailEditor 
              baseThumbnailUrl={currentEditingThumbnail}
              videoId={currentEditingVideoId}
            />
          </div>
      </div>
    </AppLayout>
  );
}
