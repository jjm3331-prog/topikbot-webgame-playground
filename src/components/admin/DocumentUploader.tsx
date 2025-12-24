import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";

interface DocumentUploaderProps {
  onUploadComplete: () => void;
}

const SUPPORTED_EXTENSIONS = [".md", ".txt", ".docx", ".doc", ".html", ".json", ".csv", ".xml", ".rtf", ".odt"];

const DocumentUploader = ({ onUploadComplete }: DocumentUploaderProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState("");

  const extractTextFromFile = async (file: File): Promise<string> => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    
    // Text-based files
    if ([".md", ".txt", ".html", ".json", ".csv", ".xml"].includes(extension)) {
      return await file.text();
    }
    
    // DOCX files - use mammoth
    if (extension === ".docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    
    // DOC, RTF, ODT - try as text (may not work perfectly)
    if ([".doc", ".rtf", ".odt"].includes(extension)) {
      try {
        // Try mammoth first for .doc
        if (extension === ".doc") {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        }
        return await file.text();
      } catch {
        throw new Error(`${extension} 파일 형식은 완벽하게 지원되지 않습니다. .docx 또는 .txt로 변환해주세요.`);
      }
    }
    
    throw new Error(`지원하지 않는 파일 형식입니다: ${extension}`);
  };

  const getTitleFromFilename = (filename: string): string => {
    // Remove extension and clean up
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
    // Replace underscores and hyphens with spaces
    return nameWithoutExt.replace(/[_-]/g, " ").trim();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProcessingStatus("파일 읽는 중...");

    try {
      // Extract text content
      const content = await extractTextFromFile(selectedFile);
      
      if (!content.trim()) {
        throw new Error("파일 내용이 비어있습니다.");
      }

      const title = getTitleFromFilename(selectedFile.name);
      const extension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf("."));

      setProcessingStatus("임베딩 처리 중...");

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("로그인이 필요합니다.");
      }

      // Upload to RAG embed endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-embed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title,
            content,
            file_type: extension.replace(".", ""),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "업로드 실패");
      }

      toast({
        title: "업로드 성공",
        description: `"${title}" 문서가 ${result.chunks_created}개의 청크로 임베딩되었습니다.`,
      });

      setSelectedFile(null);
      onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProcessingStatus("");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      toast({
        title: "지원하지 않는 형식",
        description: `지원 형식: ${SUPPORTED_EXTENSIONS.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "최대 10MB까지 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          문서 업로드
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          파일을 드래그하거나 선택하세요. 파일명이 자동으로 제목이 됩니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${isDragging 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
            }
          `}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          
          <p className="text-lg font-medium mb-2">
            문서 파일을 드래그하거나 클릭하여 선택
          </p>
          
          <p className="text-sm text-muted-foreground">
            지원 형식: {SUPPORTED_EXTENSIONS.join(", ")} (PDF 제외)
          </p>
        </div>

        {/* Selected File */}
        {selectedFile && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {processingStatus || "처리 중..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              파일 업로드 및 임베딩
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocumentUploader;
