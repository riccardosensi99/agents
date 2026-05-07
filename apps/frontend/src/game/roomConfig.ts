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

const zone = (
  key: RoomZoneKey,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number
): RoomZone => ({ key, label, x, y, width, height, accent });

export function getRoomZones(width: number, height: number): RoomZones {
  const margin = 34;
  return {
    socialArea: zone(
      "socialArea",
      "Social Agents",
      margin,
      height * 0.18,
      width * 0.28,
      height * 0.34,
      0xfb923c
    ),
    devStation: zone(
      "devStation",
      "Dev Stations",
      width * 0.36,
      height * 0.18,
      width * 0.28,
      height * 0.34,
      0x22d3ee
    ),
    approvalBoard: zone(
      "approvalBoard",
      "Approval Board",
      width * 0.68,
      height * 0.16,
      width * 0.26,
      height * 0.32,
      0xfbbf24
    ),
    supervisorArea: zone(
      "supervisorArea",
      "Supervisor",
      width * 0.62,
      height * 0.58,
      width * 0.3,
      height * 0.28,
      0xa78bfa
    ),
    serverRack: zone(
      "serverRack",
      "Infra Rack",
      margin,
      height * 0.6,
      width * 0.22,
      height * 0.26,
      0x34d399
    ),
    wander: zone(
      "wander",
      "Dock Floor",
      width * 0.22,
      height * 0.48,
      width * 0.42,
      height * 0.4,
      0x64748b
    )
  };
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
    return randomPointInZone(zones.socialArea, 44);
  }

  if (slug === "linkforge") {
    return randomPointInZone(zones.devStation, 44);
  }

  if (slug === "overseer") {
    return randomPointInZone(zones.supervisorArea, 44);
  }

  return randomPointInZone(zones.wander, 44);
}
