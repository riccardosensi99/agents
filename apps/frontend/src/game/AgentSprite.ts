import Phaser from "phaser";
import type { Agent } from "../types/domain";
import type { RoomAgentMode, RoomPoint } from "./types";

type BuiltInAgentVisualKey = "instaspark" | "linkforge" | "overseer";
type AgentVisualArchetype = BuiltInAgentVisualKey | "custom";
type GeneratedDirection = "down" | "up" | "right" | "left";

type AgentVisualProfile = {
  key: string;
  archetype: AgentVisualArchetype;
  scale: number;
  width: number;
  height: number;
  speed: number;
  accent: number;
  accentAlt: number;
  dark: number;
  trim: number;
  label: string;
  shadowWidth: number;
  shadowHeight: number;
  interactiveWidth: number;
  interactiveHeight: number;
};

type GeneratedMode = RoomAgentMode;

const generatedModes: GeneratedMode[] = ["idle", "walk", "working", "thinking", "error", "waiting_approval"];
const generatedDirections: GeneratedDirection[] = ["down", "up", "right", "left"];

const frameCountByMode: Record<GeneratedMode, number> = {
  idle: 3,
  walk: 4,
  working: 3,
  thinking: 3,
  error: 2,
  waiting_approval: 3
};

const profiles: Record<BuiltInAgentVisualKey, AgentVisualProfile> = {
  instaspark: {
    key: "instaspark",
    archetype: "instaspark",
    scale: 0.94,
    width: 72,
    height: 82,
    speed: 122,
    accent: 0xfb923c,
    accentAlt: 0xfacc15,
    dark: 0x451a03,
    trim: 0xffb347,
    label: "#fed7aa",
    shadowWidth: 36,
    shadowHeight: 11,
    interactiveWidth: 72,
    interactiveHeight: 88
  },
  linkforge: {
    key: "linkforge",
    archetype: "linkforge",
    scale: 1,
    width: 74,
    height: 84,
    speed: 76,
    accent: 0x22d3ee,
    accentAlt: 0x14b8a6,
    dark: 0x083344,
    trim: 0x67e8f9,
    label: "#cffafe",
    shadowWidth: 42,
    shadowHeight: 12,
    interactiveWidth: 74,
    interactiveHeight: 86
  },
  overseer: {
    key: "overseer",
    archetype: "overseer",
    scale: 1.18,
    width: 86,
    height: 96,
    speed: 50,
    accent: 0xa78bfa,
    accentAlt: 0x7dd3fc,
    dark: 0x2e1065,
    trim: 0x7c3aed,
    label: "#ede9fe",
    shadowWidth: 62,
    shadowHeight: 16,
    interactiveWidth: 86,
    interactiveHeight: 104
  }
};

const customPalettes = [
  { accent: 0x34d399, accentAlt: 0xa7f3d0, dark: 0x064e3b, trim: 0x0f766e, label: "#d1fae5" },
  { accent: 0xf472b6, accentAlt: 0xfbcfe8, dark: 0x831843, trim: 0xbe185d, label: "#fce7f3" },
  { accent: 0x60a5fa, accentAlt: 0xbfdbfe, dark: 0x1e3a8a, trim: 0x2563eb, label: "#dbeafe" },
  { accent: 0xfbbf24, accentAlt: 0xfef3c7, dark: 0x78350f, trim: 0xd97706, label: "#fef3c7" },
  { accent: 0xc084fc, accentAlt: 0xe9d5ff, dark: 0x581c87, trim: 0x9333ea, label: "#f3e8ff" }
] as const;

const textureKey = (key: string, direction: GeneratedDirection, mode: GeneratedMode, frame: number) =>
  `agent-${key}-${direction}-${mode}-${frame}`;

export function registerAgentSpriteTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(textureKey("instaspark", "down", "idle", 0))) {
    return;
  }

  for (const profile of Object.values(profiles)) {
    ensureAgentSpriteTextures(scene, profile);
  }
}

