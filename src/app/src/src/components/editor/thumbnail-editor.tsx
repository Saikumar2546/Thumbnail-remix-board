"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Wand2, Loader2, Scissors, RotateCcw, TextSelect, ImageIcon, Landmark, FlipHorizontal, FlipVertical, Blend, FileText, Edit, Copy, Layers, Replace, ImagePlus, MessageSquareQuote, SmilePlus, SparklesIcon, Palette, Ratio, TextCursorInput, BotMessageSquare, Settings2, PlusCircle, LayoutTemplate, Shapes, Image as LucideImage, Move, Star, Filter, Type, Palette as PaletteIcon, ScissorsIcon, Film } from "lucide-react";
import { PhotoUploadTool } from "@/components/editor-tools/photo-upload-tool";
import { TextTool } from "@/components/editor-tools/text-tool";
import { ImageTransformTool } from "@/components/editor-tools/image-transform-tool";
import { TextPropertiesTool } from "@/components/editor-tools/text-properties-tool";
import { ImagePropertiesTool } from "@/components/editor-tools/image-properties-tool";
import { ImageContextualToolbar } from "@/components/editor-tools/image-contextual-toolbar";
import { TextContextualToolbar } from "@/components/editor-tools/text-contextual-toolbar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { extractThumbnailText, type ExtractedTextElement } from "@/ai/flows/extract-thumbnail-text-flow";
import { removeBackgroundImage } from "@/ai/flows/remove-background-flow";
import { extractBackgroundImage } from "@/ai/flows/extract-background-flow";
import { generateTextSuggestions } from "@/ai/flows/ai-text-suggestions-flow";
import { getFontPairingRecommendations } from "@/ai/flows/ai-font-pairing-flow";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ThumbnailEditorProps {
  baseThumbnailUrl: string | null;
  videoId: string | null;
}

export interface OverlayText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  rotation: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  fillType: 'color' | 'texture' | 'gradient';
  textureUrl?: string;
  textureRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y' | 'space' | 'round';
  textureSize?: string;
  textShadow?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundGradient?: string;
  mixBlendMode?: string;
  neonEffect?: { color: string; intensity: number }; 
  glitchEffect?: boolean; 
}

export interface EditableImageOverlay {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  originalMimeType?: string; 
  opacity: number;
  scaleX: 1 | -1; 
  scaleY: 1 | -1; 
  isLocked: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  dropShadow?: string; 
  gradientOverlay?: string; 
  mixBlendMode?: string; 
  filter?: string; 
}

const CANVAS_REFERENCE_WIDTH = 1280; 
const MAX_CANVAS_WIDTH = 1024; 
const AI_IMAGE_MAX_DIMENSION = 512; 

async function imageUrlToDataUri(url: string): Promise<{dataUri: string, mimeType: string}> {
  const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({dataUri: reader.result as string, mimeType});
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImageForAI(dataUri: string, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUri;
  });
}

