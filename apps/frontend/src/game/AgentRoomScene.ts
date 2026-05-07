import Phaser from "phaser";
import type { Agent } from "../types/domain";
import { getAgentIntent, modeForIntent, selectTarget } from "./agentMovement";
import { getRoomZones, randomPointInZone, type RoomZones } from "./roomConfig";
import { AgentSprite } from "./AgentSprite";
import type { AgentRoomSceneCallbacks, AgentRoomSnapshot, RoomAgentIntent, RoomPoint } from "./types";

export class AgentRoomScene extends Phaser.Scene {
  private callbacks: AgentRoomSceneCallbacks;
  private snapshot: AgentRoomSnapshot = { agents: [], tasks: [], drafts: [] };
  private sprites = new Map<string, AgentSprite>();
  private zones!: RoomZones;
  private floorLayer?: Phaser.GameObjects.Graphics;
  private furnitureLayer?: Phaser.GameObjects.Graphics;
  private roomLabels: Phaser.GameObjects.Text[] = [];
  private notice: Phaser.GameObjects.Text | null = null;
  private taskStatus = new Map<string, string>();
  private draftStatus = new Map<string, string>();
  private nextDecisionAt = new Map<string, number>();

  constructor(callbacks: AgentRoomSceneCallbacks) {
    super("AgentRoomScene");
    this.callbacks = callbacks;
  }

  preload() {
    this.generateAgentTextures();
  }

  create() {
    this.zones = getRoomZones(this.scale.width, this.scale.height);
    this.drawRoom();
    this.scale.on("resize", this.handleResize, this);
    this.setRoomState(this.snapshot);
  }

  setRoomState(snapshot: AgentRoomSnapshot) {
    this.snapshot = snapshot;

    if (!this.scene.isActive()) {
      return;
    }

    this.syncSprites();
    this.syncVisualEvents();
  }

  override update(time: number, delta: number) {
    for (const agent of this.snapshot.agents) {
      const sprite = this.sprites.get(agent.id);
      if (!sprite) {
        continue;
      }

      const intent = getAgentIntent(agent, this.snapshot.tasks, this.snapshot.drafts);
      const hasTarget = Boolean(sprite.getTarget());

      if (!hasTarget && time >= (this.nextDecisionAt.get(agent.id) ?? 0)) {
        const target = this.pickTarget(agent, intent);
        sprite.setTarget(target);
        this.nextDecisionAt.set(agent.id, time + Phaser.Math.Between(2300, agent.slug === "overseer" ? 5400 : 4200));
      }

      sprite.setMode(modeForIntent(intent, Boolean(sprite.getTarget())));
      sprite.update(time, delta);
    }
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
  }

  private pickTarget(agent: Agent, intent: RoomAgentIntent): RoomPoint | null {
    const otherAgents = Array.from(this.sprites.entries())
      .filter(([id]) => id !== agent.id)
      .map(([id, sprite]) => ({
        slug: this.snapshot.agents.find((item) => item.id === id)?.slug ?? "",
        point: sprite.getPosition()
      }));

    return selectTarget({
      agent,
      intent,
      zones: this.zones,
      otherAgents
    });
  }

