import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import mammoth from "mammoth";

interface DocumentUploaderProps {
  onUploadComplete: () => void;
}

interface FileUploadStatus {
  file: File;
  status: "pending" | "processing" | "success" | "error";
  progress: number;
  message?: string;
  chunksCreated?: number;
}

const SUPPORTED_EXTENSIONS = [".md", ".txt", ".docx", ".doc", ".html", ".json", ".csv", ".xml", ".rtf", ".odt"];

const DocumentUploader = ({ onUploadComplete }: DocumentUploaderProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);

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
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
    return nameWithoutExt.replace(/[_-]/g, " ").trim();
  };

  const updateFileStatus = (index: number, updates: Partial<FileUploadStatus>) => {
    setUploadStatuses(prev => 
      prev.map((status, i) => i === index ? { ...status, ...updates } : status)
    );
  };

  const processFile = async (
    file: File, 
    index: number, 
    session: { access_token: string }
  ): Promise<boolean> => {
    try {
      updateFileStatus(index, { status: "processing", progress: 10, message: "파일 읽는 중..." });

      const content = await extractTextFromFile(file);
      
      if (!content.trim()) {
        throw new Error("파일 내용이 비어있습니다.");
      }

      updateFileStatus(index, { progress: 30, message: "임베딩 처리 중..." });

      const title = getTitleFromFilename(file.name);
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

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

      updateFileStatus(index, { progress: 80 });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "업로드 실패");
      }

      updateFileStatus(index, { 
        status: "success", 
        progress: 100, 
        message: `${result.chunks_created}개 청크 생성`,
        chunksCreated: result.chunks_created 
      });

      return true;
    } catch (error: any) {
      console.error(`Upload error for ${file.name}:`, error);
      updateFileStatus(index, { 
        status: "error", 
        progress: 0, 
        message: error.message 
      });
      return false;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    // Initialize statuses
    const initialStatuses: FileUploadStatus[] = selectedFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setUploadStatuses(initialStatuses);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("로그인이 필요합니다.");
      }

      // Process all files concurrently
      const results = await Promise.all(
        selectedFiles.map((file, index) => processFile(file, index, session))
      );

      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: "업로드 완료",
          description: failCount > 0 
            ? `${successCount}개 성공, ${failCount}개 실패` 
            : `${successCount}개 문서가 성공적으로 임베딩되었습니다.`,
        });
        onUploadComplete();
      }

      if (failCount > 0 && successCount === 0) {
        toast({
          title: "업로드 실패",
          description: "모든 파일 업로드에 실패했습니다.",
          variant: "destructive",
        });
      }

      // Clear successful files after 2 seconds
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadStatuses([]);
      }, 2000);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    validateAndAddFiles(files);
    // Reset input value so same files can be selected again
    e.target.value = "";
  };

  const validateAndAddFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        errors.push(`${file.name}: 지원하지 않는 형식`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: 파일 크기 초과 (최대 10MB)`);
        continue;
      }

      // Check for duplicates
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: 이미 추가됨`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      toast({
        title: "일부 파일 제외됨",
        description: errors.slice(0, 3).join("\n") + (errors.length > 3 ? `\n외 ${errors.length - 3}개` : ""),
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: FileUploadStatus["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          문서 업로드
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          여러 파일을 드래그하거나 선택하세요. 파일명이 자동으로 제목이 됩니다.
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
            multiple
          />
          
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          
          <p className="text-lg font-medium mb-2">
            문서 파일을 드래그하거나 클릭하여 선택
          </p>
          
          <p className="text-sm text-muted-foreground">
            지원 형식: {SUPPORTED_EXTENSIONS.join(", ")} (PDF 제외)
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            여러 파일 동시 선택 가능
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-sm font-medium text-muted-foreground">
              선택된 파일: {selectedFiles.length}개
            </p>
            {selectedFiles.map((file, index) => {
              const status = uploadStatuses[index];
              return (
                <div 
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {status ? getStatusIcon(status.status) : <FileText className="w-5 h-5 text-primary" />}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      {status?.message && (
                        <span className={`text-xs ${status.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                          • {status.message}
                        </span>
                      )}
                    </div>
                    {status?.status === "processing" && (
                      <Progress value={status.progress} className="h-1 mt-1" />
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {selectedFiles.length}개 파일 처리 중...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {selectedFiles.length > 0 
                ? `${selectedFiles.length}개 파일 업로드 및 임베딩`
                : "파일 업로드 및 임베딩"
              }
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocumentUploader;
