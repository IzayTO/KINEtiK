export const OPTIC_STEPS=Object.freeze([1.5,2,3,4]);
const retainedZoom=Object.freeze({1.5:.60,2:.70,3:.80,4:.85});
export const opticDiameter=(width,height)=>.84*Math.min(width,height);
export function opticZoom(width,height,verticalFov,mark,normalHorizontalFov){
 const previousFocal=opticDiameter(width,height)*(100/1.04)*(mark/4);
 const cameraFocal=height/(2*Math.tan(verticalFov*Math.PI/360));
 const normalFocal=normalHorizontalFov===undefined?cameraFocal:width/(2*Math.tan(normalHorizontalFov*Math.PI/360));
 // Interpolate projected target size from hip view to the previous scope setting.
 return (normalFocal+(previousFocal-normalFocal)*retainedZoom[mark])/cameraFocal;
}
export function updateOptic(view,input,arsenal){
 const m=view.match, a=m?.player;
 const scoped=!!(m?.running&&!m.staging&&!m.ended&&a?.alive&&!a.held&&!a.throwAction&&
  !a.consuming&&!a.opening&&m.time-a.antidoteAt>=.6&&!m.remote.engaged&&!m.nuclear.restricted&&
  arsenal?.selected===4&&!arsenal.reload&&arsenal.time>=arsenal.switchUntil&&input.aim&&view.aim>.55);
 const mark=view.scopeMark??OPTIC_STEPS[0];
 const zoom=scoped?opticZoom(view.width,view.height,view.camera.fov,mark,view.params.hFov):1;
 if(Math.abs(view.camera.zoom-zoom)>1e-6){view.camera.zoom=zoom;view.camera.updateProjectionMatrix();}
 // Brief angular recoil measured as a fraction of the lens, including at 4×.
 const age=view.time-view.shotTime;
 if(scoped&&view.lastShotKind==='sniper'&&age>=0&&age<.26){
  const pulse=Math.sin(Math.PI*.5*Math.min(1,age/.035))*(1-age/.26)**2;
  view.camera.rotation.x+=pulse*.048*(1.04/100)*(4/mark)*Math.min(1.5,view.params.recoil);
  view.camera.updateMatrixWorld(true);
 }
 view.scoped=scoped;
}
export function nextOpticMark(mark){return OPTIC_STEPS[(OPTIC_STEPS.indexOf(mark)+1)%OPTIC_STEPS.length];}
