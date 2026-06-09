import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Database,
  Send,
  UserCircle,
  Filter,
  LayoutDashboard,
  RefreshCw,
  Lock,
  Container,
  CheckCircle2,
  Clock,
  ChevronDown,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Constantes de marque ───────────────────────────────────────────────────

const ORANGE = "#FC7E34"
const NAVY = "#253550"
const DARK = "#000401"
const OFFWHITE = "#F9F7F6"
const REPO = "https://github.com/BUT-MMI-Beziers/optout-mmi3-2526"

const heading = { fontFamily: "'Squada One', sans-serif" } as const

// ─── Animations réutilisables ─────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" },
} as const

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
}

// ─── Logo GitHub inline ───────────────────────────────────────────────────────

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.6-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

function WindowDots() {
  return (
    <>
      <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
      <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
      <span className="w-3 h-3 rounded-full bg-[#28c840]" />
    </>
  )
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  center?: boolean
}) {
  return (
    <motion.div {...fadeUp} className={center ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ORANGE }}>
        {eyebrow}
      </p>
      <h2 className="mt-2 text-4xl md:text-5xl font-bold uppercase tracking-wide" style={{ ...heading, color: DARK }}>
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-muted-foreground leading-relaxed">{subtitle}</p> : null}
    </motion.div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Comment ça marche", href: "#etapes" },
  { label: "Brokers", href: "#features" },
  { label: "Documentation", href: REPO + "#readme", external: true },
  { label: "Github", href: REPO, external: true },
]

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center gap-6">
        <a href="#top" className="text-2xl font-bold tracking-wide" style={{ ...heading, color: ORANGE }}>
          FLOAT
        </a>

        <nav className="hidden md:flex items-center gap-6 ml-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noreferrer" : undefined}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────

const TRUST = [
  { icon: ShieldCheck, label: "RGPD · Art. 17" },
  { icon: Lock, label: "Chiffré AES-256" },
  { icon: GithubMark, label: "Open source AGPL-3.0" },
  { icon: Container, label: "Docker · 1 commande" },
]

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(252,126,52,0.07), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black, transparent 65%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 65%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-5 md:px-8 pt-24 pb-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-5xl md:text-[5.25rem] font-bold uppercase tracking-wide leading-[0.92]"
          style={{ ...heading, color: DARK }}
        >
          Vos données,
          <br />
          <span style={{ color: ORANGE }}>effacées</span> du web.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
        >
          FLOAT envoie automatiquement des demandes de suppression conformes au RGPD
          à des centaines de data brokers européens. En trois clics.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <a href={REPO} target="_blank" rel="noreferrer">
              <Button
                variant="outline"
                className="h-12 px-7 text-base font-semibold gap-2 border-border bg-white hover:bg-muted"
              >
                <Container className="w-4 h-4" />
                Auto-héberger sur Docker
              </Button>
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground"
        >
          {TRUST.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5">
              <t.icon className="w-3.5 h-3.5" style={{ color: NAVY }} />
              {t.label}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="max-w-4xl mx-auto px-5 md:px-8 pb-20"
      >
        <div className="relative">
          <DashboardPreview />

          <FloatCard
            className="absolute -left-25 -top-4 hidden lg:flex"
            delay={0.6}
            rotate={-5}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            title="LexisNexis"
            subtitle="Supprimé"
          />
          <FloatCard
            className="absolute -right-25 top-16 hidden lg:flex"
            delay={0.75}
            rotate={4}
            icon={<ShieldCheck className="w-4 h-4" style={{ color: ORANGE }} />}
            title="AES-256"
            subtitle="Chiffré"
          />
          <FloatCard
            className="absolute -left-25 bottom-24 hidden lg:flex"
            delay={0.9}
            rotate={3}
            icon={<Clock className="w-4 h-4" style={{ color: NAVY }} />}
            title="Relance J+30"
            subtitle="Automatique"
          />
          <FloatCard
            className="absolute -right-25 -bottom-4 hidden lg:flex"
            delay={1.05}
            rotate={-4}
            icon={<Send className="w-4 h-4" style={{ color: ORANGE }} />}
            title="+24 demandes"
            subtitle="ce mois"
          />
        </div>
      </motion.div>
    </section>
  )
}

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-9 bg-[#F9F7F6] border-b border-border">
        <WindowDots />
        <span className="ml-4 text-xs text-muted-foreground">float.app/dashboard</span>
      </div>
      <img
        src="/dashboard-preview.png"
        alt="Aperçu du tableau de bord FLOAT : statistiques, demandes et relances"
        className="w-full block"
      />
    </div>
  )
}

