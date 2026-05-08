import Phaser from "phaser";
import type { Agent } from "../types/domain";
import { getAgentIntent, modeForIntent, selectTarget } from "./agentMovement";
import {
  getRoomLayout,
  randomPointInZone,
  type RoomLayout,
  type RoomObject,
  type RoomZones
} from "./roomConfig";
import { AgentSprite, registerAgentSpriteTextures } from "./AgentSprite";
import type { AgentRoomSceneCallbacks, AgentRoomSnapshot, RoomAgentIntent, RoomPoint } from "./types";

export class AgentRoomScene extends Phaser.Scene {
  private callbacks: AgentRoomSceneCallbacks;
  private snapshot: AgentRoomSnapshot = { agents: [], tasks: [], drafts: [] };
  private sprites = new Map<string, AgentSprite>();
  private zones!: RoomZones;
  private layout!: RoomLayout;
  private floorLayer?: Phaser.GameObjects.Graphics;
  private wallLayer?: Phaser.GameObjects.Graphics;
  private decorLayer?: Phaser.GameObjects.Graphics;
  private foregroundLayer?: Phaser.GameObjects.Graphics;
  private ambientObjects: Phaser.GameObjects.GameObject[] = [];
  private notice: Phaser.GameObjects.Text | null = null;
  private taskStatus = new Map<string, string>();
  private draftStatus = new Map<string, string>();
  private nextDecisionAt = new Map<string, number>();
  private ready = false;

  constructor(callbacks: AgentRoomSceneCallbacks) {
    super("AgentRoomScene");
    this.callbacks = callbacks;
  }

  preload() {
    registerAgentSpriteTextures(this);
  }

  create() {
    this.layout = getRoomLayout(this.scale.width, this.scale.height);
    this.zones = this.layout.zones;
    this.drawRoom();
    this.scale.on("resize", this.handleResize, this);
    this.ready = true;
    this.setRoomState(this.snapshot);
  }

  setRoomState(snapshot: AgentRoomSnapshot) {
    this.snapshot = snapshot;

    if (!this.ready) {
      return;
    }

    this.syncSprites();
    this.syncVisualEvents();
  }

  override update(time: number, delta: number) {
    this.cameras.main.scrollX = Math.sin(time / 3600) * 2;
    this.cameras.main.scrollY = Math.cos(time / 4200) * 2;

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
        this.nextDecisionAt.set(agent.id, time + this.decisionDelayForAgent(agent, intent, Boolean(target)));
      }

