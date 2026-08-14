import{H as y,I as B,J as f}from"./index.DCwQ7JLJ.js";const g=`-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAyvt4NWIdVb7qVlGip9r5
lyjrzP+2dx3VmdxPyKhN4stFgba/dwBVIwlPAREefa9YoTs/Fg28G0ubd29EtsEu
2I2QG5K40NgVmlPI9EWyPhjxkX3PZ5839iASwwKvqtHMMdvD0rLq3SGE8qkERI6x
q7auL9OcFzXlq/YQQUM4K54AGtBjJEkIidUAWRBmdqkBgffNBxIWZoJFAB9io1Gl
IApk1OdU9gjcaxTivgpWhdGJu+GJUvTA+BJbRVGkgam2oo3GH6FsDovSwhO90EDV
p09cajKHyNCLNdLM+Zo2on11QG+6MHMWHmlxtfYAezpdsUpxs5XSAGtj046TIYMv
1CMtJkdvG4jPhrTRg15pRHYrerd6taLwoBs1UnDxIf7hMw3gjkVgbLfINkmyMfdU
mBk8Zt2w81RW+yrfbAJYbA0HfDL7x8hAfxP0lTWCmxDRrOeRAm1hUpi5v0rYeK2R
hV4B+7WfZ0KYHBAQDUgmwTTHlLCLmkb6t3BEsVCKQW59AgMBAAE=
-----END PUBLIC KEY-----
`;function d(n){const a=n.replace(/-----BEGIN PUBLIC KEY-----/g,"").replace(/-----END PUBLIC KEY-----/g,"").replace(/\s/g,""),e=atob(a),r=new Uint8Array(e.length);for(let t=0;t<e.length;t+=1)r[t]=e.charCodeAt(t);return r.buffer}function s(n){const a=n instanceof Uint8Array?n:new Uint8Array(n);let e="";const r=32768;for(let t=0;t<a.length;t+=r)e+=String.fromCharCode(...a.subarray(t,t+r));return btoa(e)}async function R(n,a=g,e=globalThis.crypto){if(!e?.subtle)throw new Error("当前浏览器不支持安全加密导出");const r=await e.subtle.importKey("spki",d(a),{name:"RSA-OAEP",hash:"SHA-256"},!1,["encrypt"]),t=e.getRandomValues(new Uint8Array(32)),c=await e.subtle.importKey("raw",t,{name:"AES-GCM",length:256},!1,["encrypt"]),A=e.getRandomValues(new Uint8Array(12)),o=new TextEncoder,i=await e.subtle.encrypt({name:"AES-GCM",iv:A,additionalData:o.encode(y),tagLength:128},c,o.encode(JSON.stringify(n))),E=await e.subtle.encrypt({name:"RSA-OAEP"},r,t);return{format:f,schemaVersion:B,algorithms:{content:"AES-256-GCM",keyEncryption:"RSA-OAEP-SHA256"},iv:s(A),encryptedKey:s(E),ciphertext:s(i)}}export{R as encryptBugReport};
