import {clamp} from './physics.js';
export const ARSENAL_IDS=Object.freeze(['weapon-slots','slot-knife','slot-grenade','slot-molotov','slot-gas','slot-antidote']);
export function arsenalBounds(values,items,rect){let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const item of items){const v=values[item.id];if(!v)continue;const x=v.x*rect.w,y=v.y*rect.h,w=item.w*v.scale,h=item.h*v.scale;left=Math.min(left,x-w/2);right=Math.max(right,x+w/2);top=Math.min(top,y-h/2);bottom=Math.max(bottom,y+h/2);}return{left,top,right,bottom,x:(left+right)/2,y:(top+bottom)/2,w:right-left,h:bottom-top};}
// Transform all members from one immutable snapshot; clamp the group as a whole
// so dragging against the safe edge never deforms its internal layout.
export function transformArsenal(values,items,rect,{dx=0,dy=0,scale=1,opacity=null}={}){const members=items.filter(i=>values[i.id]),bounds=arsenalBounds(values,members,rect),lo=Math.max(...members.map(i=>.55/values[i.id].scale)),hi=Math.min(...members.map(i=>1.6/values[i.id].scale),rect.w/bounds.w,rect.h/bounds.h),factor=clamp(scale,Math.min(lo,hi),hi),out={};
 for(const item of members){const v=values[item.id];out[item.id]={x:(bounds.x+(v.x*rect.w-bounds.x)*factor)/rect.w,y:(bounds.y+(v.y*rect.h-bounds.y)*factor)/rect.h,scale:v.scale*factor,opacity:opacity===null?v.opacity:clamp(opacity,0,1)};}
 const b=arsenalBounds(out,members,rect),moveX=clamp(dx*rect.w,-b.left,rect.w-b.right),moveY=clamp(dy*rect.h,-b.top,rect.h-b.bottom);for(const v of Object.values(out)){v.x+=moveX/rect.w;v.y+=moveY/rect.h;}return out;
}