function FloatCard({
  className,
  delay,
  rotate,
  icon,
  title,
  subtitle,
}: {
  className?: string
  delay: number
  rotate: number
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
      animate={{ opacity: 1, scale: 1, rotate, y: [0, -7, 0] }}
      transition={{
        opacity: { duration: 0.4, delay },
        scale: { duration: 0.4, delay, type: "spring", stiffness: 200 },
        rotate: { duration: 0.4, delay, type: "spring", stiffness: 200 },
        y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.4 },
      }}
      className={`items-center gap-2.5 bg-white border border-border rounded-xl shadow-lg px-3 py-2.5 whitespace-nowrap ${className ?? ""}`}
    >
      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-left">
        <span className="block text-[13px] font-semibold leading-tight" style={{ color: DARK }}>{title}</span>
        <span className="block text-[11px] text-muted-foreground leading-tight">{subtitle}</span>
      </span>
    </motion.div>
  )
}

// ─── Comment ça marche ────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: UserCircle,
    title: "Renseignez votre profil",
    text: "Nom, adresses, emails, téléphones. Chiffrés en base avec AES-256, jamais transmis à des tiers.",
  },
  {
    icon: Filter,
    title: "Choisissez vos brokers",
    text: "Filtrez par région, catégorie, difficulté. Plus de 50 brokers européens préréférencés par la communauté.",
  },
  {
    icon: Send,
    title: "FLOAT envoie & suit",
    text: "Emails RGPD générés, envoyés, relancés. Vous voyez tout sur un dashboard : statut, délai, réponses.",
  },
]