export class AgentSprite {
  public readonly container: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly body: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly thoughtDots: Phaser.GameObjects.Rectangle[];
  private readonly motes: Phaser.GameObjects.Rectangle[];
  private readonly glitchBars: Phaser.GameObjects.Rectangle[];
  private target: RoomPoint | null = null;
  private basePoint: RoomPoint;
  private mode: RoomAgentMode = "idle";
  private readonly profile: AgentVisualProfile;
  private readonly phase = Math.random() * Math.PI * 2;
  private direction: GeneratedDirection = "down";
  private lastTexture = "";
  private turnUntil = 0;
  private nextLookAroundAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private agent: Agent,
    start: RoomPoint
  ) {
    this.profile = profileForAgent(agent);
    ensureAgentSpriteTextures(scene, this.profile);
    this.basePoint = { ...start };

    this.aura = scene.add
      .ellipse(0, -36, this.profile.shadowWidth * 1.9, this.profile.height * 0.82, this.profile.accent, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.shadow = scene.add.ellipse(0, 5, this.profile.shadowWidth, this.profile.shadowHeight, 0x020617, 0.46);
    this.body = scene.add
      .image(0, -3, textureKey(this.profile.key, "down", "idle", 0))
      .setOrigin(0.5, 0.88)
      .setScale(this.profile.scale);

    this.thoughtDots = [0, 1, 2].map((index) =>
      scene.add.rectangle(-11 + index * 11, -74, 5, 5, this.profile.accentAlt, 0).setOrigin(0.5)
    );
    this.motes = [0, 1, 2, 3].map((index) =>
      scene.add.rectangle(0, 0, index % 2 === 0 ? 4 : 3, index % 2 === 0 ? 4 : 3, this.profile.accentAlt, 0).setOrigin(0.5)
    );
    this.glitchBars = [0, 1, 2].map((index) =>
      scene.add.rectangle(0, -52 + index * 13, 18 - index * 3, 3, 0xfb7185, 0).setOrigin(0.5)
    );

    this.label = scene.add
      .text(0, 20, agent.name, {
        color: this.profile.label,
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: "rgba(17, 24, 39, 0.55)",
        padding: { x: 5, y: 2 }
      })
      .setOrigin(0.5, 0);

    this.container = scene.add.container(start.x, start.y, [
      this.aura,
      this.shadow,
      this.body,
      ...this.thoughtDots,
      ...this.motes,
      ...this.glitchBars,
      this.label
    ]);
    this.container.setSize(this.profile.interactiveWidth, this.profile.interactiveHeight);
    this.container.setDepth(Math.round(start.y));
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.profile.interactiveWidth / 2,
        -this.profile.interactiveHeight + 18,
        this.profile.interactiveWidth,
        this.profile.interactiveHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );
  }

  updateAgent(agent: Agent) {
    this.agent = agent;
    this.label.setText(agent.name);
  }

  setTarget(target: RoomPoint | null) {
    this.target = target ? { ...target } : null;

    if (target) {
      this.setDirection(directionFromVector(target.x - this.basePoint.x, target.y - this.basePoint.y));
    }
  }

  getTarget() {
    return this.target;
  }

  getPosition(): RoomPoint {
    return { ...this.basePoint };
  }

  setMode(mode: RoomAgentMode) {
    this.mode = mode;
  }

  update(time: number, deltaMs: number) {
    const moving = this.advanceTowardsTarget(deltaMs);
    const visualMode: RoomAgentMode = moving ? "walk" : this.mode;
    this.maybeLookAround(time, moving, visualMode);
    const frame = this.frameForMode(visualMode, time);
    const nextTexture = textureKey(this.profile.key, this.direction, visualMode, frame);

    if (nextTexture !== this.lastTexture) {
      this.body.setTexture(nextTexture);
      this.lastTexture = nextTexture;
    }

    this.body.setFlipX(false);
    this.updateMotionPose(visualMode, moving, time);
    this.updateStatusVfx(visualMode, time);

    this.container.setPosition(this.basePoint.x, this.basePoint.y);
    this.container.setDepth(Math.round(this.basePoint.y));
  }

  destroy() {
    this.container.destroy(true);
  }

  private advanceTowardsTarget(deltaMs: number) {
    if (!this.target) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(this.basePoint.x, this.basePoint.y, this.target.x, this.target.y);

    if (distance <= 4) {
      this.basePoint = { ...this.target };
      this.target = null;
      return false;
    }

    const step = Math.min(distance, (this.profile.speed * deltaMs) / 1000);
    const dx = (this.target.x - this.basePoint.x) / distance;
    const dy = (this.target.y - this.basePoint.y) / distance;
    this.basePoint.x += dx * step;
    this.basePoint.y += dy * step;

    this.setDirection(directionFromVector(dx, dy));

    return true;
  }

  private frameForMode(mode: RoomAgentMode, time: number) {
    const count = frameCountByMode[mode];
    const pace =
      mode === "walk"
        ? this.profile.archetype === "instaspark"
          ? 105
          : this.profile.archetype === "overseer"
            ? 175
            : 135
        : mode === "idle"
          ? 640
          : mode === "error"
            ? 90
            : 260;

    return Math.floor(time / pace + this.phase) % count;
  }

  private updateMotionPose(mode: RoomAgentMode, moving: boolean, time: number) {
    const walkPhase =
      time / (this.profile.archetype === "overseer" ? 170 : this.profile.archetype === "instaspark" ? 92 : 125) +
      this.phase;
    const idlePhase = time / (this.profile.archetype === "instaspark" ? 390 : 610) + this.phase;
    const horizontalSign = this.direction === "left" ? -1 : 1;
    const sideFacing = this.direction === "left" || this.direction === "right";
    const stride = Math.sin(walkPhase);
    const stepBeat = Math.abs(stride);
    const walkLift = moving
      ? stepBeat * (this.profile.archetype === "overseer" ? 3.1 : this.profile.archetype === "instaspark" ? 5.2 : 4.1)
      : 0;
    const idleBob = !moving ? Math.sin(idlePhase) * (this.profile.archetype === "linkforge" ? 1.1 : 1.9) : 0;
    const workPulse = mode === "working" ? Math.sin(time / 120 + this.phase) * 1.1 : 0;
    const errorJitter = mode === "error" ? Math.sin(time / 27) * 2.4 : 0;
    const squash = moving ? stepBeat * 0.038 : Math.sin(idlePhase) * 0.012;
    const lateralStep = moving
      ? stride *
        (this.profile.archetype === "instaspark" ? 2.1 : this.profile.archetype === "overseer" ? 0.9 : 1.3) *
        (sideFacing ? 1 : 0.42)
      : 0;
    const turnPulse = Math.max(0, Math.sin(((this.turnUntil - time) / 180) * Math.PI));
    const turnSquash = time < this.turnUntil ? turnPulse : 0;

    this.body.setPosition(errorJitter + lateralStep, -3 - walkLift + idleBob + workPulse);
    this.body.setScale(
      this.profile.scale * (1 + squash - turnSquash * 0.1),
      this.profile.scale * (1 - squash * 0.58 + turnSquash * 0.08)
    );
    this.body.setRotation(
      moving
        ? stride *
          (this.profile.archetype === "instaspark" ? 0.055 : this.profile.archetype === "overseer" ? 0.026 : 0.034) *
          (sideFacing ? horizontalSign : 0.45)
        : Math.sin(idlePhase) * 0.015 + turnSquash * 0.05 * horizontalSign
    );

    if (mode === "error") {
      this.body.setTint(0xffb4b4);
    } else if (mode === "waiting_approval") {
      this.body.setTint(0xfff1a8);
    } else {
      this.body.clearTint();
    }

    const shadowPulse = 1 - walkLift * 0.02;
    this.shadow.setScale(shadowPulse + turnSquash * 0.08, 1 + walkLift * 0.01);
    this.shadow.setAlpha(mode === "walk" ? 0.36 : 0.44 + Math.sin(idlePhase) * 0.035);

    const auraVisible =
      this.profile.archetype === "overseer" || mode === "working" || mode === "thinking" || mode === "waiting_approval";
    this.aura.setAlpha(auraVisible ? 0.06 + Math.sin(time / 520 + this.phase) * 0.025 : 0);
    this.aura.setScale(1 + Math.sin(time / 760 + this.phase) * 0.04);
  }

  private updateStatusVfx(mode: RoomAgentMode, time: number) {
    const showDots = mode === "thinking" || mode === "working" || mode === "waiting_approval";
    this.thoughtDots.forEach((dot, index) => {
      const dotPulse = (Math.sin(time / 180 + index * 1.2 + this.phase) + 1) / 2;
      dot.setVisible(showDots);
      dot.setAlpha(showDots ? 0.25 + dotPulse * 0.7 : 0);
      dot.setFillStyle(mode === "waiting_approval" ? 0xfbbf24 : mode === "working" ? this.profile.accentAlt : 0xc4b5fd, 1);
      dot.setY(-74 - dotPulse * 4);
    });

    this.motes.forEach((mote, index) => {
      const horizontalSign = this.direction === "left" ? -1 : 1;
      const angle = time / (this.profile.archetype === "instaspark" ? 260 : 420) + index * 1.7 + this.phase;
      const radius = this.profile.archetype === "overseer" ? 34 + index * 3 : 25 + index * 2;
      const active =
        mode === "working" ||
        mode === "thinking" ||
        (this.profile.archetype === "instaspark" && mode === "walk") ||
        (this.profile.archetype === "overseer" && mode !== "error");

      mote.setVisible(active);
      mote.setAlpha(active ? 0.18 + ((Math.sin(angle * 1.7) + 1) / 2) * 0.44 : 0);
      mote.setFillStyle(index % 2 === 0 ? this.profile.accentAlt : this.profile.accent, 1);
      mote.setPosition(Math.cos(angle) * radius * horizontalSign, -38 + Math.sin(angle) * 18);
    });

    this.glitchBars.forEach((bar, index) => {
      const active = mode === "error";
      const pulse = (Math.sin(time / 44 + index) + 1) / 2;
      bar.setVisible(active);
      bar.setAlpha(active ? 0.35 + pulse * 0.55 : 0);
      bar.setPosition((pulse * 10 - 5) * (index % 2 === 0 ? 1 : -1), -55 + index * 13);
    });
  }

  private maybeLookAround(time: number, moving: boolean, mode: RoomAgentMode) {
    if (moving || mode === "working" || mode === "error" || time < this.nextLookAroundAt) {
      return;
    }

    const chance = this.profile.archetype === "instaspark" ? 62 : this.profile.archetype === "overseer" ? 42 : 16;
    const delay =
      this.profile.archetype === "instaspark"
        ? Phaser.Math.Between(900, 2200)
        : this.profile.archetype === "overseer"
          ? Phaser.Math.Between(2100, 4200)
          : Phaser.Math.Between(4200, 7600);

    if (Phaser.Math.Between(0, 100) < chance) {
      const lookOptions: GeneratedDirection[] =
        this.profile.archetype === "overseer" ? ["down", "left", "right", "up"] : ["down", "left", "right"];
      this.setDirection(lookOptions[Phaser.Math.Between(0, lookOptions.length - 1)] ?? "down");
    }

    this.nextLookAroundAt = time + delay;
  }

  private setDirection(nextDirection: GeneratedDirection) {
    if (nextDirection === this.direction) {
      return;
    }

    this.direction = nextDirection;
    this.turnUntil = this.scene.time.now + 180;
  }
}