export function ThumbnailEditor({ baseThumbnailUrl, videoId }: ThumbnailEditorProps) {
  const [editableImageOverlay, setEditableImageOverlay] = useState<EditableImageOverlay | null>(null);
  const [textOverlays, setTextOverlays] = useState<OverlayText[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isExtractingBackground, setIsExtractingBackground] = useState(false);
  const [isGeneratingTextSuggestions, setIsGeneratingTextSuggestions] = useState(false);
  const [isFontPairingInProgress, setIsFontPairingInProgress] = useState(false);
  const [showAspectRatioGuides, setShowAspectRatioGuides] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null); 
  const canvasContainerRef = useRef<HTMLDivElement>(null); 
  const draggedItemRef = useRef<{id: string, type: 'text' | 'image', offsetX: number, offsetY: number} | null>(null);
  const fontImportInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const aspectRatio = 16 / 9;
    const observer = new ResizeObserver(entries => {
        if (entries?.[0]?.contentRect) {
            const containerWidth = entries[0].contentRect.width;
            let newWidth = Math.min(MAX_CANVAS_WIDTH, Math.max(containerWidth, 300));
            setCanvasSize({ width: newWidth, height: newWidth / aspectRatio });
        }
    });
    if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const autoLoadBaseThumbnail = async () => {
      if (baseThumbnailUrl && canvasSize.width > 0) {
        try {
          const { dataUri, mimeType } = await imageUrlToDataUri(baseThumbnailUrl);
          setEditableImageOverlay({
            id: `img-base-${videoId}`,
            url: dataUri,
            x: 0, y: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            rotation: 0,
            originalMimeType: mimeType,
            opacity: 1, scaleX: 1, scaleY: 1,
            isLocked: true,
            brightness: 1, contrast: 1, saturation: 1, temperature: 0,
            mixBlendMode: 'normal',
          });
        } catch (e) {
          toast({ title: "Error Loading Image", variant: "destructive" });
        }
      }
    };
    autoLoadBaseThumbnail();
  }, [baseThumbnailUrl, videoId, canvasSize.width, canvasSize.height, toast]);

  const handleAddText = (text: string) => {
    const newText: OverlayText = {
      id: `text-${Date.now()}`,
      content: text,
      x: 40, y: 40, fontSize: 48,
      color: "#FFFFFF", fontFamily: "Impact",
      rotation: 0, fontWeight: 'bold', fontStyle: 'normal',
      textDecoration: 'none', textAlign: 'center',
      letterSpacing: 0, lineHeight: 1.2, opacity: 1,
      fillType: 'color', mixBlendMode: 'normal',
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedOverlayId(newText.id);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'text' | 'image') => {
    const target = document.getElementById(id);
    if (target && canvasRef.current) {
        const rect = target.getBoundingClientRect();
        draggedItemRef.current = { id, type, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canvasRef.current || !draggedItemRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - draggedItemRef.current.offsetX;
    const y = e.clientY - rect.top - draggedItemRef.current.offsetY;

    if (draggedItemRef.current.type === 'text') {
      const id = draggedItemRef.current.id;
      setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, x: (x / canvasSize.width) * 100, y: (y / canvasSize.height) * 100 } : t));
    } else {
      setEditableImageOverlay(prev => prev ? { ...prev, x, y } : null);
    }
    draggedItemRef.current = null;
  };

  const getPixelX = (p: number) => (p / 100) * canvasSize.width;
  const getPixelY = (p: number) => (p / 100) * canvasSize.height;
  const getPixelFontSize = (f: number) => f * (canvasSize.width / CANVAS_REFERENCE_WIDTH);

  return (
    <Card className="w-full shadow-xl bg-card">
      <CardHeader className="border-b">
        <CardTitle>Thumbnail Editor</CardTitle>
        <CardDescription>Use AI and manual tools to design your thumbnail.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row p-0 min-h-[700px]">
        <div className="w-full md:w-[320px] border-r bg-background">
          <Tabs defaultValue="add">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger value="add"><PlusCircle className="h-4 w-4"/></TabsTrigger>
              <TabsTrigger value="properties"><Settings2 className="h-4 w-4"/></TabsTrigger>
              <TabsTrigger value="ai-magic"><Wand2 className="h-4 w-4"/></TabsTrigger>
              <TabsTrigger value="canvas"><LayoutTemplate className="h-4 w-4"/></TabsTrigger>
            </TabsList>
            <TabsContent value="add" className="p-4 space-y-4">
              <PhotoUploadTool onPhotoUploaded={(url) => setEditableImageOverlay(prev => prev ? {...prev, url} : null)}/>
              <TextTool onAddText={handleAddText} />
            </TabsContent>
            <TabsContent value="properties" className="p-4">
               <p className="text-sm text-muted-foreground">Select an element to see properties.</p>
            </TabsContent>
            <TabsContent value="ai-magic" className="p-4 space-y-2">
              <Button onClick={() => setIsExtractingText(true)} variant="outline" className="w-full justify-start">
                <TextSelect className="mr-2 h-4 w-4"/> AI Extract Text
              </Button>
              <Button onClick={() => setIsRemovingBackground(true)} variant="outline" className="w-full justify-start">
                <Scissors className="mr-2 h-4 w-4"/> AI BG Remover
              </Button>
            </TabsContent>
          </Tabs>
        </div>
        <div ref={canvasContainerRef} className="flex-grow flex flex-col items-center justify-center p-6 bg-muted/20">
          <div
            ref={canvasRef}
            className="relative bg-black shadow-2xl overflow-hidden"
            style={{ width: canvasSize.width, height: canvasSize.height }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {editableImageOverlay && (
              <div
                id={editableImageOverlay.id}
                style={{
                  position: 'absolute',
                  left: editableImageOverlay.x,
                  top: editableImageOverlay.y,
                  width: editableImageOverlay.width,
                  height: editableImageOverlay.height,
                  opacity: editableImageOverlay.opacity,
                }}
                draggable={!editableImageOverlay.isLocked}
                onDragStart={e => handleDragStart(e, editableImageOverlay.id, 'image')}
              >
                <Image src={editableImageOverlay.url} alt="Base" fill className="object-contain" />
              </div>
            )}
            {textOverlays.map(text => (
              <div
                key={text.id}
                id={text.id}
                style={{
                  position: 'absolute',
                  left: getPixelX(text.x),
                  top: getPixelY(text.y),
                  fontSize: getPixelFontSize(text.fontSize),
                  color: text.color,
                  fontFamily: text.fontFamily,
                  fontWeight: text.fontWeight,
                  lineHeight: text.lineHeight,
                }}
                draggable="true"
                onDragStart={e => handleDragStart(e, text.id, 'text')}
                className="cursor-move select-none"
              >
                {text.content}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
