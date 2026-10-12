import { describe, expect, it } from 'vitest';
import { freshScenario, UNITS } from '../src/data/station';
import type { Scenario, Tenant } from '../src/domain/types';
import { shopTransform } from '../src/domain/shopGeometry';
import {
  agentInFloor, fitMapCamera, hitShopAt, hitUnitAt, mapToWorld, placementAt, worldToMap,
} from '../src/scene/mapProjection';
import type { MapCamera, MapPoint, MapViewport } from '../src/scene/mapProjection';

const unit = (id: string) => UNITS.find(u => u.id === id)!;
const emptyScenario = (): Scenario => ({ ...freshScenario(), tenants: [] });
const tenantAt = (unitId: string, rotation: number): Tenant => ({
  ...freshScenario().tenants[0], unitId, size: 'small', rotation,
});

describe('station map coordinates', () => {
  it('centers the camera, keeps east to the right, and south below', () => {
    const camera: MapCamera = { centerX: 12, centerZ: -7, scale: 8 };
    const viewport: MapViewport = { width: 960, height: 540 };
    expect(worldToMap({ x: 12, z: -7 }, camera, viewport)).toEqual({ x: 480, y: 270 });
    expect(worldToMap({ x: 13.5, z: -4 }, camera, viewport)).toEqual({ x: 492, y: 294 });
    expect(mapToWorld({ x: 456, y: 254 }, camera, viewport)).toEqual({ x: 9, z: -9 });
  });

  it.each([
    { centerX: 0, centerZ: 0, scale: 1 },
    { centerX: -17.25, centerZ: 9.5, scale: 2.75 },
    { centerX: 22, centerZ: -13, scale: 48 },
  ])('roundtrips world and pointer positions after pan and zoom: %o', camera => {
    const viewport = { width: 713, height: 397 };
    for (const point of [{ x: -35, z: -12 }, { x: 0, z: 5.15 }, { x: 33.8, z: 20.75 }]) {
      const actual = mapToWorld(worldToMap(point, camera, viewport), camera, viewport);
      expect(actual.x).toBeCloseTo(point.x, 10);
      expect(actual.z).toBeCloseTo(point.z, 10);
    }
    for (const point of [{ x: 0, y: 0 }, { x: 713, y: 397 }, { x: 182.4, y: 250.75 }]) {
      const actual = worldToMap(mapToWorld(point, camera, viewport), camera, viewport);
      expect(actual.x).toBeCloseTo(point.x, 10);
      expect(actual.y).toBeCloseTo(point.y, 10);
    }
  });

  const extents = {
    all: { minX: -36, maxX: 36, minZ: -13, maxZ: 22 },
    hall: { minX: -30, maxX: 30, minZ: -13, maxZ: 6 },
    platform: { minX: -36, maxX: 36, minZ: 5.15, maxZ: 22 },
  };
  it.each([
    { width: 1280, height: 720 },
    { width: 320, height: 600 },
    { width: 1440, height: 400 },
  ])('fits station corners with padding in every focused view: %o', viewport => {
    for (const view of ['overview', 'top', 'hall', 'platform'] as const) {
      const bounds = extents[view === 'overview' || view === 'top' ? 'all' : view];
      const camera = fitMapCamera(viewport.width, viewport.height, view);
      expect(camera.scale).toBeGreaterThan(0);
      for (const x of [bounds.minX, bounds.maxX]) for (const z of [bounds.minZ, bounds.maxZ]) {
        const projected = worldToMap({ x, z }, camera, viewport);
        expect(projected.x).toBeGreaterThanOrEqual(20 - 1e-8);
        expect(projected.x).toBeLessThanOrEqual(viewport.width - 20 + 1e-8);
        expect(projected.y).toBeGreaterThanOrEqual(20 - 1e-8);
        expect(projected.y).toBeLessThanOrEqual(viewport.height - 20 + 1e-8);
      }
    }
  });

  it('lets the selected floor determine the frame even when the camera preset disagrees', () => {
    expect(fitMapCamera(960, 540, 'platform', 'hall')).toEqual(fitMapCamera(960, 540, 'hall'));
    expect(fitMapCamera(960, 540, 'hall', 'platform')).toEqual(fitMapCamera(960, 540, 'platform'));
    expect(fitMapCamera(960, 540, 'top')).toEqual(fitMapCamera(960, 540, 'overview'));
  });

  it('returns a usable finite camera before a container has a measured size', () => {
    for (const size of [0, -1]) {
      const camera = fitMapCamera(size, size, 'overview');
      expect(Number.isFinite(camera.centerX)).toBe(true);
      expect(Number.isFinite(camera.centerZ)).toBe(true);
      expect(Number.isFinite(camera.scale)).toBe(true);
      expect(camera.scale).toBeGreaterThan(0);
    }
  });
});