  private syncSprites() {
    const liveIds = new Set(this.snapshot.agents.map((agent) => agent.id));

    for (const [id, sprite] of this.sprites.entries()) {
      if (!liveIds.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    for (const agent of this.snapshot.agents) {
      const existing = this.sprites.get(agent.id);
      if (existing) {
        existing.updateAgent(agent);
        continue;
      }

      const start =
        agent.slug === "overseer"
          ? randomPointInZone(this.zones.supervisorArea, 42)
          : agent.slug === "linkforge"
            ? randomPointInZone(this.zones.devStation, 42)
            : randomPointInZone(this.zones.socialArea, 42);
      const sprite = new AgentSprite(this, agent, start);
      sprite.container.on("pointerdown", () => this.callbacks.onAgentClick(agent));
      sprite.container.on("pointerover", (_pointer: Phaser.Input.Pointer) => {
        this.callbacks.onAgentHover(agent, {
          x: sprite.container.x,
          y: sprite.container.y - 72
        });
      });
      sprite.container.on("pointerout", () => this.callbacks.onAgentHover(null));
      this.sprites.set(agent.id, sprite);
    }
  }

  private syncVisualEvents() {
    for (const task of this.snapshot.tasks) {
      const previous = this.taskStatus.get(task.id);
      if (previous && previous !== "running" && task.status === "running") {
        this.showNotice("Task started: agent moving to workstation", 0x22d3ee);
      }
      this.taskStatus.set(task.id, task.status);
    }

    for (const draft of this.snapshot.drafts) {
      const previous = this.draftStatus.get(draft.id);
      if (previous && previous !== "waiting_approval" && draft.status === "waiting_approval") {
        this.showNotice("Draft ready on approval board", 0xfbbf24);
      }

      if (previous === "waiting_approval" && draft.status === "approved") {
        this.showNotice("Supervisor board: approved", 0x34d399);
      }

      if (previous === "waiting_approval" && draft.status === "revision_requested") {
        this.showNotice("Supervisor board: revision requested", 0xfb923c);
      }

      this.draftStatus.set(draft.id, draft.status);
    }
  }

  private showNotice(message: string, color: number) {
    this.notice?.destroy();
    this.notice = this.add
      .text(this.scale.width / 2, 28, message, {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold",
        backgroundColor: "rgba(2,6,23,0.82)",
        padding: { x: 12, y: 8 }
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);
    this.notice.setStroke(Phaser.Display.Color.IntegerToColor(color).rgba, 2);
    this.tweens.add({
      targets: this.notice,
      y: 42,
      alpha: { from: 0, to: 1 },
      duration: 220,
      yoyo: true,
      hold: 1800,
      onComplete: () => {
        this.notice?.destroy();
        this.notice = null;
      }
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.zones = getRoomZones(gameSize.width, gameSize.height);
    this.drawRoom();
  }

  private drawRoom() {
    this.floorLayer?.destroy();
    this.furnitureLayer?.destroy();
    for (const label of this.roomLabels) {
      label.destroy();
    }
    this.roomLabels = [];

    const width = this.scale.width;
    const height = this.scale.height;
    this.zones = getRoomZones(width, height);

    const floor = this.add.graphics().setDepth(-20);
    floor.fillGradientStyle(0x020617, 0x06121f, 0x0f172a, 0x020617, 1);
    floor.fillRect(0, 0, width, height);
    floor.lineStyle(1, 0x1e3a8a, 0.24);
    for (let x = 0; x <= width; x += 32) {
      floor.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 32) {
      floor.lineBetween(0, y, width, y);
    }
    floor.lineStyle(2, 0x22d3ee, 0.1);
    for (let y = 0; y <= height; y += 128) {
      floor.lineBetween(0, y, width, y);
    }

    const furniture = this.add.graphics().setDepth(-10);
    for (const item of Object.values(this.zones)) {
      furniture.lineStyle(2, item.accent, 0.36);
      furniture.fillStyle(0x0f172a, 0.42);
      furniture.strokeRoundedRect(item.x, item.y, item.width, item.height, 10);
      furniture.fillRoundedRect(item.x, item.y, item.width, item.height, 10);
      const label = this.add
        .text(item.x + 12, item.y + 10, item.label.toUpperCase(), {
          color: "#94a3b8",
          fontFamily: "monospace",
          fontSize: "11px"
        })
        .setDepth(-9);
      this.roomLabels.push(label);
    }

    this.drawDesk(furniture, this.zones.devStation.x + 28, this.zones.devStation.y + 84, 0x22d3ee);
    this.drawDesk(furniture, this.zones.socialArea.x + 28, this.zones.socialArea.y + 84, 0xfb923c);
    this.drawApprovalBoard(furniture);
    this.drawServerRack(furniture);
    this.drawSupervisorConsole(furniture);

    this.floorLayer = floor;
    this.furnitureLayer = furniture;
  }

  private drawDesk(graphics: Phaser.GameObjects.Graphics, x: number, y: number, accent: number) {
    graphics.fillStyle(0x111827, 0.9);
    graphics.fillRoundedRect(x, y, 210, 58, 8);
    graphics.fillStyle(0x020617, 1);
    graphics.fillRoundedRect(x + 24, y - 46, 68, 42, 4);
    graphics.fillRoundedRect(x + 112, y - 46, 68, 42, 4);
    graphics.lineStyle(2, accent, 0.8);
    graphics.strokeRoundedRect(x + 24, y - 46, 68, 42, 4);
    graphics.strokeRoundedRect(x + 112, y - 46, 68, 42, 4);
    graphics.fillStyle(accent, 0.64);
    graphics.fillRect(x + 36, y - 30, 44, 4);
    graphics.fillRect(x + 124, y - 30, 44, 4);
  }

  private drawApprovalBoard(graphics: Phaser.GameObjects.Graphics) {
    const board = this.zones.approvalBoard;
    graphics.fillStyle(0x111827, 0.92);
    graphics.fillRoundedRect(board.x + 30, board.y + 58, board.width - 60, board.height - 92, 8);
    graphics.lineStyle(2, 0xfbbf24, 0.7);
    graphics.strokeRoundedRect(board.x + 30, board.y + 58, board.width - 60, board.height - 92, 8);
    for (let i = 0; i < 4; i += 1) {
      graphics.fillStyle(i % 2 === 0 ? 0xfbbf24 : 0x22d3ee, 0.24);
      graphics.fillRect(board.x + 54, board.y + 84 + i * 30, board.width - 108, 12);
    }
  }

  private drawServerRack(graphics: Phaser.GameObjects.Graphics) {
    const rack = this.zones.serverRack;
    for (let i = 0; i < 3; i += 1) {
      graphics.fillStyle(0x020617, 0.96);
      graphics.fillRoundedRect(rack.x + 28 + i * 72, rack.y + 58, 54, rack.height - 86, 5);
      graphics.lineStyle(1, 0x34d399, 0.5);
      graphics.strokeRoundedRect(rack.x + 28 + i * 72, rack.y + 58, 54, rack.height - 86, 5);
      for (let y = rack.y + 76; y < rack.y + rack.height - 42; y += 22) {
        graphics.fillStyle(0x34d399, 0.65);
        graphics.fillRect(rack.x + 42 + i * 72, y, 8, 5);
        graphics.fillStyle(0x1e293b, 1);
        graphics.fillRect(rack.x + 56 + i * 72, y, 18, 4);
      }
    }
  }

  private drawSupervisorConsole(graphics: Phaser.GameObjects.Graphics) {
    const zone = this.zones.supervisorArea;
    graphics.fillStyle(0x020617, 0.8);
    graphics.fillRoundedRect(zone.x + 42, zone.y + 62, zone.width - 84, 78, 10);
    graphics.lineStyle(2, 0xa78bfa, 0.65);
    graphics.strokeRoundedRect(zone.x + 42, zone.y + 62, zone.width - 84, 78, 10);
    graphics.fillStyle(0xa78bfa, 0.3);
    graphics.fillRect(zone.x + 66, zone.y + 84, zone.width - 132, 8);
    graphics.fillStyle(0x22d3ee, 0.26);
    graphics.fillRect(zone.x + 66, zone.y + 104, zone.width - 180, 8);
  }

  private generateAgentTextures() {
    if (this.textures.exists("agent-instaspark")) {
      return;
    }

    this.generateCreatureTexture("agent-instaspark", {
      body: 0xfb923c,
      belly: 0xfacc15,
      eye: 0x111827,
      size: 62,
      ears: true
    });
    this.generateCreatureTexture("agent-linkforge", {
      body: 0x22d3ee,
      belly: 0x14b8a6,
      eye: 0x020617,
      size: 60,
      angular: true
    });
    this.generateCreatureTexture("agent-overseer", {
      body: 0xa78bfa,
      belly: 0x22d3ee,
      eye: 0x020617,
      size: 76,
      crown: true
    });
  }

  private generateCreatureTexture(
    key: string,
    options: { body: number; belly: number; eye: number; size: number; ears?: boolean; angular?: boolean; crown?: boolean }
  ) {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const width = 104;
    const height = 104;
    const cx = width / 2;
    const cy = 58;

    graphics.fillStyle(0x000000, 0.28);
    graphics.fillEllipse(cx, 86, options.size, 16);
    graphics.fillStyle(options.body, 1);

    if (options.angular) {
      graphics.fillPoints(
        [
          { x: cx, y: 14 },
          { x: cx + 34, y: 34 },
          { x: cx + 30, y: 76 },
          { x: cx, y: 96 },
          { x: cx - 30, y: 76 },
          { x: cx - 34, y: 34 }
        ],
        true
      );
    } else {
      graphics.fillEllipse(cx, cy, options.size, options.size + 10);
    }

    if (options.ears) {
      graphics.fillTriangle(cx - 30, 36, cx - 44, 12, cx - 14, 28);
      graphics.fillTriangle(cx + 30, 36, cx + 44, 12, cx + 14, 28);
    }

    if (options.crown) {
      graphics.fillStyle(0xf8fafc, 0.85);
      graphics.fillTriangle(cx - 28, 28, cx - 18, 8, cx - 8, 28);
      graphics.fillTriangle(cx - 8, 28, cx, 4, cx + 8, 28);
      graphics.fillTriangle(cx + 8, 28, cx + 18, 8, cx + 28, 28);
      graphics.fillStyle(options.body, 1);
    }

    graphics.fillStyle(options.belly, 0.62);
    graphics.fillEllipse(cx, cy + 12, options.size * 0.52, options.size * 0.44);
    graphics.fillStyle(options.eye, 1);
    graphics.fillCircle(cx - 14, cy - 5, options.size > 70 ? 7 : 6);
    graphics.fillCircle(cx + 14, cy - 5, options.size > 70 ? 7 : 6);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(cx - 12, cy - 8, 2);
    graphics.fillCircle(cx + 16, cy - 8, 2);
    graphics.lineStyle(4, options.eye, 1);
    graphics.beginPath();
    graphics.arc(cx, cy + 14, 10, 0.15, Math.PI - 0.15);
    graphics.strokePath();

    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}
