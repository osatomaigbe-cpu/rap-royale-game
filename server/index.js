import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const app=express(), http=createServer(app), io=new Server(http,{cors:{origin:true}}), rooms=new Map(), N=8, TYPES=['mic','vinyl','headphones','speaker','cassette'];
const random=()=>TYPES[Math.floor(Math.random()*TYPES.length)];
function board(){const b=Array.from({length:N},()=>Array(N));for(let r=0;r<N;r++)for(let c=0;c<N;c++){let t;do{t=random()}while((c>1&&b[r][c-1]===t&&b[r][c-2]===t)||(r>1&&b[r-1][c]===t&&b[r-2][c]===t));b[r][c]=t}return b}
function matches(b){const s=new Set();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=b[r][c];let e=c+1;while(t&&e<N&&b[r][e]===t)e++;if(e-c>=3)for(let x=c;x<e;x++)s.add(r+','+x);e=r+1;while(t&&e<N&&b[e][c]===t)e++;if(e-r>=3)for(let y=r;y<e;y++)s.add(y+','+c)}return s}
function settle(b){let cleared=0,chain=0,h;while((h=matches(b)).size){chain++;cleared+=h.size;for(const k of h){const [r,c]=k.split(',').map(Number);b[r][c]=null}for(let c=0;c<N;c++){const keep=b.map(row=>row[c]).filter(Boolean),next=[...Array(N-keep.length).fill(0).map(random),...keep];for(let r=0;r<N;r++)b[r][c]=next[r]}}return{cleared,chain}}
function snap(room){return{code:room.code,status:room.status,endsAt:room.endsAt,players:room.players.map(({id,name,score})=>({id,name,score})),boards:Object.fromEntries(room.players.map(p=>[p.id,p.board]))}}
function emit(room){io.to(room.code).emit('room:state',snap(room))}
function finish(room){if(room.status!=='playing')return;room.status='finished';clearTimeout(room.timer);const[a,b]=room.players,winner=!a||!b||a.score===b.score?null:a.score>b.score?a.id:b.id;emit(room);io.to(room.code).emit('match:ended',{winner,scores:room.players.map(p=>({name:p.name,score:p.score}))})}
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c;do{c=Array.from({length:6},()=>chars[Math.random()*chars.length|0]).join('')}while(rooms.has(c));return c}
io.on('connection',s=>{
 s.on('room:create',({name}={},ack=()=>{})=>{const c=code(),r={code:c,status:'waiting',players:[],endsAt:null};r.players.push({id:s.id,name:String(name||'Player').trim().slice(0,18)||'Player',score:0,board:board()});rooms.set(c,r);s.join(c);s.data.code=c;ack({ok:true,code:c});emit(r)});
 s.on('room:join',({code:c,name}={},ack=()=>{})=>{const r=rooms.get(String(c||'').trim().toUpperCase());if(!r)return ack({ok:false,error:'Room code not found. Check it and try again.'});if(r.players.length>=2)return ack({ok:false,error:'This room is full. Ask for a new code.'});if(r.status!=='waiting')return ack({ok:false,error:'This match has already started.'});r.players.push({id:s.id,name:String(name||'Player').trim().slice(0,18)||'Player',score:0,board:board()});s.join(r.code);s.data.code=r.code;ack({ok:true,code:r.code});emit(r)});
 s.on('match:start',(_,ack=()=>{})=>{const r=rooms.get(s.data.code);if(!r||r.players.length!==2)return ack({ok:false,error:'Waiting for your opponent to join.'});if(r.status!=='waiting')return;r.status='playing';r.endsAt=Date.now()+90000;r.timer=setTimeout(()=>finish(r),90000);emit(r);ack({ok:true})});
 s.on('move:swap',({from,to}={},ack=()=>{})=>{const r=rooms.get(s.data.code),p=r?.players.find(x=>x.id===s.id);if(!r||r.status!=='playing'||!p)return ack({ok:false,error:'The match isn’t accepting moves right now.'});const valid=x=>x&&Number.isInteger(x.row)&&Number.isInteger(x.col)&&x.row>=0&&x.row<N&&x.col>=0&&x.col<N;if(!valid(from)||!valid(to)||Math.abs(from.row-to.row)+Math.abs(from.col-to.col)!==1)return ack({ok:false});const b=p.board;[b[from.row][from.col],b[to.row][to.col]]=[b[to.row][to.col],b[from.row][from.col]];if(!matches(b).size){[b[from.row][from.col],b[to.row][to.col]]=[b[to.row][to.col],b[from.row][from.col]];return ack({ok:false,error:'That swap didn’t make a match. Try another.'})}const result=settle(b);p.score+=result.cleared*10+Math.max(0,result.chain-1)*25;emit(r);ack({ok:true,...result})});
 s.on('disconnect',()=>{const r=rooms.get(s.data.code);if(!r)return;if(r.status==='playing')finish(r);r.players=r.players.filter(p=>p.id!==s.id);if(!r.players.length){clearTimeout(r.timer);rooms.delete(r.code)}else emit(r)})
});
if(existsSync(resolve('dist/index.html'))){app.use(express.static(resolve('dist')));app.get('/{*path}',(_,res)=>res.sendFile(resolve('dist/index.html'))) }
http.listen(process.env.PORT||3001,'0.0.0.0',()=>console.log('Rap Royale server ready'));
