const config = require('../config');
const token = () => wx.getStorageSync('cw_token') || '';
const error = e => e.message || e.errMsg || '网络请求失败';
function base(){const b=config.apiBase.replace(/\/+$/,'');if(!/^https:\/\//.test(b) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(b))throw new Error('请配置 HTTPS 后端地址');return b;}
function clear(){wx.removeStorageSync('cw_token');wx.removeStorageSync('cw_user');}
function login(){if(token())return true;wx.navigateTo({url:'/pages/login/index'});return false;}
function request(path,method='GET',data){return new Promise((resolve,reject)=>{wx.request({url:base()+path,method,data,timeout:125000,header:{Authorization:'Bearer '+token()},success:r=>{if(r.statusCode===401){clear();}if(r.statusCode>=200&&r.statusCode<300)resolve(r.data);else reject(new Error(r.data.error||'请求失败'));},fail:()=>reject(new Error('连接失败，请检查后端地址和网络'))});});}
function upload(filePath,onProgress){return new Promise((resolve,reject)=>{const task=wx.uploadFile({url:base()+'/api/upload',filePath,name:'file',header:{Authorization:'Bearer '+token()},success:r=>{try{const d=JSON.parse(r.data);if(r.statusCode===401)clear();if(r.statusCode!==200)throw new Error(d.error||'上传失败');resolve(d.key);}catch(e){reject(e);}},fail:()=>reject(new Error('上传失败，请重试'))});if(onProgress)task.onProgressUpdate(e=>onProgress(e.progress));});}
const files=new Map();
function image(key){if(!key)return Promise.resolve('');const cacheKey=token()+':'+key;if(files.has(cacheKey))return files.get(cacheKey);const p=new Promise((resolve,reject)=>wx.downloadFile({url:base()+'/api/images/'+key,header:{Authorization:'Bearer '+token()},success:r=>r.statusCode===200?resolve(r.tempFilePath):reject(new Error('图片加载失败')),fail:()=>reject(new Error('图片加载失败'))}));files.set(cacheKey,p);p.catch(()=>files.delete(cacheKey));return p;}
async function decorate(item){const key=item.imageMode==='cartoon'?item.cartoonImage:item.imageMode==='cutout'?item.cutoutImage:item.image;return {...item,photo:await image(key||item.image).catch(()=>''),color:(item.colors||[]).join('、')};}
function show(e){wx.showToast({title:error(e),icon:'none',duration:3000});}
module.exports={request,upload,image,decorate,login,clear,show,error};
