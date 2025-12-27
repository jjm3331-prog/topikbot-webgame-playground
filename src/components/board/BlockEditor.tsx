import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Plus, Type, Quote, List, Minus, Image, Youtube, 
  Trash2, GripVertical, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type BlockType = 'text' | 'heading' | 'quote' | 'list' | 'divider' | 'image' | 'youtube';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: {
    level?: number; // for heading
    imageSize?: 'small' | 'medium' | 'large';
    imageAlign?: 'left' | 'center' | 'right';
    items?: string[]; // for list
  };
}

interface BlockEditorProps {
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
  userId: string | null;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function BlockEditor({ blocks, setBlocks, userId }: BlockEditorProps) {
  const { t } = useTranslation();
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBlockInsertIndex, setPendingBlockInsertIndex] = useState<number | null>(null);

  const blockTypes: { type: BlockType; icon: React.ReactNode; label: string }[] = [
    { type: 'text', icon: <Type className="w-5 h-5" />, label: t("blockEditor.text") || "텍스트" },
    { type: 'heading', icon: <span className="font-bold text-lg">H</span>, label: t("blockEditor.heading") || "제목" },
    { type: 'quote', icon: <Quote className="w-5 h-5" />, label: t("blockEditor.quote") || "인용" },
    { type: 'list', icon: <List className="w-5 h-5" />, label: t("blockEditor.list") || "목록" },
    { type: 'divider', icon: <Minus className="w-5 h-5" />, label: t("blockEditor.divider") || "구분선" },
    { type: 'image', icon: <Image className="w-5 h-5" />, label: t("blockEditor.image") || "이미지" },
    { type: 'youtube', icon: <Youtube className="w-5 h-5" />, label: "YouTube" },
  ];

