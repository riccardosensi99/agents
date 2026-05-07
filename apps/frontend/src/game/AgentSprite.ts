import Phaser from "phaser";
import type { Agent } from "../types/domain";
import type { RoomAgentMode, RoomPoint } from "./types";

const speedBySlug: Record<string, number> = {
  instaspark: 118,
  linkforge: 82,
  overseer: 54
};

export class AgentSprite {
  public readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private target: RoomPoint | null = null;
  private basePoint: RoomPoint;
  private mode: RoomAgentMode = "idle";
  private readonly speed: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private agent: Agent,
    start: RoomPoint
  ) {
    this.basePoint = start;
    this.speed = speedBySlug[agent.slug] ?? 70;

    const shadow = scene.add.ellipse(0, 10, agent.slug === "overseer" ? 64 : 48, 16, 0x020617, 0.5);
    this.body = scene.add.image(0, 0, `agent-${agent.avatarType}`).setOrigin(0.5, 0.75);
    this.icon = scene.add
      .text(24, -52, "", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
        backgroundColor: "rgba(15,23,42,0.8)",
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5);
    this.label = scene.add
      .text(0, 22, agent.name, {
        color: "#dbeafe",
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "rgba(2,6,23,0.62)",
        padding: { x: 5, y: 3 }
      })
      .setOrigin(0.5, 0);

    this.container = scene.add.container(start.x, start.y, [shadow, this.body, this.icon, this.label]);
    this.container.setSize(78, 86);
    this.container.setDepth(Math.round(start.y));
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-39, -66, 78, 92),
      Phaser.Geom.Rectangle.Contains
    );
  }

  updateAgent(agent: Agent) {
    this.agent = agent;
    this.label.setText(agent.name);
  }

  setTarget(target: RoomPoint | null) {
    this.target = target;
  }

  getTarget() {
    return this.target;
  }

  getPosition(): RoomPoint {
    return { ...this.basePoint };
  }

  setMode(mode: RoomAgentMode) {
    this.mode = mode;

    if (mode === "error") {
      this.icon.setText("!");
      this.icon.setColor("#fecdd3");
      this.icon.setBackgroundColor("rgba(127,29,29,0.88)");
      return;
    }

    if (mode === "working") {
      this.icon.setText("...");
      this.icon.setColor("#cffafe");
      this.icon.setBackgroundColor("rgba(21,94,117,0.82)");
      return;
    }

    if (mode === "thinking") {
      this.icon.setText("?");
      this.icon.setColor("#ede9fe");
      this.icon.setBackgroundColor("rgba(76,29,149,0.78)");
      return;
    }

    if (mode === "waiting_approval") {
      this.icon.setText("OK?");
      this.icon.setColor("#fef3c7");
      this.icon.setBackgroundColor("rgba(146,64,14,0.8)");
      return;
    }

    this.icon.setText("");
  }

  update(time: number, deltaMs: number) {
    const target = this.target;
    let moving = false;

    if (target) {
      const distance = Phaser.Math.Distance.Between(this.basePoint.x, this.basePoint.y, target.x, target.y);
      if (distance > 4) {
        const step = Math.min(distance, (this.speed * deltaMs) / 1000);
        this.basePoint.x += ((target.x - this.basePoint.x) / distance) * step;
        this.basePoint.y += ((target.y - this.basePoint.y) / distance) * step;
        this.body.setFlipX(target.x < this.basePoint.x);
        moving = true;
      } else {
        this.basePoint = target;
        this.target = null;
      }
    }

    const bob =
      this.mode === "walk"
        ? Math.sin(time / 95) * 4
        : this.mode === "working"
          ? Math.sin(time / 125) * 2
          : this.mode === "error"
            ? Math.sin(time / 32) * 2
            : Math.sin(time / 420) * 2;

    const glitch = this.mode === "error" ? Math.sin(time / 28) * 3 : 0;
    this.container.setPosition(this.basePoint.x + glitch, this.basePoint.y + bob);
    this.container.setDepth(Math.round(this.basePoint.y));
    this.body.setRotation(moving ? Math.sin(time / 90) * 0.05 : Math.sin(time / 520) * 0.025);
    this.body.setAlpha(this.mode === "waiting_approval" ? 0.86 + Math.sin(time / 240) * 0.1 : 1);
  }

  destroy() {
    this.container.destroy(true);
  }
}
