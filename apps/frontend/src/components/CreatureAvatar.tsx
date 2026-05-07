import { motion } from "framer-motion";
import clsx from "clsx";
import type { AgentStatus } from "../types/domain";

type Props = {
  avatarType: string;
  status: AgentStatus;
  compact?: boolean;
};

const motionByStatus: Record<AgentStatus, object> = {
  idle: { y: [0, -4, 0], rotate: [0, 1, 0] },
  working: { y: [0, -9, 0], rotate: [-1, 2, -1], scale: [1, 1.03, 1] },
  waiting_approval: { y: [0, -3, 0], rotate: [0, 0, 0], scale: [1, 0.98, 1] },
  error: { x: [0, -3, 3, -2, 0], rotate: [0, -2, 2, 0] }
};

export function CreatureAvatar({ avatarType, status, compact = false }: Props) {
  const size = compact ? "h-24 w-24" : "h-36 w-36";

  return (
    <motion.div
      className={clsx("relative grid place-items-center", size)}
      animate={motionByStatus[status]}
      transition={{ duration: status === "working" ? 1.45 : 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute inset-3 rounded-full bg-white/8 blur-xl" />
      {avatarType === "linkforge" ? <LinkForgeSvg /> : avatarType === "overseer" ? <OverseerSvg /> : <InstaSparkSvg />}
    </motion.div>
  );
}

function InstaSparkSvg() {
  return (
    <svg viewBox="0 0 160 160" className="relative h-full w-full drop-shadow-[0_18px_34px_rgba(251,146,60,0.24)]">
      <defs>
        <linearGradient id="sparkBody" x1="20" x2="140" y1="20" y2="140">
          <stop stopColor="#f97316" />
          <stop offset="0.55" stopColor="#facc15" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <motion.path
        d="M45 55 C38 30 57 22 70 42 C82 19 111 27 103 55 C127 61 130 96 106 116 C88 132 57 129 42 108 C28 88 29 64 45 55Z"
        fill="url(#sparkBody)"
        animate={{ d: [
          "M45 55 C38 30 57 22 70 42 C82 19 111 27 103 55 C127 61 130 96 106 116 C88 132 57 129 42 108 C28 88 29 64 45 55Z",
          "M43 57 C36 34 56 19 70 43 C84 22 113 28 104 56 C129 65 127 98 105 117 C87 131 57 130 41 107 C28 86 28 65 43 57Z"
        ] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatType: "mirror" }}
      />
      <path d="M49 45 L34 25 L57 35Z" fill="#fb923c" />
      <path d="M102 43 L125 24 L113 53Z" fill="#facc15" />
      <circle cx="62" cy="77" r="8" fill="#201022" />
      <circle cx="97" cy="77" r="8" fill="#201022" />
      <circle cx="65" cy="74" r="2.5" fill="#fff7ed" />
      <circle cx="100" cy="74" r="2.5" fill="#fff7ed" />
      <path d="M67 99 C76 106 87 106 96 99" fill="none" stroke="#201022" strokeLinecap="round" strokeWidth="5" />
      <motion.g animate={{ opacity: [0.5, 1, 0.5], scale: [0.92, 1.1, 0.92] }} transition={{ duration: 1.2, repeat: Infinity }}>
        <path d="M29 83 L18 78 L29 73 L34 62 L39 73 L50 78 L39 83 L34 94Z" fill="#fde68a" />
        <path d="M126 91 L116 87 L126 83 L130 73 L134 83 L144 87 L134 91 L130 101Z" fill="#fed7aa" />
      </motion.g>
    </svg>
  );
}

function LinkForgeSvg() {
  return (
    <svg viewBox="0 0 160 160" className="relative h-full w-full drop-shadow-[0_18px_34px_rgba(34,211,238,0.22)]">
      <defs>
        <linearGradient id="forgeBody" x1="22" x2="138" y1="16" y2="140">
          <stop stopColor="#38bdf8" />
          <stop offset="0.48" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path d="M80 22 L118 44 L118 94 L80 130 L42 94 L42 44Z" fill="url(#forgeBody)" />
      <path d="M80 31 L108 48 L108 89 L80 116 L52 89 L52 48Z" fill="rgba(2,6,23,0.28)" />
      <path d="M55 68 C66 57 94 57 105 68 L99 87 C89 93 70 93 61 87Z" fill="#07111f" />
      <circle cx="68" cy="76" r="5" fill="#67e8f9" />
      <circle cx="92" cy="76" r="5" fill="#a7f3d0" />
      <path d="M72 95 H88" stroke="#ccfbf1" strokeLinecap="round" strokeWidth="4" />
      <motion.path
        d="M80 22 V8 M62 32 L52 15 M98 32 L108 15"
        stroke="#67e8f9"
        strokeLinecap="round"
        strokeWidth="5"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.7, repeat: Infinity }}
      />
      <path d="M42 95 L25 108 L42 112" fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      <path d="M118 95 L135 108 L118 112" fill="none" stroke="#5eead4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
    </svg>
  );
}

function OverseerSvg() {
  return (
    <svg viewBox="0 0 170 170" className="relative h-full w-full drop-shadow-[0_18px_34px_rgba(167,139,250,0.2)]">
      <defs>
        <linearGradient id="overseerBody" x1="28" x2="142" y1="20" y2="148">
          <stop stopColor="#a78bfa" />
          <stop offset="0.48" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path d="M84 18 C118 18 143 45 143 86 C143 128 116 151 84 151 C52 151 27 128 27 86 C27 45 51 18 84 18Z" fill="url(#overseerBody)" />
      <path d="M48 50 C57 30 73 38 83 55 C94 36 111 30 123 50 C111 45 99 51 88 67 L78 67 C68 51 58 45 48 50Z" fill="rgba(15,23,42,0.28)" />
      <circle cx="63" cy="82" r="12" fill="#07111f" />
      <circle cx="106" cy="82" r="12" fill="#07111f" />
      <circle cx="67" cy="78" r="4" fill="#f8fafc" />
      <circle cx="110" cy="78" r="4" fill="#f8fafc" />
      <path d="M75 106 C83 111 91 111 99 106" fill="none" stroke="#07111f" strokeLinecap="round" strokeWidth="5" />
      <motion.g animate={{ rotate: [0, 360] }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "85px 86px" }}>
        <path d="M85 3 L91 17 L85 23 L79 17Z" fill="#e0f2fe" />
        <path d="M85 147 L91 153 L85 167 L79 153Z" fill="#dcfce7" />
        <path d="M4 86 L18 80 L24 86 L18 92Z" fill="#e9d5ff" />
        <path d="M146 86 L152 80 L166 86 L152 92Z" fill="#cffafe" />
      </motion.g>
    </svg>
  );
}