describe('commercial slot targeting', () => {
  it('hits each designated slot through its exact inclusive boundary', () => {
    const epsilon = .00001;
    for (const slot of UNITS) {
      expect(hitUnitAt({ x: slot.x, z: slot.z })?.id).toBe(slot.id);
      for (const x of [slot.x - slot.width / 2, slot.x + slot.width / 2]) {
        for (const z of [slot.z - slot.depth / 2, slot.z + slot.depth / 2]) {
          expect(hitUnitAt({ x, z })?.id).toBe(slot.id);
        }
      }
      for (const point of [
        { x: slot.x - slot.width / 2 - epsilon, z: slot.z },
        { x: slot.x + slot.width / 2 + epsilon, z: slot.z },
        { x: slot.x, z: slot.z - slot.depth / 2 - epsilon },
        { x: slot.x, z: slot.z + slot.depth / 2 + epsilon },
      ]) expect(hitUnitAt(point)).toBeNull();
    }
  });

  it.each([
    { x: 0, z: -2.8 }, // Hall through-route.
    { x: 10, z: 4.05 }, // Fare gates.
    { x: 8, z: 6.4 }, // Platform stairs.
    { x: 0, z: 8.8 }, // Near platform.
    { x: 0, z: 13.45 }, // Tracks.
    { x: 0, z: 18.5 }, // Far platform.
    { x: -23, z: -8 }, // Gap just outside a hall slot.
    { x: 1000, z: -1000 },
  ])('keeps protected routes and empty space untargetable: %o', point => {
    expect(hitUnitAt(point)).toBeNull();
    const result = placementAt(point, freshScenario(), 'coffee');
    expect(result.unitId).toBeNull();
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/commercial|designated|slot|route|platform/i);
  });
});

describe('rendered shop targeting', () => {
  const footprints = [
    { unitId: 'U1', rotation: 0, minX: -20.5, maxX: -17.5, minZ: -7.5, maxZ: -5.5, vacant: { x: -19, z: -10 } },
    { unitId: 'U1', rotation: 90, minX: -17.5, maxX: -15.5, minZ: -9.5, maxZ: -6.5, vacant: { x: -22, z: -8 } },
    { unitId: 'U1', rotation: 180, minX: -20.5, maxX: -17.5, minZ: -10.5, maxZ: -8.5, vacant: { x: -19, z: -6 } },
    { unitId: 'U1', rotation: 270, minX: -22.5, maxX: -20.5, minZ: -9.5, maxZ: -6.5, vacant: { x: -16, z: -8 } },
    { unitId: 'U6', rotation: 0, minX: -20.5, maxX: -17.5, minZ: -1, maxZ: 1, vacant: { x: -19, z: 2.8 } },
    { unitId: 'U6', rotation: 90, minX: -18, maxX: -16, minZ: -.5, maxZ: 2.5, vacant: { x: -21.8, z: 1 } },
    { unitId: 'U6', rotation: 180, minX: -20.5, maxX: -17.5, minZ: 1, maxZ: 3, vacant: { x: -19, z: -.8 } },
    { unitId: 'U6', rotation: 270, minX: -22, maxX: -20, minZ: -.5, maxZ: 2.5, vacant: { x: -16.2, z: 1 } },
  ];
  it.each(footprints)('hits the actual $rotation° footprint in $unitId and leaves vacant slot area empty', spec => {
    const tenant = tenantAt(spec.unitId, spec.rotation);
    const scenario = { ...emptyScenario(), tenants: [tenant] };
    const bounds = { minX: spec.minX, maxX: spec.maxX, minZ: spec.minZ, maxZ: spec.maxZ };
    // Explicit metre dimensions guard the shared scene geometry contract too.
    expect(shopTransform(unit(spec.unitId), tenant).bounds).toEqual(bounds);
    const center = { x: (spec.minX + spec.maxX) / 2, z: (spec.minZ + spec.maxZ) / 2 };
    expect(hitShopAt(center, scenario)?.id).toBe(tenant.id);
    for (const x of [spec.minX, spec.maxX]) for (const z of [spec.minZ, spec.maxZ]) {
      expect(hitShopAt({ x, z }, scenario)?.id).toBe(tenant.id);
    }
    expect(hitUnitAt(spec.vacant)?.id).toBe(spec.unitId);
    expect(hitShopAt(spec.vacant, scenario)).toBeNull();
    const justOutside: MapPoint[] = [
      { x: spec.minX - .00001, z: center.z },
      { x: spec.maxX + .00001, z: center.z },
      { x: center.x, z: spec.minZ - .00001 },
      { x: center.x, z: spec.maxZ + .00001 },
    ];
    for (const point of justOutside) expect(hitShopAt(point, scenario)).toBeNull();
  });

  it('returns the clicked tenant among multiple shops and ignores an empty unit', () => {
    const scenario = freshScenario();
    for (const tenant of scenario.tenants) {
      const pose = shopTransform(unit(tenant.unitId), tenant);
      expect(hitShopAt({ x: pose.centerX, z: pose.centerZ }, scenario)?.id).toBe(tenant.id);
    }
    expect(hitShopAt({ x: unit('U3').x, z: unit('U3').z }, scenario)).toBeNull();
  });
});

