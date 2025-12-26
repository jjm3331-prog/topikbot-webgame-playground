import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Star, Edit, X, Save } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const TestimonialsManager = () => {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New testimonial form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(5);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRating, setEditRating] = useState(5);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Load testimonials error:", error);
      toast({
        title: "로드 실패",
        description: "후기를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestimonial = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast({
        title: "입력 오류",
        description: "이름과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const maxOrder = testimonials.reduce((max, t) => Math.max(max, t.display_order), 0);
      
      const { error } = await supabase.from("testimonials").insert({
        name: newName.trim(),
        role: newRole.trim() || null,
        content: newContent.trim(),
        rating: newRating,
        display_order: maxOrder + 1,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "후기 추가 완료",
        description: "새로운 후기가 추가되었습니다.",
      });

      setNewName("");
      setNewRole("");
      setNewContent("");
      setNewRating(5);
      setShowAddForm(false);
      await loadTestimonials();
    } catch (error: any) {
      console.error("Add testimonial error:", error);
      toast({
        title: "추가 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: isActive } : t))
      );

      toast({
        title: isActive ? "활성화됨" : "비활성화됨",
        description: `후기가 ${isActive ? "활성화" : "비활성화"}되었습니다.`,
      });
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast({
        title: "변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 후기를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);

      if (error) throw error;

      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "삭제 완료",
        description: "후기가 삭제되었습니다.",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setEditName(testimonial.name);
    setEditRole(testimonial.role || "");
    setEditContent(testimonial.content);
    setEditRating(testimonial.rating);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editContent.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({
          name: editName.trim(),
          role: editRole.trim() || null,
          content: editContent.trim(),
          rating: editRating,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "수정 완료",
        description: "후기가 수정되었습니다.",
      });

      setEditingId(null);
      await loadTestimonials();
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "수정 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">랜딩 페이지 후기 관리</h3>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "outline" : "default"}
          size="sm"
        >
          {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showAddForm ? "취소" : "후기 추가"}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 후기 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>이름 *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: TOPIK 6급 합격자"
                />
              </div>
              <div>
                <Label>역할/기간</Label>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="예: 8개월 학습"
                />
              </div>
            </div>
            <div>
              <Label>후기 내용 *</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="후기 내용을 입력하세요..."
                rows={3}
              />
            </div>
            <div>
              <Label>별점</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= newRating
                          ? "fill-korean-yellow text-korean-yellow"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddTestimonial} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              추가하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Testimonials List */}
      <div className="space-y-3">
        {testimonials.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            등록된 후기가 없습니다. 새 후기를 추가해보세요.
          </p>
        ) : (
          testimonials.map((testimonial) => (
            <Card key={testimonial.id} className={!testimonial.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                {editingId === testimonial.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="이름"
                      />
                      <Input
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="역할/기간"
                      />
                    </div>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                    />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= editRating
                                ? "fill-korean-yellow text-korean-yellow"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{testimonial.name}</span>
                        {testimonial.role && (
                          <span className="text-xs text-muted-foreground">
                            ({testimonial.role})
                          </span>
                        )}
                        <div className="flex items-center gap-0.5">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-korean-yellow text-korean-yellow"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        "{testimonial.content}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={testimonial.is_active}
                        onCheckedChange={(checked) => handleToggleActive(testimonial.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(testimonial)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(testimonial.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TestimonialsManager;
