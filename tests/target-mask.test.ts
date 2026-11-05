import {describe,it,expect} from 'vitest';
import {chooseTargetMask} from '../src/lib/target-mask';
describe('target mask validation',()=>{
 it('rejects a higher-scoring candidate which includes an excluded object',()=>{
  const masks=[0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0];
  expect(Array.from(chooseTargetMask(masks,[.99,.8],4,2,[{x:.3,y:.1,label:1},{x:.6,y:.1,label:0}]))).toEqual([0,255,0,0,0,0,0,0]);
 });
 it('fails closed when every candidate cuts away the selected garment',()=>{
  expect(()=>chooseTargetMask([0,0,1,0],[.99],2,2,[{x:0,y:0,label:1}])).toThrow('未正确区分');
 });
 it('rejects a whole-image mask rather than presenting it as a cutout',()=>{
  expect(()=>chooseTargetMask([1,1,1,1],[.99],2,2,[{x:0,y:0,label:1}])).toThrow('范围异常');
 });
});