function profileForAgent(agent: Agent): AgentVisualProfile {
  const builtInKey = agent.slug in profiles ? agent.slug : agent.avatarType;

  if (builtInKey in profiles) {
    return profiles[builtInKey as BuiltInAgentVisualKey];
  }

  const hash = hashString(`${agent.id}:${agent.slug}:${agent.avatarType}:${agent.name}`);
  const palette = customPalettes[hash % customPalettes.length] ?? customPalettes[0];

  return {
    key: `custom-${hash.toString(36)}`,
    archetype: "custom",
    scale: 0.98,
    width: 74,
    height: 86,
    speed: 88 + (hash % 26),
    accent: palette.accent,
    accentAlt: palette.accentAlt,
    dark: palette.dark,
    trim: palette.trim,
    label: palette.label,
    shadowWidth: 40,
    shadowHeight: 12,
    interactiveWidth: 74,
    interactiveHeight: 90
  };
}

function ensureAgentSpriteTextures(scene: Phaser.Scene, profile: AgentVisualProfile) {
  if (scene.textures.exists(textureKey(profile.key, "down", "idle", 0))) {
    return;
  }

  for (const direction of generatedDirections) {
    for (const mode of generatedModes) {
      for (let frame = 0; frame < frameCountByMode[mode]; frame += 1) {
        generateAgentFrame(scene, profile, direction, mode, frame);
      }
    }
  }
}

