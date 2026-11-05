export type TargetPoint={x:number;y:number;label:number};
export function chooseTargetMask(data:ArrayLike<number>,scores:ArrayLike<number>,width:number,height:number,points:TargetPoint[]){
 const size=width*height;
 if(!points.some(p=>p.label===1))throw new Error('请先点选需要保留的衣物');
 let best=-1;
 for(let k=0;k<scores.length;k++){
  if(data.length<(k+1)*size)continue;
  const agrees=points.every(p=>{
   const x=Math.max(0,Math.min(width-1,Math.floor(p.x*width))),y=Math.max(0,Math.min(height-1,Math.floor(p.y*height)));
   return Boolean(data[k*size+y*width+x])===(p.label===1);
  });
  if(agrees&&(best<0||Number(scores[k])>Number(scores[best])))best=k;
 }
 if(best<0)throw new Error('结果未正确区分保留和排除区域，请补充选点后重试；原图未改变');
 const result=new Uint8Array(size);let visible=0;
 for(let i=0;i<size;i++){result[i]=data[best*size+i]?255:0;if(result[i])visible++;}
 if(visible<size*.01||visible>size*.98)throw new Error('提取范围异常，请重新点选目标衣物');
 return result;
}