      sprite.setMode(modeForIntent(intent, Boolean(sprite.getTarget())));
      sprite.update(time, delta);
    }
  }

  shutdown() {
    this.ready = false;
    this.scale.off("resize", this.handleResize, this);
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.clearAmbientObjects();
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

  private decisionDelayForAgent(agent: Agent, intent: RoomAgentIntent, hasTarget: boolean) {
    if (intent === "stopped_error") {
      return Phaser.Math.Between(3800, 6800);
    }

    if (!hasTarget) {
      return Phaser.Math.Between(1300, agent.slug === "linkforge" ? 4200 : 3000);
    }

    if (agent.slug === "instaspark") {
      return Phaser.Math.Between(2600, 4700);
    }

    if (agent.slug === "overseer") {
      return Phaser.Math.Between(5800, 9400);
    }

    if (agent.slug === "linkforge") {
      return Phaser.Math.Between(5200, 8600);
    }

    return Phaser.Math.Between(4200, 7200);
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
          ? randomPointInZone(this.zones.supervisorArea, 30)
          : agent.slug === "linkforge"
            ? randomPointInZone(this.zones.devStation, 30)
            : randomPointInZone(this.zones.socialArea, 30);
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
      .text(this.scale.width / 2, 26, message, {
        color: "#fff7ed",
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold",
        backgroundColor: "rgba(41, 24, 18, 0.88)",
        padding: { x: 14, y: 9 }
      })
      .setOrigin(0.5, 0)
      .setDepth(2000);
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
    this.layout = getRoomLayout(gameSize.width, gameSize.height);
    this.zones = this.layout.zones;
    this.drawRoom();
  }

  private drawRoom() {
    this.floorLayer?.destroy();
    this.wallLayer?.destroy();
    this.decorLayer?.destroy();
    this.foregroundLayer?.destroy();
    this.clearAmbientObjects();

    this.layout = getRoomLayout(this.scale.width, this.scale.height);
    this.zones = this.layout.zones;

    this.drawWarmBackground();
    this.drawWalls();
    this.drawTiledFloor();
    this.drawBackWallDetails();
    this.drawFurniture();
    this.drawForegroundDetails();
  }

  private drawWarmBackground() {
    const width = this.scale.width;
    const height = this.scale.height;
    const background = this.add.graphics().setDepth(-80);
    background.fillGradientStyle(0x140f1d, 0x101827, 0x271b2d, 0x111827, 1);
    background.fillRect(0, 0, width, height);
    background.fillStyle(0xf59e0b, 0.035);
    background.fillEllipse(width * 0.18, height * 0.16, 420, 260);
    background.fillStyle(0x38bdf8, 0.035);
    background.fillEllipse(width * 0.82, height * 0.22, 380, 260);
    this.floorLayer = background;
  }

  private drawWalls() {
    const { room } = this.layout;
    const wall = this.add.graphics().setDepth(-60);

    wall.fillStyle(0x2b1c2c, 1);
    wall.fillRoundedRect(room.x, room.y, room.width, room.height, 22);
    wall.lineStyle(4, 0x4c2f34, 1);
    wall.strokeRoundedRect(room.x, room.y, room.width, room.height, 22);

    wall.fillGradientStyle(0x58362f, 0x44283a, 0x24162a, 0x2b1c2c, 1);
    wall.fillRoundedRect(room.x + 16, room.y + 14, room.width - 32, room.height * 0.23, 16);

    wall.fillStyle(0x1f2937, 0.92);
    wall.fillRect(room.x + 18, room.y + room.height * 0.22, room.width - 36, 12);
    wall.fillStyle(0xfbbf24, 0.16);
    wall.fillRect(room.x + 48, room.y + room.height * 0.22 + 2, room.width - 96, 3);

    this.wallLayer = wall;
  }

  private drawTiledFloor() {
    const { room } = this.layout;
    const floor = this.add.graphics().setDepth(-50);
    const floorTop = room.y + room.height * 0.23;
    const tile = 38;

    floor.fillGradientStyle(0x3b2f37, 0x332838, 0x1f2937, 0x2a2331, 1);
    floor.fillRoundedRect(room.x + 18, floorTop, room.width - 36, room.height - room.height * 0.23 - 18, 14);

    for (let y = floorTop + 12; y < room.y + room.height - 24; y += tile) {
      for (let x = room.x + 28; x < room.x + room.width - 28; x += tile) {
        const variation = (Math.round(x / tile) + Math.round(y / tile)) % 2 === 0;
        floor.fillStyle(variation ? 0x3f3440 : 0x352d3a, 0.72);
        floor.fillRect(x, y, tile - 2, tile - 2);
        floor.fillStyle(0xffffff, variation ? 0.025 : 0.012);
        floor.fillRect(x + 2, y + 2, tile - 10, 4);
      }
    }

    floor.lineStyle(1, 0x111827, 0.22);
    for (let x = room.x + 28; x < room.x + room.width - 28; x += tile) {
      floor.lineBetween(x, floorTop + 10, x, room.y + room.height - 26);
    }
    for (let y = floorTop + 10; y < room.y + room.height - 26; y += tile) {
      floor.lineBetween(room.x + 28, y, room.x + room.width - 28, y);
    }

    floor.fillStyle(0xf59e0b, 0.055);
    floor.fillEllipse(room.x + room.width * 0.25, room.y + room.height * 0.62, 340, 140);
    floor.fillStyle(0x38bdf8, 0.045);
    floor.fillEllipse(room.x + room.width * 0.66, room.y + room.height * 0.58, 360, 150);
  }

  private drawBackWallDetails() {
    const { objects, room } = this.layout;
    const decor = this.add.graphics().setDepth(-42);
    const screen = objects.mainScreen;

    this.drawMainScreen(decor, screen);
    this.drawWallPanel(decor, room.x + 70, room.y + 42, 150, 80, 0xfb923c);
    this.drawWallPanel(decor, room.x + room.width - 220, room.y + 42, 150, 80, 0x34d399);
    this.drawServerCorner(decor);

    decor.fillStyle(0xffedd5, 0.35);
    for (let i = 0; i < 5; i += 1) {
      decor.fillRoundedRect(room.x + room.width * 0.22 + i * 118, room.y + 24, 54, 10, 4);
    }

    this.decorLayer = decor;
  }

  private drawFurniture() {
    const { objects } = this.layout;
    const furniture = this.add.graphics().setDepth(-5);

    this.drawDesk(furniture, objects.socialDesk, "SOCIAL", true);
    this.drawDesk(furniture, objects.devDesk, "DEV", true);
    this.drawSupervisorConsole(furniture, objects.supervisorDesk);
    this.drawApprovalBoard(furniture, objects.approvalBoardObject);
    this.drawMeetingTable(furniture, objects.meetingTable);
    this.drawCoffeeBar(furniture, objects.coffeeBar);
    this.drawPlant(furniture, objects.leftPlant);
    this.drawPlant(furniture, objects.rightPlant);

    this.foregroundLayer = furniture;
    this.drawObjectOccluders();
  }

  private drawForegroundDetails() {
    const { room } = this.layout;
    const glow = this.add.graphics().setDepth(900);
    glow.fillStyle(0x020617, 0.18);
    glow.fillRoundedRect(room.x + 18, room.y + room.height - 36, room.width - 36, 12, 6);
    glow.fillStyle(0xfbbf24, 0.06);
    glow.fillEllipse(room.x + room.width * 0.5, room.y + room.height - 78, room.width * 0.64, 70);
    this.ambientObjects.push(glow);
  }

  private drawMainScreen(graphics: Phaser.GameObjects.Graphics, screen: RoomObject) {
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillRoundedRect(screen.x, screen.y, screen.width, screen.height, 10);
    graphics.lineStyle(3, screen.accent, 0.8);
    graphics.strokeRoundedRect(screen.x, screen.y, screen.width, screen.height, 10);
    graphics.fillGradientStyle(0x0c4a6e, 0x111827, 0x312e81, 0x0f172a, 1);
    graphics.fillRoundedRect(screen.x + 10, screen.y + 10, screen.width - 20, screen.height - 20, 7);
    graphics.fillStyle(0x38bdf8, 0.22);
    graphics.fillRect(screen.x + 28, screen.y + 30, screen.width - 56, 6);
    graphics.fillStyle(0xfbbf24, 0.18);
    graphics.fillRect(screen.x + 28, screen.y + 50, screen.width * 0.42, 6);

    const title = this.add
      .text(screen.x + screen.width / 2, screen.y + 22, "AGENT DOCK", {
        color: "#e0f2fe",
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0)
      .setDepth(-41);
    this.ambientObjects.push(title);
  }

  private drawWallPanel(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, accent: number) {
    graphics.fillStyle(0x1f2937, 0.72);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(2, accent, 0.28);
    graphics.strokeRoundedRect(x, y, width, height, 8);
    graphics.fillStyle(accent, 0.18);
    graphics.fillRect(x + 16, y + 20, width - 32, 6);
    graphics.fillRect(x + 16, y + 40, width * 0.54, 6);
  }

  private drawServerCorner(graphics: Phaser.GameObjects.Graphics) {
    const rack = this.layout.zones.serverRack;
    for (let i = 0; i < 2; i += 1) {
      const x = rack.x + i * 58;
      graphics.fillStyle(0x111827, 0.96);
      graphics.fillRoundedRect(x, rack.y, 48, rack.height, 6);
      graphics.lineStyle(2, 0x34d399, 0.28);
      graphics.strokeRoundedRect(x, rack.y, 48, rack.height, 6);
      for (let y = rack.y + 18; y < rack.y + rack.height - 14; y += 22) {
        graphics.fillStyle(0x34d399, 0.72);
        graphics.fillRect(x + 10, y, 8, 5);
        graphics.fillStyle(0x475569, 0.8);
        graphics.fillRect(x + 23, y, 14, 4);
      }
    }
  }

  private drawDesk(graphics: Phaser.GameObjects.Graphics, desk: RoomObject, _label: string, doubleMonitor = false) {
    this.drawObjectShadow(graphics, desk.x + desk.width / 2, desk.y + desk.height - 8, desk.width * 0.92, 34);
    graphics.fillStyle(0x5b3b2f, 1);
    graphics.fillRoundedRect(desk.x, desk.y + 56, desk.width, 58, 10);
    graphics.fillStyle(0x8b5a3c, 1);
    graphics.fillRoundedRect(desk.x + 8, desk.y + 46, desk.width - 16, 28, 8);
    graphics.fillStyle(0x2f1f1b, 0.9);
    graphics.fillRoundedRect(desk.x + 18, desk.y + 80, 40, 44, 6);
    graphics.fillRoundedRect(desk.x + desk.width - 58, desk.y + 80, 40, 44, 6);

    const monitorWidth = doubleMonitor ? 58 : 86;
    const firstMonitorX = desk.x + desk.width / 2 - (doubleMonitor ? 66 : 43);
    this.drawMonitor(graphics, firstMonitorX, desk.y + 10, monitorWidth, 44, desk.accent);
    if (doubleMonitor) {
      this.drawMonitor(graphics, firstMonitorX + 74, desk.y + 10, monitorWidth, 44, desk.accent);
    }

    graphics.fillStyle(desk.accent, 0.28);
    graphics.fillRoundedRect(desk.x + desk.width / 2 - 52, desk.y + 86, 104, 10, 4);
    graphics.fillStyle(0x111827, 0.72);
    graphics.fillRoundedRect(desk.x + desk.width / 2 - 28, desk.y + 100, 56, 8, 4);

    graphics.fillStyle(0xfed7aa, 0.18);
    graphics.fillRoundedRect(desk.x + desk.width / 2 - 26, desk.y + 116, 52, 5, 3);
  }

  private drawMonitor(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, accent: number) {
    graphics.fillStyle(0x020617, 1);
    graphics.fillRoundedRect(x, y, width, height, 5);
    graphics.lineStyle(2, accent, 0.55);
    graphics.strokeRoundedRect(x, y, width, height, 5);
    graphics.fillStyle(accent, 0.22);
    graphics.fillRect(x + 10, y + 14, width - 20, 4);
    graphics.fillStyle(0xffffff, 0.12);
    graphics.fillRect(x + 10, y + 26, width * 0.46, 4);
    graphics.fillStyle(0x111827, 1);
    graphics.fillRect(x + width / 2 - 5, y + height, 10, 13);
  }

  private drawSupervisorConsole(graphics: Phaser.GameObjects.Graphics, desk: RoomObject) {
    this.drawObjectShadow(graphics, desk.x + desk.width / 2, desk.y + desk.height - 4, desk.width, 40);
    graphics.fillStyle(0x3b2f57, 1);
    graphics.fillRoundedRect(desk.x, desk.y + 60, desk.width, 74, 14);
    graphics.fillStyle(0x6d4ca0, 0.9);
    graphics.fillRoundedRect(desk.x + 10, desk.y + 42, desk.width - 20, 42, 12);
    this.drawMonitor(graphics, desk.x + 28, desk.y + 6, 78, 52, desk.accent);
    this.drawMonitor(graphics, desk.x + desk.width - 106, desk.y + 6, 78, 52, desk.accent);
    graphics.fillStyle(0xa78bfa, 0.28);
    graphics.fillRoundedRect(desk.x + desk.width / 2 - 70, desk.y + 94, 140, 12, 5);
  }

  private drawApprovalBoard(graphics: Phaser.GameObjects.Graphics, board: RoomObject) {
    this.drawObjectShadow(graphics, board.x + board.width / 2, board.y + board.height - 4, board.width * 0.86, 28);
    graphics.fillStyle(0x3d2c1d, 1);
    graphics.fillRoundedRect(board.x, board.y, board.width, board.height, 10);
    graphics.fillStyle(0x111827, 0.96);
    graphics.fillRoundedRect(board.x + 12, board.y + 12, board.width - 24, board.height - 24, 8);
    graphics.lineStyle(2, board.accent, 0.58);
    graphics.strokeRoundedRect(board.x + 12, board.y + 12, board.width - 24, board.height - 24, 8);

    for (let i = 0; i < 4; i += 1) {
      graphics.fillStyle(i % 2 === 0 ? 0xfbbf24 : 0x60a5fa, 0.26);
      graphics.fillRoundedRect(board.x + 28, board.y + 30 + i * 22, board.width - 56, 9, 3);
    }
  }

  private drawMeetingTable(graphics: Phaser.GameObjects.Graphics, table: RoomObject) {
    this.drawObjectShadow(graphics, table.x + table.width / 2, table.y + table.height / 2 + 18, table.width * 0.84, 42);
    graphics.fillStyle(0x6b4f3a, 1);
    graphics.fillEllipse(table.x + table.width / 2, table.y + table.height / 2, table.width, table.height);
    graphics.lineStyle(3, 0xb88958, 0.9);
    graphics.strokeEllipse(table.x + table.width / 2, table.y + table.height / 2, table.width, table.height);
    graphics.fillStyle(0xfbbf24, 0.16);
    graphics.fillEllipse(table.x + table.width / 2, table.y + table.height / 2 - 4, table.width * 0.62, table.height * 0.38);

    for (let i = 0; i < 4; i += 1) {
      const chairX = table.x + table.width * (0.22 + i * 0.19);
      graphics.fillStyle(0x334155, 0.95);
      graphics.fillRoundedRect(chairX, table.y + table.height + 2, 28, 18, 5);
    }
  }

  private drawCoffeeBar(graphics: Phaser.GameObjects.Graphics, bar: RoomObject) {
    this.drawObjectShadow(graphics, bar.x + bar.width / 2, bar.y + bar.height - 4, bar.width * 0.9, 28);
    graphics.fillStyle(0x5b3b2f, 1);
    graphics.fillRoundedRect(bar.x, bar.y + 38, bar.width, 56, 10);
    graphics.fillStyle(0x8b5a3c, 1);
    graphics.fillRoundedRect(bar.x + 8, bar.y + 24, bar.width - 16, 22, 8);
    graphics.fillStyle(0xf59e0b, 0.28);
    graphics.fillRoundedRect(bar.x + 18, bar.y + 48, bar.width - 36, 10, 4);
    graphics.fillStyle(0x111827, 1);
    graphics.fillRoundedRect(bar.x + bar.width - 52, bar.y + 2, 34, 34, 6);
    graphics.fillStyle(0xfbbf24, 0.7);
    graphics.fillRect(bar.x + bar.width - 42, bar.y + 14, 14, 4);
  }

  private drawPlant(graphics: Phaser.GameObjects.Graphics, plant: RoomObject) {
    this.drawObjectShadow(graphics, plant.x + plant.width / 2, plant.y + plant.height - 6, 54, 18);
    graphics.fillStyle(0x7c2d12, 1);
    graphics.fillRoundedRect(plant.x + 12, plant.y + 54, plant.width - 24, 30, 6);
    graphics.fillStyle(0x166534, 1);
    graphics.fillEllipse(plant.x + plant.width / 2, plant.y + 34, 42, 48);
    graphics.fillStyle(0x22c55e, 0.88);
    graphics.fillEllipse(plant.x + plant.width / 2 - 16, plant.y + 44, 30, 36);
    graphics.fillEllipse(plant.x + plant.width / 2 + 16, plant.y + 44, 30, 36);
  }

  private drawObjectShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number) {
    graphics.fillStyle(0x020617, 0.24);
    graphics.fillEllipse(x, y, width, height);
  }

  private drawObjectOccluders() {
    const { objects } = this.layout;

    this.drawDeskOccluder(objects.socialDesk);
    this.drawDeskOccluder(objects.devDesk);
    this.drawSupervisorOccluder(objects.supervisorDesk);
    this.drawApprovalBoardOccluder(objects.approvalBoardObject);
    this.drawMeetingTableOccluder(objects.meetingTable);
    this.drawCoffeeBarOccluder(objects.coffeeBar);
    this.drawPlantOccluder(objects.leftPlant);
    this.drawPlantOccluder(objects.rightPlant);
  }

  private drawDeskOccluder(desk: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(desk.y + desk.height - 10));
    front.fillStyle(0x3a241e, 0.92);
    front.fillRoundedRect(desk.x + 10, desk.y + 82, desk.width - 20, 36, 8);
    front.fillStyle(0xb8794d, 0.95);
    front.fillRoundedRect(desk.x + 18, desk.y + 78, desk.width - 36, 11, 5);
    front.fillStyle(desk.accent, 0.24);
    front.fillRoundedRect(desk.x + desk.width / 2 - 42, desk.y + 93, 84, 7, 3);
    front.fillStyle(0x1f2937, 0.74);
    front.fillRoundedRect(desk.x + 26, desk.y + 101, 34, 15, 4);
    front.fillRoundedRect(desk.x + desk.width - 60, desk.y + 101, 34, 15, 4);
    this.ambientObjects.push(front);
  }

  private drawSupervisorOccluder(desk: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(desk.y + desk.height - 8));
    front.fillStyle(0x271545, 0.94);
    front.fillRoundedRect(desk.x + 8, desk.y + 84, desk.width - 16, 52, 12);
    front.fillStyle(0x8b5cf6, 0.28);
    front.fillRoundedRect(desk.x + 26, desk.y + 99, desk.width - 52, 10, 5);
    front.fillStyle(0x111827, 0.72);
    front.fillRoundedRect(desk.x + desk.width / 2 - 34, desk.y + 115, 68, 9, 4);
    this.ambientObjects.push(front);
  }

  private drawApprovalBoardOccluder(board: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(board.y + board.height - 4));
    front.fillStyle(0x24150d, 0.88);
    front.fillRoundedRect(board.x + 8, board.y + board.height - 34, board.width - 16, 28, 7);
    front.fillStyle(board.accent, 0.26);
    front.fillRoundedRect(board.x + 28, board.y + board.height - 23, board.width - 56, 7, 3);
    this.ambientObjects.push(front);
  }

  private drawMeetingTableOccluder(table: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(table.y + table.height / 2 + 22));
    front.fillStyle(0x5a3f2c, 0.9);
    front.fillEllipse(table.x + table.width / 2, table.y + table.height / 2 + 10, table.width * 0.88, table.height * 0.44);
    front.lineStyle(2, 0xc79a62, 0.52);
    front.strokeEllipse(table.x + table.width / 2, table.y + table.height / 2 + 10, table.width * 0.88, table.height * 0.44);
    this.ambientObjects.push(front);
  }

  private drawCoffeeBarOccluder(bar: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(bar.y + bar.height - 4));
    front.fillStyle(0x3d281f, 0.92);
    front.fillRoundedRect(bar.x + 8, bar.y + 55, bar.width - 16, 42, 8);
    front.fillStyle(0xf59e0b, 0.2);
    front.fillRoundedRect(bar.x + 24, bar.y + 68, bar.width - 48, 7, 3);
    this.ambientObjects.push(front);
  }

  private drawPlantOccluder(plant: RoomObject) {
    const front = this.add.graphics().setDepth(Math.round(plant.y + plant.height - 2));
    front.fillStyle(0x15803d, 0.92);
    front.fillEllipse(plant.x + plant.width / 2 - 13, plant.y + 48, 24, 30);
    front.fillEllipse(plant.x + plant.width / 2 + 14, plant.y + 48, 24, 30);
    front.fillStyle(0x7c2d12, 1);
    front.fillRoundedRect(plant.x + 10, plant.y + 59, plant.width - 20, 28, 6);
    front.fillStyle(0xf59e0b, 0.22);
    front.fillRoundedRect(plant.x + 15, plant.y + 66, plant.width - 30, 5, 3);
    this.ambientObjects.push(front);
  }

  private clearAmbientObjects() {
    for (const item of this.ambientObjects) {
      item.destroy();
    }
    this.ambientObjects = [];
  }

}