function Steps() {
  return (
    <section id="etapes" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="Comment ça marche"
          title="Trois clics, c'est tout."
          subtitle="De la création du profil au suivi des réponses, FLOAT automatise chaque étape pour vous."
        />
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="relative rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <span
                className="absolute top-6 right-6 text-2xl font-bold opacity-20"
                style={{ ...heading, color: NAVY }}
              >
                0{i + 1}
              </span>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${ORANGE}1A` }}>
                <s.icon className="w-6 h-6" style={{ color: ORANGE }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: DARK }}>{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

const STATS = [
  { value: "4 000+", label: "data brokers actifs dans le monde" },
  { value: "7–15 €", label: "par mois pour un service privé équivalent" },
  { value: "0 €", label: "avec FLOAT, à vie" },
  { value: "30 j", label: "délai légal de réponse RGPD (art. 12)" },
]

function Stats() {
  return (
    <section className="py-24" style={{ backgroundColor: OFFWHITE }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="Chiffres clés"
          title="Nos chiffres."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-5"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-white border border-border shadow-sm p-6 text-center"
            >
              <p
                className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums"
                style={{ fontFamily: "'Inter Variable', sans-serif", color: ORANGE }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Contribuer ───────────────────────────────────────────────────────────────

function Contribute() {
  return (
    <section className="py-24" style={{ backgroundColor: OFFWHITE }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-2xl overflow-hidden border border-border bg-white shadow-sm"
        >
          <div className="flex items-center gap-1.5 px-4 h-10 border-b border-border" style={{ backgroundColor: OFFWHITE }}>
            <WindowDots />
            <span className="ml-3 text-xs text-muted-foreground font-mono">contribuer — zsh</span>
          </div>
          <pre className="p-5 text-[13px] leading-relaxed font-mono overflow-x-auto bg-white">
            <code>
              <span className="text-muted-foreground"># cloner le registre</span>{"\n"}
              <span style={{ color: ORANGE }}>$</span> <span style={{ color: DARK }}>git clone {REPO.replace("https://", "")}</span>{"\n"}
              <span style={{ color: ORANGE }}>$</span> <span style={{ color: DARK }}>git checkout -b add-broker</span>{"\n\n"}
              <span className="text-muted-foreground"># ajouter un broker au YAML, puis</span>{"\n"}
              <span style={{ color: ORANGE }}>$</span> <span style={{ color: DARK }}>git commit -m </span><span className="text-emerald-600">"feat: add Spokeo to registry"</span>{"\n"}
              <span style={{ color: ORANGE }}>$</span> <span style={{ color: DARK }}>gh pr create</span>{"\n"}
              <span className="text-emerald-600">✓ Pull request ouverte — merci !</span>
            </code>
          </pre>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <SectionHead
            eyebrow="Open source"
            title="Contribuer"
            center={false}
          />
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Le registre est crowd-sourcé. Vous connaissez un broker manquant ou avez réussi une
            suppression via une procédure non documentée ? Ouvrez une PR.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={REPO + "/blob/main/CONTRIBUTING.md"} target="_blank" rel="noreferrer">
              <Button className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2 h-10 px-5">
                <GithubMark className="w-4 h-4" />
                CONTRIBUTING.md
              </Button>
            </a>
            <a href={REPO + "/contribute"} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2 h-10 px-5 border-border">
                Good first issues
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: FileText, title: "Templates RGPD prêts à l'emploi", text: "Art. 15 · Art. 17 · relance · mise en demeure · FR + EN", color: "#FC7E34", bg: "#FFF1E7" },
  { icon: Database, title: "Registre de 50+ brokers UE", text: "crowd-sourcé · versionné · import/export YAML", color: "#1d4ed8", bg: "#dbeafe" },
  { icon: LayoutDashboard, title: "Dashboard de suivi", text: "état de chaque demande · machine à états · stats", color: "#7c3aed", bg: "#ede9fe" },
  { icon: RefreshCw, title: "Relances automatiques", text: "cron-based · 30j → 60j → escalade CNIL", color: "#15803d", bg: "#dcfce7" },
  { icon: Lock, title: "Chiffrement au repos", text: "AES-256 · clé en .env · zero-knowledge possible", color: "#b45309", bg: "#fef3c7" },
  { icon: Container, title: "Docker Compose", text: "un fichier · 5 services · 1 commande", color: "#253550", bg: "#e6eaf0" },
]

function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="Fonctionnalités"
          title="Tout est dans la boîte."
          subtitle="Une stack complète, pensée pour l'auto-hébergement et le respect de la vie privée."
        />

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.bg }}>
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-[15px]" style={{ color: DARK }}>{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Vos données restent chiffrées au repos (AES-256) sur l'instance que vous contrôlez. En auto-hébergement, elles ne quittent jamais votre serveur. Aucune télémétrie n'est remontée vers nous.",
  },
  {
    q: "Qu'est-ce qu'un data broker exactement ?",
    a: "Une entreprise qui collecte, agrège et revend des données personnelles (identité, adresses, comportement) sans relation directe avec vous. Il en existe plusieurs milliers dans le monde.",
  },
  {
    q: "Et si un broker refuse ma demande ?",
    a: "FLOAT trace le refus et vous propose les étapes d'escalade : relance, mise en demeure, puis plainte auprès de la CNIL. Les templates correspondants sont fournis.",
  },
  {
    q: "Pourquoi auto-héberger ?",
    a: "Pour garder la maîtrise totale de vos données : elles ne transitent par aucun service tiers. Une commande Docker Compose suffit à lancer votre propre instance.",
  },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(1)
  return (
    <section className="py-24" style={{ backgroundColor: OFFWHITE }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <SectionHead eyebrow="Questions fréquentes" title="Tout ce que vous voulez savoir." />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 space-y-3"
        >
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div key={item.q} variants={staggerItem} className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="font-medium text-sm" style={{ color: DARK }}>{item.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    title: "Produit",
    links: [
      { label: "Comment ça marche", href: "#etapes" },
      { label: "Fonctionnalités", href: "#features" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: REPO + "#readme", external: true },
      { label: "CONTRIBUTING.md", href: REPO + "/blob/main/CONTRIBUTING.md", external: true },
      { label: "Good first issues", href: REPO + "/contribute", external: true },
      { label: "Code source", href: REPO, external: true },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "#top" },
      { label: "Confidentialité", href: "#top" },
      { label: "Conditions d'utilisation", href: "#top" },
      { label: "Licence AGPL-3.0", href: REPO + "/blob/main/LICENSE", external: true },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <motion.div {...fadeUp} className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <span className="text-2xl font-bold tracking-wide" style={{ ...heading, color: ORANGE }}>FLOAT</span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Reprenez le contrôle de vos données personnelles. Gratuit, open source et auto-hébergeable.
          </p>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <GithubMark className="w-4 h-4" />
            BUT-MMI-Beziers/optout
          </a>
        </div>

        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: NAVY }}>
              {col.title}
            </p>
            <ul className="space-y-2.5">
              {col.links.map((l) =>
                "route" in l && l.route ? (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ) : (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={"external" in l && l.external ? "_blank" : undefined}
                      rel={"external" in l && l.external ? "noreferrer" : undefined}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </motion.div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FLOAT · Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Conçu pour le RGPD · Hébergé chez vous · Aucune télémétrie
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <LandingNav />
      <Hero />
      <Steps />
      <Stats />
      <Contribute />
      <Features />
      <Faq />
      <Footer />
    </div>
  )
}