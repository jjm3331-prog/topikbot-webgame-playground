import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
  avatar_url: string | null;
  display_order: number;
}

const defaultTestimonials = [
  { text: "Từ zero tiếng Hàn, mình đậu TOPIK 6 trong 8 tháng! Game AI giúp học ngữ pháp tự nhiên.", name: "TOPIK 6", period: "8 tháng", emoji: "🏆" },
  { text: "AI chấm Writing chi tiết hơn giáo viên thật. Điểm Writing tăng từ 30 lên 70!", name: "TOPIK 5", period: "6 tháng", emoji: "✍️" },
  { text: "Luyện Speaking với AI mỗi ngày, phát âm chuẩn bản xứ. Phỏng vấn việc làm thành công!", name: "Nhân viên Samsung", period: "1 năm", emoji: "🎤" },
  { text: "K-Drama dubbing giúp học ngữ điệu tự nhiên. Nghe hiểu phim Hàn không cần phụ đề!", name: "TOPIK 4", period: "5 tháng", emoji: "🎬" },
  { text: "Headhunting service tuyệt vời! Được tư vấn CV miễn phí và có việc làm tại Hàn Quốc.", name: "Kỹ sư IT Seoul", period: "3 tháng", emoji: "💼" },
  { text: "10,000+ tài liệu TOPIK thực sự khác biệt. Đề thi sát với đề thật nhất!", name: "TOPIK 6", period: "10 tháng", emoji: "📚" },
];

interface TestimonialsSectionProps {
  t: (key: string) => string;
}

export const TestimonialsSection = ({ t }: TestimonialsSectionProps) => {
  const { data: dbTestimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const hasDbTestimonials = dbTestimonials && dbTestimonials.length > 0;
  
  // Build testimonials array - use DB if available, otherwise fallback to defaults
  const testimonials = hasDbTestimonials
    ? dbTestimonials.map((t) => ({
        text: t.content,
        name: t.name,
        period: t.role || "",
        emoji: "⭐",
        rating: t.rating,
      }))
    : defaultTestimonials.map((t) => ({ ...t, rating: 5 }));

  // Duplicate for seamless loop
  const allTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="py-10 sm:py-16 px-4 sm:px-6 bg-muted/30 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
            {t("landing.testimonials.title")} <span className="text-gradient-primary">LUKATO</span>
          </h2>
        </motion.div>
        
        {/* Sliding testimonials container */}
        <div className="relative">
          <motion.div
            animate={{ x: [0, -1200, 0] }}
            transition={{ 
              duration: 30, 
              repeat: Infinity, 
              ease: "linear"
            }}
            className="flex gap-4"
          >
            {allTestimonials.map((testimonial, i) => (
              <div 
                key={i}
                className="premium-card p-4 sm:p-5 min-w-[280px] sm:min-w-[350px] flex-shrink-0"
              >
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 sm:w-4 sm:h-4 fill-korean-yellow text-korean-yellow" />
                  ))}
                </div>
                <p className="text-foreground text-xs sm:text-sm mb-4 leading-relaxed text-center">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center text-sm sm:text-lg">
                    {testimonial.emoji}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground text-xs sm:text-sm">{testimonial.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{testimonial.period}</div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