describe('map placement feedback', () => {
  it('reports occupied, incompatible, oversized, and rotated footprint rejections at the targeted slot', () => {
    const scenario = freshScenario();
    for (const [id, category, size, rotation, reason] of [
      ['U1', 'coffee', 'medium', 0, /occupied/i],
      ['S1', 'meals', 'small', 0, /category|allow/i],
      ['S1', 'coffee', 'large', 0, /small|footprint/i],
      ['S1', 'coffee', 'medium', 90, /small|rotation|footprint/i],
    ] as const) {
      const slot = unit(id);
      expect(placementAt({ x: slot.x, z: slot.z }, scenario, category, size, rotation))
        .toMatchObject({ unitId: id, valid: false, reason: expect.stringMatching(reason) });
    }
  });

  it('accepts a fitting vacant slot and lets the tenant keep or move its own placement', () => {
    const scenario = freshScenario();
    const before = structuredClone(scenario);
    expect(placementAt({ x: -1, z: -8 }, scenario, 'coffee'))
      .toMatchObject({ unitId: 'U3', valid: true, reason: expect.any(String) });
    expect(placementAt({ x: -19, z: -8 }, scenario, 'bakery', 'medium', 0, 'T1'))
      .toMatchObject({ unitId: 'U1', valid: true });
    expect(placementAt({ x: -10, z: 1 }, scenario, 'bakery', 'small', 90, 'T1'))
      .toMatchObject({ unitId: 'S1', valid: true });
    expect(placementAt({ x: -10, z: -8 }, scenario, 'bakery', 'small', 0, 'T1'))
      .toMatchObject({ unitId: 'U2', valid: false, reason: expect.stringMatching(/occupied/i) });
    expect(placementAt({ x: -10, z: 1 }, scenario, 'coffee', 'small', 0, 'missing'))
      .toMatchObject({ unitId: 'S1', valid: false, reason: expect.stringMatching(/exist/i) });
    expect(scenario).toEqual(before);
  });
});

describe('map floor visibility', () => {
  it('uses the same exact concourse/platform boundary as the crowd renderer', () => {
    for (const z of [-12, 0, 5.149999, 5.15, 18.5]) {
      expect(agentInFloor({ z }, 'all')).toBe(true);
      expect(agentInFloor({ z }, 'hall')).toBe(z < 5.15);
      expect(agentInFloor({ z }, 'platform')).toBe(z >= 5.15);
    }
  });
});