  const addBlock = (type: BlockType, afterIndex: number) => {
    const newBlock: Block = {
      id: generateId(),
      type,
      content: '',
      meta: type === 'list' ? { items: [''] } : type === 'heading' ? { level: 2 } : type === 'image' ? { imageSize: 'large', imageAlign: 'center' } : undefined
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    setShowAddMenu(null);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      toast({ title: t("blockEditor.minOneBlock") || "최소 1개 블록 필요" });
      return;
    }
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: t("blockEditor.onlyImages") || "이미지만 가능", variant: "destructive" });
      return;
    }

    setUploadingBlockId(blockId);
    
    try {
      const ext = file.type.split('/')[1] || 'png';
      const fileName = `${userId}/${Date.now()}_block.${ext}`;
      
      const { error } = await supabase.storage
        .from("board-attachments")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("board-attachments")
        .getPublicUrl(fileName);

      updateBlock(blockId, { content: urlData.publicUrl });
      toast({ title: t("blockEditor.imageUploaded") || "이미지 업로드 완료" });
    } catch (err) {
      console.error(err);
      toast({ title: t("blockEditor.uploadFailed") || "업로드 실패", variant: "destructive" });
    } finally {
      setUploadingBlockId(null);
      e.target.value = '';
    }
  };

  const renderBlockContent = (block: Block) => {
    switch (block.type) {
      case 'text':
        return (
          <Textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder={t("blockEditor.textPlaceholder") || "텍스트를 입력하세요..."}
            className="min-h-[150px] resize-y border-none focus-visible:ring-0 bg-transparent text-base leading-relaxed"
          />
        );

      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3].map(level => (
                <Button
                  key={level}
                  type="button"
                  variant={block.meta?.level === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateBlock(block.id, { meta: { ...block.meta, level } })}
                >
                  H{level}
                </Button>
              ))}
            </div>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder={t("blockEditor.headingPlaceholder") || "제목 입력..."}
              className={`border-none focus-visible:ring-0 bg-transparent font-bold ${
                block.meta?.level === 1 ? 'text-3xl' : block.meta?.level === 2 ? 'text-2xl' : 'text-xl'
              }`}
            />
          </div>
        );

      case 'quote':
        return (
          <div className="border-l-4 border-primary pl-4">
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder={t("blockEditor.quotePlaceholder") || "인용문 입력..."}
              className="min-h-[80px] resize-none border-none focus-visible:ring-0 bg-transparent italic text-muted-foreground"
            />
          </div>
        );

      case 'list':
        const items = block.meta?.items || [''];
        return (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = e.target.value;
                    updateBlock(block.id, { meta: { ...block.meta, items: newItems } });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newItems = [...items];
                      newItems.splice(idx + 1, 0, '');
                      updateBlock(block.id, { meta: { ...block.meta, items: newItems } });
                    }
                    if (e.key === 'Backspace' && item === '' && items.length > 1) {
                      e.preventDefault();
                      const newItems = items.filter((_, i) => i !== idx);
                      updateBlock(block.id, { meta: { ...block.meta, items: newItems } });
                    }
                  }}
                  placeholder={t("blockEditor.listItemPlaceholder") || "항목 입력..."}
                  className="border-none focus-visible:ring-0 bg-transparent"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateBlock(block.id, { meta: { ...block.meta, items: [...items, ''] } })}
              className="text-muted-foreground"
            >
              <Plus className="w-4 h-4 mr-1" /> {t("blockEditor.addItem") || "항목 추가"}
            </Button>
          </div>
        );

      case 'divider':
        return <hr className="border-border my-4" />;

      case 'image':
        return (
          <div className="space-y-3">
            {block.content ? (
              <>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map(size => (
                      <Button
                        key={size}
                        type="button"
                        variant={block.meta?.imageSize === size ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateBlock(block.id, { meta: { ...block.meta, imageSize: size } })}
                      >
                        {size === 'small' ? '작게' : size === 'medium' ? '중간' : '크게'}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={block.meta?.imageAlign === 'left' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateBlock(block.id, { meta: { ...block.meta, imageAlign: 'left' } })}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={block.meta?.imageAlign === 'center' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateBlock(block.id, { meta: { ...block.meta, imageAlign: 'center' } })}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={block.meta?.imageAlign === 'right' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateBlock(block.id, { meta: { ...block.meta, imageAlign: 'right' } })}
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className={`flex ${
                  block.meta?.imageAlign === 'left' ? 'justify-start' : 
                  block.meta?.imageAlign === 'right' ? 'justify-end' : 'justify-center'
                }`}>
                  <img 
                    src={block.content} 
                    alt="uploaded" 
                    className={`rounded-lg ${
                      block.meta?.imageSize === 'small' ? 'max-w-[300px]' : 
                      block.meta?.imageSize === 'medium' ? 'max-w-[500px]' : 'max-w-full'
                    }`}
                  />
                </div>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
                {uploadingBlockId === block.id ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                ) : (
                  <>
                    <Image className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground text-sm">{t("blockEditor.clickToUpload") || "클릭하여 이미지 업로드"}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, block.id)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-3">
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder={t("blockEditor.youtubePlaceholder") || "YouTube URL 입력..."}
              className="bg-transparent"
            />
            {block.content && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black/10">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(block.content)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
    return match?.[1] || '';
  };

  return (
    <div className="space-y-2">
      {/* Initial add button if no blocks */}
      {blocks.length === 0 && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed py-8"
            onClick={() => setShowAddMenu('initial')}
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("blockEditor.addFirstBlock") || "첫 번째 블록 추가"}
          </Button>
          {showAddMenu === 'initial' && (
            <BlockTypeMenu
              blockTypes={blockTypes}
              onSelect={(type) => {
                addBlock(type, -1);
              }}
              onClose={() => setShowAddMenu(null)}
            />
          )}
        </div>
      )}

      {/* Block list */}
      <Reorder.Group values={blocks} onReorder={setBlocks} className="space-y-3">
        {blocks.map((block, index) => (
          <Reorder.Item
            key={block.id}
            value={block}
            className="relative group"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
            >
              {/* Block toolbar */}
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Block actions */}
              <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBlock(block.id, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBlock(block.id, 'down')}
                  disabled={index === blocks.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteBlock(block.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Block type label */}
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {blockTypes.find(bt => bt.type === block.type)?.label}
              </div>

              {/* Block content */}
              {renderBlockContent(block)}
            </motion.div>

            {/* Add block button between blocks */}
            <div className="relative h-0 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -bottom-4 z-10 h-8 w-8 rounded-full bg-background border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => setShowAddMenu(block.id)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              {showAddMenu === block.id && (
                <BlockTypeMenu
                  blockTypes={blockTypes}
                  onSelect={(type) => addBlock(type, index)}
                  onClose={() => setShowAddMenu(null)}
                />
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// Block type selection menu
function BlockTypeMenu({ 
  blockTypes, 
  onSelect, 
  onClose 
}: { 
  blockTypes: { type: BlockType; icon: React.ReactNode; label: string }[];
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-2xl p-3 min-w-[280px]"
      >
        <p className="text-xs text-muted-foreground mb-2 px-2">{t("blockEditor.selectBlockType") || "블록 유형 선택"}</p>
        <div className="grid grid-cols-3 gap-2">
          {blockTypes.map(({ type, icon, label }) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className="flex flex-col items-center gap-1.5 h-auto py-3 hover:bg-primary/10"
              onClick={() => onSelect(type)}
            >
              {icon}
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// Utility function to convert blocks to HTML
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'text':
        return `<p>${block.content.replace(/\n/g, '<br/>')}</p>`;
      case 'heading':
        const level = block.meta?.level || 2;
        return `<h${level}>${block.content}</h${level}>`;
      case 'quote':
        return `<blockquote>${block.content}</blockquote>`;
      case 'list':
        const items = block.meta?.items || [];
        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      case 'divider':
        return '<hr/>';
      case 'image':
        const size = block.meta?.imageSize === 'small' ? 'max-width:300px' : 
                     block.meta?.imageSize === 'medium' ? 'max-width:500px' : 'max-width:100%';
        const align = block.meta?.imageAlign === 'left' ? 'margin-right:auto' : 
                      block.meta?.imageAlign === 'right' ? 'margin-left:auto' : 'margin:0 auto';
        return `<img src="${block.content}" alt="image" style="${size};${align};display:block;border-radius:8px;margin-top:8px;margin-bottom:8px;"/>`;
      case 'youtube':
        const videoId = block.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/)?.[1];
        return videoId ? `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>` : '';
      default:
        return '';
    }
  }).join('\n');
}

// Utility function to parse HTML back to blocks (for editing existing posts)
export function htmlToBlocks(html: string): Block[] {
  if (!html) return [{ id: generateId(), type: 'text', content: '' }];
  
  // Simple parsing - just create a text block for now
  // More sophisticated parsing could be added later
  return [{ id: generateId(), type: 'text', content: html.replace(/<[^>]*>/g, '') }];
}