function generateAgentFrame(
  scene: Phaser.Scene,
  profile: AgentVisualProfile,
  direction: GeneratedDirection,
  mode: GeneratedMode,
  frame: number
) {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  if (profile.archetype === "instaspark") {
    drawInstaSpark(graphics, profile, direction, mode, frame);
  } else if (profile.archetype === "linkforge") {
    drawLinkForge(graphics, profile, direction, mode, frame);
  } else if (profile.archetype === "overseer") {
    drawOverseer(graphics, profile, direction, mode, frame);
  } else {
    drawCustomOperator(graphics, profile, direction, mode, frame);
  }

  graphics.generateTexture(textureKey(profile.key, direction, mode, frame), profile.width, profile.height);
  graphics.destroy();
}

function directionFromVector(dx: number, dy: number): GeneratedDirection {
  if (Math.abs(dy) > Math.abs(dx) * 1.1) {
    return dy < 0 ? "up" : "down";
  }

  return dx < 0 ? "left" : "right";
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function drawInstaSpark(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: GeneratedDirection,
  mode: GeneratedMode,
  frame: number
) {
  if (direction === "up") {
    drawBackOperator(graphics, profile, mode, frame, { antenna: true, shoulderGlow: 0xffd166 });
    return;
  }

  if (direction === "left" || direction === "right") {
    drawSideOperator(graphics, profile, direction, mode, frame, { antenna: true, visor: false, tool: true });
    return;
  }

  const blink = mode === "idle" && frame === 2;
  const walk = mode === "walk";
  const error = mode === "error";
  const y = walk ? (frame % 2 === 0 ? 1 : -1) : 0;
  const leftFoot = walk ? (frame % 2 === 0 ? 1 : -2) : 0;
  const rightFoot = walk ? (frame % 2 === 0 ? -2 : 1) : 0;

  rect(graphics, 28 + leftFoot, 68, 10, 5, profile.dark, 1);
  rect(graphics, 42 + rightFoot, 68, 10, 5, profile.dark, 1);
  rect(graphics, 18, 24 + y, 36, 38, profile.dark, 1);
  rect(graphics, 14, 34 + y, 44, 21, profile.dark, 1);
  rect(graphics, 21, 18 + y, 8, 11, profile.dark, 1);
  rect(graphics, 47, 18 + y, 8, 11, profile.dark, 1);
  rect(graphics, 24, 22 + y, 8, 9, 0xffd166, 1);
  rect(graphics, 46, 22 + y, 8, 9, 0xffd166, 1);
  rect(graphics, 20, 26 + y, 32, 34, profile.accent, 1);
  rect(graphics, 16, 36 + y, 40, 16, 0xffb347, 1);
  rect(graphics, 26, 46 + y, 20, 13, profile.accentAlt, 0.95);
  rect(graphics, 23, 30 + y, 8, blink ? 2 : 8, error ? 0x7f1d1d : 0x1c1917, 1);
  rect(graphics, 42, 30 + y, 8, blink ? 2 : 8, error ? 0x7f1d1d : 0x1c1917, 1);

  if (!blink) {
    rect(graphics, 26, 31 + y, 2, 2, 0xffffff, 0.95);
    rect(graphics, 45, 31 + y, 2, 2, 0xffffff, 0.95);
  }

  rect(graphics, 29, 43 + y, 14, 3, error ? 0x7f1d1d : 0x451a03, 1);
  rect(graphics, 16, 47 + y, 5, 5, 0xffedd5, 0.72);
  rect(graphics, 52, 47 + y, 5, 5, 0xffedd5, 0.72);
  rect(graphics, 33, 12 + y, 6, 8, profile.accentAlt, 1);
  rect(graphics, 31, 8 + y, 10, 5, 0xfff7ad, mode === "working" ? 1 : 0.75);
  rect(graphics, 59, 34 + y, 5, 14, profile.accentAlt, 0.8);
  rect(graphics, 10, 38 + y, 5, 12, profile.accentAlt, 0.8);
}

function drawLinkForge(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: GeneratedDirection,
  mode: GeneratedMode,
  frame: number
) {
  if (direction === "up") {
    drawBackOperator(graphics, profile, mode, frame, { antenna: true, shoulderGlow: 0x67e8f9 });
    return;
  }

  if (direction === "left" || direction === "right") {
    drawSideOperator(graphics, profile, direction, mode, frame, { antenna: true, visor: true, tool: true });
    return;
  }

  const blink = mode === "idle" && frame === 2;
  const walk = mode === "walk";
  const y = walk ? (frame % 2 === 0 ? 1 : 0) : 0;
  const armOffset = mode === "working" ? frame % 2 : 0;

  rect(graphics, 24 + (walk && frame === 1 ? 2 : 0), 69, 11, 5, profile.dark, 1);
  rect(graphics, 41 + (walk && frame === 3 ? -2 : 0), 69, 11, 5, profile.dark, 1);
  rect(graphics, 20, 21 + y, 36, 45, profile.dark, 1);
  rect(graphics, 16, 31 + y, 44, 25, profile.dark, 1);
  rect(graphics, 24, 18 + y, 28, 7, 0x155e75, 1);
  rect(graphics, 22, 25 + y, 32, 37, profile.accent, 1);
  rect(graphics, 18, 34 + y, 40, 16, 0x67e8f9, 0.82);
  rect(graphics, 26, 30 + y, 24, 11, 0x082f49, 1);
  rect(graphics, 29, 33 + y, blink ? 16 : 5, blink ? 2 : 4, 0xecfeff, 1);
  if (!blink) {
    rect(graphics, 42, 33 + y, 5, 4, 0xecfeff, 1);
  }
  rect(graphics, 29, 48 + y, 18, 3, 0x0f766e, 1);
  rect(graphics, 31, 54 + y, 5, 4, profile.accentAlt, 1);
  rect(graphics, 39, 54 + y, 5, 4, 0x99f6e4, 0.8);
  rect(graphics, 10, 38 + y + armOffset, 8, 14, 0x155e75, 1);
  rect(graphics, 58, 38 + y - armOffset, 8, 14, 0x155e75, 1);
  rect(graphics, 12, 53 + y + armOffset, 5, 5, profile.accentAlt, 1);
  rect(graphics, 59, 53 + y - armOffset, 5, 5, profile.accentAlt, 1);
}

function drawOverseer(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: GeneratedDirection,
  mode: GeneratedMode,
  frame: number
) {
  if (direction === "up") {
    drawBackOperator(graphics, profile, mode, frame, { antenna: true, halo: true, shoulderGlow: 0xc4b5fd });
    return;
  }

  if (direction === "left" || direction === "right") {
    drawSideOperator(graphics, profile, direction, mode, frame, { antenna: false, visor: true, halo: true, tool: false });
    return;
  }

  const blink = mode === "idle" && frame === 2;
  const walk = mode === "walk";
  const y = walk ? (frame % 2 === 0 ? 1 : 0) : 0;
  const error = mode === "error";

  rect(graphics, 24 + (walk && frame === 1 ? 1 : 0), 81, 14, 6, profile.dark, 1);
  rect(graphics, 50 + (walk && frame === 3 ? -1 : 0), 81, 14, 6, profile.dark, 1);
  rect(graphics, 22, 25 + y, 43, 55, profile.dark, 1);
  rect(graphics, 18, 39 + y, 51, 31, profile.dark, 1);
  rect(graphics, 27, 18 + y, 10, 12, 0xc4b5fd, 1);
  rect(graphics, 50, 18 + y, 10, 12, 0xc4b5fd, 1);
  rect(graphics, 32, 14 + y, 23, 8, 0xfef3c7, 0.9);
  rect(graphics, 25, 29 + y, 37, 47, profile.accent, 1);
  rect(graphics, 20, 43 + y, 47, 25, 0x7c3aed, 1);
  rect(graphics, 31, 33 + y, 25, 14, 0x1e1b4b, 1);
  rect(graphics, 34, 37 + y, blink ? 18 : 6, blink ? 2 : 5, error ? 0xfb7185 : 0xf5f3ff, 1);
  if (!blink) {
    rect(graphics, 48, 37 + y, 6, 5, error ? 0xfb7185 : 0xf5f3ff, 1);
  }
  rect(graphics, 39, 53 + y, 10, 10, profile.accentAlt, mode === "thinking" || mode === "working" ? 1 : 0.72);
  rect(graphics, 37, 64 + y, 15, 3, 0x2e1065, 1);
  rect(graphics, 14, 49 + y, 8, 17, 0x6d28d9, 1);
  rect(graphics, 66, 49 + y, 8, 17, 0x6d28d9, 1);
}

function drawCustomOperator(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: GeneratedDirection,
  mode: GeneratedMode,
  frame: number
) {
  if (direction === "up") {
    drawBackOperator(graphics, profile, mode, frame, { antenna: false, shoulderGlow: profile.accentAlt });
    return;
  }

  if (direction === "left" || direction === "right") {
    drawSideOperator(graphics, profile, direction, mode, frame, { antenna: false, visor: true, tool: true });
    return;
  }

  const blink = mode === "idle" && frame === 2;
  const walk = mode === "walk";
  const error = mode === "error";
  const y = walk ? (frame % 2 === 0 ? 1 : -1) : 0;
  const step = walk ? (frame % 2 === 0 ? 2 : -2) : 0;
  const armOffset = mode === "working" ? (frame % 2 === 0 ? 2 : -1) : 0;

  rect(graphics, 24 + step, 72, 12, 5, profile.dark, 1);
  rect(graphics, 42 - step, 72, 12, 5, profile.dark, 1);
  rect(graphics, 18, 28 + y, 39, 39, profile.dark, 1);
  rect(graphics, 15, 40 + y, 45, 19, profile.dark, 1);
  rect(graphics, 23, 24 + y, 29, 36, profile.accent, 1);
  rect(graphics, 18, 38 + y, 40, 13, profile.trim, 0.92);
  rect(graphics, 27, 52 + y, 18, 8, profile.accentAlt, mode === "thinking" || mode === "working" ? 1 : 0.78);
  rect(graphics, 26, 28 + y, 22, 10, profile.dark, 1);
  rect(graphics, 29, 31 + y, blink ? 16 : 5, blink ? 2 : 4, error ? 0xfb7185 : 0xf8fafc, 1);

  if (!blink) {
    rect(graphics, 42, 31 + y, 5, 4, error ? 0xfb7185 : 0xf8fafc, 1);
  }

  rect(graphics, 31, 47 + y, 12, 3, profile.dark, 1);
  rect(graphics, 10, 44 + y + armOffset, 8, 15, profile.trim, 1);
  rect(graphics, 58, 44 + y - armOffset, 8, 15, profile.trim, 1);
  rect(graphics, 12, 60 + y + armOffset, 5, 5, profile.accentAlt, 1);
  rect(graphics, 59, 60 + y - armOffset, 5, 5, profile.accentAlt, 1);
  rect(graphics, 34, 15 + y, 7, 9, profile.accentAlt, 0.95);
  rect(graphics, 31, 12 + y, 13, 4, profile.label === "#fef3c7" ? 0xfff7ad : profile.accentAlt, 0.72);
}

type DirectionalDetailOptions = {
  antenna?: boolean;
  halo?: boolean;
  shoulderGlow?: number;
  tool?: boolean;
  visor?: boolean;
};

function drawBackOperator(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  mode: GeneratedMode,
  frame: number,
  options: DirectionalDetailOptions
) {
  const walk = mode === "walk";
  const y = walk ? (frame % 2 === 0 ? 1 : -1) : 0;
  const leftFoot = walk ? (frame % 2 === 0 ? 1 : -2) : 0;
  const rightFoot = walk ? (frame % 2 === 0 ? -2 : 1) : 0;
  const cx = profile.width / 2;
  const footY = profile.height - 14;
  const bodyTop = profile.height * 0.34 + y;
  const bodyWidth = profile.width * 0.48;
  const bodyHeight = profile.height * 0.43;
  const trimY = bodyTop + bodyHeight * 0.46;

  rect(graphics, cx - 17 + leftFoot, footY, 12, 5, profile.dark, 1);
  rect(graphics, cx + 5 + rightFoot, footY, 12, 5, profile.dark, 1);
  rect(graphics, cx - bodyWidth / 2 - 5, bodyTop - 5, bodyWidth + 10, bodyHeight + 10, profile.dark, 1);
  rect(graphics, cx - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight, profile.accent, 1);
  rect(graphics, cx - bodyWidth / 2 - 2, trimY, bodyWidth + 4, profile.height * 0.13, profile.trim, 0.9);
  rect(graphics, cx - 9, bodyTop + 7, 18, profile.height * 0.33, profile.dark, 0.34);
  rect(graphics, cx - 5, bodyTop + 12, 10, profile.height * 0.2, profile.accentAlt, mode === "working" ? 0.9 : 0.58);

  if (options.shoulderGlow) {
    rect(graphics, cx - bodyWidth / 2 - 8, bodyTop + 11, 6, 10, options.shoulderGlow, 0.85);
    rect(graphics, cx + bodyWidth / 2 + 2, bodyTop + 11, 6, 10, options.shoulderGlow, 0.85);
  }

  if (options.antenna) {
    rect(graphics, cx - 3, bodyTop - 17, 6, 11, profile.accentAlt, 0.92);
    rect(graphics, cx - 6, bodyTop - 22, 12, 5, 0xfff7ad, mode === "working" ? 1 : 0.65);
  }

  if (options.halo) {
    rect(graphics, cx - 15, bodyTop - 15, 30, 4, profile.accentAlt, 0.8);
    rect(graphics, cx - 21, bodyTop - 9, 6, 5, profile.accentAlt, 0.55);
    rect(graphics, cx + 15, bodyTop - 9, 6, 5, profile.accentAlt, 0.55);
  }
}

function drawSideOperator(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: Extract<GeneratedDirection, "left" | "right">,
  mode: GeneratedMode,
  frame: number,
  options: DirectionalDetailOptions
) {
  const walk = mode === "walk";
  const error = mode === "error";
  const blink = mode === "idle" && frame === 2;
  const y = walk ? (frame % 2 === 0 ? 1 : -1) : 0;
  const step = walk ? (frame % 2 === 0 ? 2 : -2) : 0;
  const armOffset = mode === "working" ? (frame % 2 === 0 ? 2 : -1) : 0;
  const footY = profile.height - 14;
  const bodyTop = profile.height * 0.32 + y;
  const bodyX = profile.width * 0.31;
  const bodyWidth = profile.width * 0.4;
  const bodyHeight = profile.height * 0.47;

  sideRect(graphics, profile, direction, bodyX + 4 + step, footY, 14, 5, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX + 17 - step, footY, 11, 5, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX - 4, bodyTop - 5, bodyWidth + 10, bodyHeight + 7, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX, bodyTop, bodyWidth, bodyHeight, profile.accent, 1);
  sideRect(graphics, profile, direction, bodyX + bodyWidth - 6, bodyTop + 8, 12, 22, profile.trim, 0.9);
  sideRect(graphics, profile, direction, bodyX + 5, bodyTop + 10, bodyWidth - 8, 10, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX + bodyWidth - 7, bodyTop + 14, 5, blink ? 2 : 5, error ? 0xfb7185 : 0xf8fafc, 1);
  sideRect(graphics, profile, direction, bodyX + bodyWidth + 2, bodyTop + 22, 5, 4, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX + 3, bodyTop + 28, 16, 3, profile.dark, 1);
  sideRect(graphics, profile, direction, bodyX + bodyWidth - 2, bodyTop + 30 + armOffset, 8, 16, profile.trim, 1);
  sideRect(graphics, profile, direction, bodyX + bodyWidth + 1, bodyTop + 47 + armOffset, 5, 5, profile.accentAlt, 1);

  if (options.visor) {
    sideRect(graphics, profile, direction, bodyX + bodyWidth - 14, bodyTop + 12, 15, 9, profile.dark, 0.72);
  }

  if (options.tool) {
    sideRect(graphics, profile, direction, bodyX + bodyWidth + 6, bodyTop + 42 + armOffset, 7, 4, profile.accentAlt, 0.86);
  }

  if (options.antenna) {
    sideRect(graphics, profile, direction, bodyX + bodyWidth * 0.34, bodyTop - 13, 6, 10, profile.accentAlt, 0.9);
    sideRect(graphics, profile, direction, bodyX + bodyWidth * 0.28, bodyTop - 17, 11, 4, 0xfff7ad, 0.72);
  }

  if (options.halo) {
    sideRect(graphics, profile, direction, bodyX - 3, bodyTop - 11, bodyWidth + 11, 4, profile.accentAlt, 0.78);
  }
}

function sideRect(
  graphics: Phaser.GameObjects.Graphics,
  profile: AgentVisualProfile,
  direction: Extract<GeneratedDirection, "left" | "right">,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number
) {
  rect(graphics, direction === "left" ? profile.width - x - width : x, y, width, height, color, alpha);
}

function rect(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number
) {
  graphics.fillStyle(color, alpha);
  graphics.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}
