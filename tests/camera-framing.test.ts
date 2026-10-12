import { describe, expect, it } from 'vitest';
import { cameraFrame, cameraFrustum, frameCorners, projectFramePoint, shopCameraFrame, mapFrameBounds, fitBoundsMapCamera, resizeMapCamera } from '../src/scene/cameraFraming';
import { worldToMap } from '../src/scene/mapProjection';

const viewports = [{width:1200,height:900},{width:1600,height:600},{width:360,height:640}];

describe('responsive station camera framing', () => {
  it.each(viewports)('fits the complete station and platform bounds at %o', size => {
    for (const view of ['overview','top','platform'] as const) {
      const frame=cameraFrame(view),frustum=cameraFrustum(frame,size.width,size.height);
      expect(frustum.right/frustum.top).toBeCloseTo(size.width/size.height,8);
      for (const corner of frameCorners(frame.bounds)) {
        const projected=projectFramePoint(corner,frame);
        expect(Math.abs(projected.x)).toBeLessThan(frustum.right);
        expect(Math.abs(projected.y)).toBeLessThan(frustum.top);
      }
    }
  });

  it('makes the default hall neighborhood and explicit shop visibly closer than the station overview', () => {
    const size={width:1200,height:900};
    const overview=cameraFrustum(cameraFrame('overview'),size.width,size.height);
    const hall=cameraFrustum(cameraFrame('hall'),size.width,size.height);
    const shop=cameraFrustum(shopCameraFrame({x:-10,y:1,z:-6.5}),size.width,size.height);
    expect(hall.top).toBeLessThan(overview.top*.65);
    expect(shop.top).toBeLessThan(hall.top*.8);
    // The frame contains neighboring frontage and the queue immediately ahead.
    expect(shopCameraFrame({x:-10,y:1,z:-6.5}).bounds).toMatchObject({minX:-20,maxX:0,minZ:-11.5,maxZ:1.5});
  });

  it.each(viewports)('keeps a shop, nearby storefronts and queue within its explicit close frame at %o', size => {
    const frame=shopCameraFrame({x:18,y:1,z:1}),frustum=cameraFrustum(frame,size.width,size.height);
    for (const point of frameCorners(frame.bounds)) {
      const projected=projectFramePoint(point,frame);
      expect(Math.abs(projected.x)).toBeLessThan(frustum.right);
      expect(Math.abs(projected.y)).toBeLessThan(frustum.top);
    }
  });

  it('frames the visible floor when the old preset disagrees', () => {
    expect(cameraFrame('hall','platform')).toEqual(cameraFrame('platform'));
    expect(cameraFrame('platform','hall')).toEqual(cameraFrame('hall'));
  });

  it.each([0,-1,NaN,Infinity,-Infinity])('returns finite nonzero framing for unmeasured/invalid sizes (%s)', size => {
    for (const pair of [[size,size],[size,640],[960,size]]) {
      const frame=cameraFrustum(cameraFrame('overview'),pair[0],pair[1]);
      for (const value of Object.values(frame)) expect(Number.isFinite(value)).toBe(true);
      expect(frame.right).toBeGreaterThan(0);expect(frame.top).toBeGreaterThan(0);
    }
  });
});

describe('2D camera parity and resizing', () => {
  it.each(viewports)('fits the same selected neighborhood and full-station map bounds at %o', size => {
    for (const view of ['hall','overview','platform','top'] as const) {
      const bounds=mapFrameBounds(view,'all'),camera=fitBoundsMapCamera(bounds,size.width,size.height);
      for (const x of [bounds.minX,bounds.maxX]) for (const z of [bounds.minZ,bounds.maxZ]) {
        const projected=worldToMap({x,z},camera,size);
        expect(projected.x).toBeGreaterThanOrEqual(20-1e-8);
        expect(projected.x).toBeLessThanOrEqual(size.width-20+1e-8);
        expect(projected.y).toBeGreaterThanOrEqual(20-1e-8);
        expect(projected.y).toBeLessThanOrEqual(size.height-20+1e-8);
      }
    }
  });

  it('preserves pan and user zoom relative to framing when the surface changes aspect', () => {
    const bounds=mapFrameBounds('hall','all');
    const first=fitBoundsMapCamera(bounds,1200,900),second=fitBoundsMapCamera(bounds,360,640);
    const panned={centerX:first.centerX+8,centerZ:first.centerZ-3,scale:first.scale*2.4};
    const resized=resizeMapCamera(panned,first.scale,second.scale);
    expect(resized.centerX).toBe(panned.centerX);expect(resized.centerZ).toBe(panned.centerZ);
    expect(resized.scale/second.scale).toBeCloseTo(2.4,10);
  });

  it('does not mistake a floor filter for a request to return to a distant overview', () => {
    expect(mapFrameBounds('hall','hall')).toEqual(mapFrameBounds('hall','all'));
    expect(mapFrameBounds('platform','hall')).toEqual(mapFrameBounds('hall','all'));
    expect(mapFrameBounds('hall','platform')).toEqual(mapFrameBounds('platform','all'));
  });

  it.each([0,-1,NaN,Infinity,-Infinity])('guards invalid map measurements and previous scale (%s)', size => {
    const map=fitBoundsMapCamera(mapFrameBounds('overview','all'),size,size);
    expect(map.scale).toBeGreaterThan(0);expect(Number.isFinite(map.scale)).toBe(true);
    const resized=resizeMapCamera({centerX:8,centerZ:4,scale:12},size,map.scale);
    expect(resized.centerX).toBe(8);expect(resized.centerZ).toBe(4);
    expect(resized.scale).toBeGreaterThan(0);expect(Number.isFinite(resized.scale)).toBe(true);
  });
});
