import {describe,it,expect,vi} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
function editor(api:Record<string,unknown>){
 let page:Record<string,unknown>={};
 const wx={enableAlertBeforeUnload:vi.fn(),disableAlertBeforeUnload:vi.fn()};
 vm.runInNewContext(fs.readFileSync('miniprogram/pages/edit/index.js','utf8'),{require:(name:string)=>name.includes('vocabulary')?{categories:[{id:'top'}]}:api,Page:(p:Record<string,unknown>)=>{page=p;},wx});
 // Runtime page instance provided by the native host.
 const p=page as {data:Record<string,unknown>;setData:(patch:Record<string,unknown>)=>void;[key:string]:unknown};
 p.setData=patch=>Object.assign(p.data,patch);
 return p;
}
describe('native clothing editor workflow',()=>{
 it('loads a saved item by id without changing its original',async()=>{
 const item={id:'owned',name:'衬衫',category:'top',colors:['米色'],image:'original'};
 const request=vi.fn(async()=>({item}));const p=editor({request,image:async()=>'/temp/photo'});
 await (p.load as (id:string)=>Promise<void>).call(p,'owned');
 expect(request).toHaveBeenCalledWith('/api/items/owned');expect(p.data.draft).toEqual(item);expect(p.data.photo).toBe('/temp/photo');
 });
 it('uses the extracted image for cartoon generation and waits for approval',async()=>{
 const request=vi.fn(async()=>({image:'cartoon-new'}));const p=editor({request,image:async()=>'/temp/result',error:(e:Error)=>e.message});
 p.data.draft={name:'衬衫',category:'top',image:'original',cutoutImage:'cutout',imageMode:'original'};
 // process delegates to task synchronously, which awaits the real asynchronous operation.
 const pending:Promise<void>[]=[];const task=p.task as (label:string,fn:()=>Promise<void>)=>Promise<void>;
 p.task=function(label:string,fn:()=>Promise<void>){const result=task.call(p,label,fn);pending.push(result);return result;};
 (p.process as (event:unknown)=>void).call(p,{currentTarget:{dataset:{kind:'cartoon'}}});
 await Promise.all(pending);
 expect(request).toHaveBeenCalledWith('/api/images/cartoon','POST',{image:'cutout',category:'top'});
 expect(p.data.draft).not.toHaveProperty('cartoonImage');
 (p.accept as ()=>void).call(p);
 expect(p.data.draft).toMatchObject({image:'original',cutoutImage:'cutout',cartoonImage:'cartoon-new',imageMode:'cartoon'});
 });
 it('keeps the draft after segmentation failure and rejects duplicate tasks',async()=>{
 const p=editor({error:(e:Error)=>e.message});p.data.draft={name:'用户填写的名称',image:'original'};
 const task=p.task as (label:string,fn:()=>Promise<void>)=>Promise<void>;
 const duplicate=vi.fn();await task.call(p,'分割',async()=>{await task.call(p,'重复点击',duplicate);throw new Error('没有识别到衣物');});
 expect(duplicate).not.toHaveBeenCalled();expect(p.data.error).toBe('没有识别到衣物');expect(p.data.draft).toMatchObject({name:'用户填写的名称',image:'original'});expect(p.data.busy).toBe(false);
 });
});
