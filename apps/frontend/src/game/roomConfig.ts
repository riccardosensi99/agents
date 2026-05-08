import Phaser from "phaser";
import type { RoomPoint } from "./types";

export const ROOM_POLL_INTERVAL_MS = 5000;

export type RoomZoneKey =
  | "socialArea"
  | "devStation"
  | "approvalBoard"
  | "supervisorArea"
  | "serverRack"
  | "wander";

export type RoomZone = {
  key: RoomZoneKey;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: number;
};

export type RoomZones = Record<RoomZoneKey, RoomZone>;

export type RoomObjectKey =
  | "backWall"
  | "mainScreen"
  | "socialDesk"
  | "devDesk"
  | "supervisorDesk"
  | "approvalBoardObject"
  | "meetingTable"
  | "coffeeBar"
  | "leftPlant"
  | "rightPlant";

export type RoomObject = {
  key: RoomObjectKey;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: number;
};

export type RoomLayout = {
  width: number;
  height: number;
  room: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  objects: Record<RoomObjectKey, RoomObject>;
  zones: RoomZones;
};

const zone = (
  key: RoomZoneKey,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number
): RoomZone => ({ key, label, x, y, width, height, accent });

const object = (
  key: RoomObjectKey,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number
): RoomObject => ({ key, x, y, width, height, accent });

export function getRoomLayout(width: number, height: number): RoomLayout {
  const roomWidth = Math.min(width - 48, 1180);
  const roomHeight = Math.min(height - 44, 720);
  const roomX = (width - roomWidth) / 2;
  const roomY = Math.max(20, (height - roomHeight) / 2);

  const top = roomY + 34;
  const left = roomX + 42;
  const right = roomX + roomWidth - 42;
  const deskY = roomY + roomHeight * 0.27;
  const bottomY = roomY + roomHeight * 0.7;
  const deskWidth = roomWidth * 0.24;

  const objects: Record<RoomObjectKey, RoomObject> = {
    backWall: object("backWall", roomX, roomY, roomWidth, roomHeight * 0.22, 0x7c3aed),
    mainScreen: object("mainScreen", roomX + roomWidth * 0.34, top, roomWidth * 0.32, 86, 0x38bdf8),
    socialDesk: object("socialDesk", left, deskY, deskWidth, 132, 0xfb923c),
    devDesk: object("devDesk", roomX + roomWidth * 0.38, deskY + 18, deskWidth, 132, 0x22d3ee),
    supervisorDesk: object("supervisorDesk", right - deskWidth, deskY, deskWidth, 148, 0xa78bfa),
    approvalBoardObject: object("approvalBoardObject", roomX + roomWidth * 0.53, bottomY, roomWidth * 0.22, 128, 0xfbbf24),
    meetingTable: object("meetingTable", roomX + roomWidth * 0.28, bottomY + 34, roomWidth * 0.2, 92, 0x60a5fa),
    coffeeBar: object("coffeeBar", left, bottomY + 18, roomWidth * 0.16, 106, 0xf59e0b),
    leftPlant: object("leftPlant", roomX + 26, roomY + roomHeight - 118, 52, 86, 0x34d399),
    rightPlant: object("rightPlant", roomX + roomWidth - 78, roomY + roomHeight - 118, 52, 86, 0x34d399)
  };

  const zones: RoomZones = {
    socialArea: zone(
      "socialArea",
      "InstaSpark desk",
      objects.socialDesk.x + 18,
      objects.socialDesk.y + 84,
      objects.socialDesk.width - 36,
      112,
      0xfb923c
    ),
    devStation: zone(
      "devStation",
      "LinkForge desk",
      objects.devDesk.x + 18,
      objects.devDesk.y + 84,
      objects.devDesk.width - 36,
      112,
      0x22d3ee
    ),
    approvalBoard: zone(
      "approvalBoard",
      "Approval lounge",
      objects.approvalBoardObject.x - 18,
      objects.approvalBoardObject.y + 70,
      objects.approvalBoardObject.width + 36,
      126,
      0xfbbf24
    ),
    supervisorArea: zone(
      "supervisorArea",
      "Overseer console",
      objects.supervisorDesk.x + 18,
      objects.supervisorDesk.y + 94,
      objects.supervisorDesk.width - 36,
      126,
      0xa78bfa
    ),
    serverRack: zone(
      "serverRack",
      "Infra corner",
      roomX + roomWidth - 190,
      roomY + 78,
      136,
      150,
      0x34d399
    ),
    wander: zone(
      "wander",
      "Office floor",
      roomX + roomWidth * 0.18,
      roomY + roomHeight * 0.46,
      roomWidth * 0.58,
      roomHeight * 0.34,
      0x94a3b8
    )
  };

  return {
    width,
    height,
    room: {
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight
    },
    objects,
    zones
  };
}

export function getRoomZones(width: number, height: number): RoomZones {
  return getRoomLayout(width, height).zones;
}

export function zoneCenter(zoneValue: RoomZone): RoomPoint {
  return {
    x: zoneValue.x + zoneValue.width / 2,
    y: zoneValue.y + zoneValue.height / 2
  };
}

export function randomPointInZone(zoneValue: RoomZone, padding = 28): RoomPoint {
  const xMin = zoneValue.x + padding;
  const xMax = zoneValue.x + zoneValue.width - padding;
  const yMin = zoneValue.y + padding;
  const yMax = zoneValue.y + zoneValue.height - padding;

  return {
    x: Phaser.Math.Between(Math.round(xMin), Math.round(Math.max(xMin, xMax))),
    y: Phaser.Math.Between(Math.round(yMin), Math.round(Math.max(yMin, yMax)))
  };
}

export function stationPointForAgent(slug: string, zones: RoomZones): RoomPoint {
  if (slug === "instaspark") {
    return randomPointInZone(zones.socialArea, 22);
  }

  if (slug === "linkforge") {
    return randomPointInZone(zones.devStation, 24);
  }

  if (slug === "overseer") {
    return randomPointInZone(zones.supervisorArea, 30);
  }

  return randomPointInZone(zones.wander, 34);
}
