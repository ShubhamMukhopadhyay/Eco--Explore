import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles, MapPin } from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import beach from "@/assets/gem-beach.jpg";
import beach3 from "@/assets/gem-beach3.jpg";
import cafe2 from "@/assets/gem-cafe2.jpg";
import heritage2 from "@/assets/gem-heritage2.jpg";
import waterfall from "@/assets/gem-waterfall.jpg";
import feast from "@/assets/gem-feast.jpg";

export const Route = createFileRoute("/gems")({
  head: () => ({
    meta: [
      { title: "Hidden Gems of Goa — EcoExplore" },
      { name: "description", content: "Quiet beaches, family-run cafés, heritage corners and nature spots loved by locals." },
    ],
  }),
  component: Gems,
});

const gems = [
  { img: beach, title: "Cola Beach Lagoon", area: "Canacona", tags: ["Beach", "Quiet"], story: "A freshwater lagoon meets the Arabian Sea. Stay in a beach tent and watch fireflies." },
  { img: cafe2, title: "For The Record · Vinyl Bar", area: "Assagao", tags: ["Café", "Music"], story: "House in a Portuguese mansion. Records, sourdough, and a courtyard you'll never want to leave." },
  { img: heritage2, title: "Reis Magos Fort", area: "Bardez", tags: ["Heritage", "View"], story: "Lovingly restored 16th-century fort with the best view of Panjim across the river." },
  { img: waterfall, title: "Tambdi Surla Trail", area: "Mollem", tags: ["Nature", "Hike"], story: "Tucked behind India's oldest temple, a moss-soft trail to a hidden cascade." },
  { img: beach3, title: "Galgibaga (Turtle) Beach", area: "Galgibaga", tags: ["Beach", "Wildlife"], story: "Olive Ridley turtles nest here. Walk barefoot, leave nothing behind." },
  { img: feast, title: "Sunday Sao Joao Feast", area: "Siolim", tags: ["Culture", "Food"], story: "A village feast of sorpotel, vindaloo and feni. Open-house, like Goa was made for." },
];

function Gems() {
  const [expandedGem, setExpandedGem] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-12 pb-20">
      <SectionHeader
        eyebrow="Off the radar"
        title="The Goa locals keep to themselves."
        subtitle="Curated by residents, ranked by quietness, scored by the AI for low impact."
      />

      <div className="mt-10 inline-flex items-center gap-2 bg-eco/15 text-eco rounded-full px-4 py-2 text-sm font-medium">
        <Sparkles className="size-4" /> All spots verified low-impact this week
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {gems.map((g, i) => (
          <motion.button
            key={g.title}
            type="button"
            aria-expanded={expandedGem === g.title}
            aria-controls={`gem-story-${i}`}
            onClick={() => setExpandedGem(expandedGem === g.title ? null : g.title)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: (i % 3) * 0.08 }}
            className="group relative w-full overflow-hidden rounded-3xl border border-border/60 bg-card text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <div className="relative aspect-[5/6] overflow-hidden">
              <img src={g.img} alt={g.title} loading="lazy" className="size-full object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-background">
                <div className="flex gap-1.5 mb-3">
                  {g.tags.map(t => <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/15 backdrop-blur">{t}</span>)}
                </div>
                <h3 className="font-display text-2xl leading-tight">{g.title}</h3>
                <p className="text-xs opacity-80 flex items-center gap-1 mt-1"><MapPin className="size-3" />{g.area}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium opacity-85">
                  {expandedGem === g.title ? "Show less" : "Tap to learn more"}
                  <ChevronDown className={`size-3.5 transition-transform ${expandedGem === g.title ? "rotate-180" : ""}`} />
                </span>
                <AnimatePresence initial={false}>
                  {expandedGem === g.title && (
                    <motion.p
                      id={`gem-story-${i}`}
                      initial={{ height: 0, opacity: 0, y: 6 }}
                      animate={{ height: "auto", opacity: 0.9, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden text-sm"
                    >
                      <span className="block pt-2">{g.story}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
