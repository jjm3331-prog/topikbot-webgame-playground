import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

interface TestimonialsSectionProps {
  t: (key: string) => string;
}

export const TestimonialsSection = ({ t }: TestimonialsSectionProps) => {
  const { t: translate } = useTranslation();
  
  const defaultTestimonials = [
    { text: translate("testimonials.default.1.text"), name: translate("testimonials.default.1.name"), period: translate("testimonials.default.1.period"), emoji: "🏆" },
    { text: translate("testimonials.default.2.text"), name: translate("testimonials.default.2.name"), period: translate("testimonials.default.2.period"), emoji: "✍️" },
    { text: translate("testimonials.default.3.text"), name: translate("testimonials.default.3.name"), period: translate("testimonials.default.3.period"), emoji: "🎤" },
    { text: translate("testimonials.default.4.text"), name: translate("testimonials.default.4.name"), period: translate("testimonials.default.4.period"), emoji: "🎬" },
    { text: translate("testimonials.default.5.text"), name: translate("testimonials.default.5.name"), period: translate("testimonials.default.5.period"), emoji: "💼" },
    { text: translate("testimonials.default.6.text"), name: translate("testimonials.default.6.name"), period: translate("testimonials.default.6.period"), emoji: "📚" },
  ];
  
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
