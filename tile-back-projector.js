/** Texture UV belongs to the actual back plane, never its bounding box. */
export function quadProjector(q){
    if(q?.length!==4||q.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n))))throw new TypeError('Invalid back quad');
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
    const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
    const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,det=dx1*dy2-dx2*dy1;
    if(Math.abs(det)<1e-10)throw new TypeError('Degenerate back plane');
    const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
    const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
    return {g,h,point(u,v){const w=1+g*u+h*v;return [(a*u+b*v+x0)/w,(d*u+e*v+y0)/w];}};
}
function affine(uv,p){
    const [s0,s1,s2]=uv,[p0,p1,p2]=p;
    const u1=s1[0]-s0[0],v1=s1[1]-s0[1],u2=s2[0]-s0[0],v2=s2[1]-s0[1],det=u1*v2-u2*v1;
    const x1=p1[0]-p0[0],x2=p2[0]-p0[0],y1=p1[1]-p0[1],y2=p2[1]-p0[1];
    const a=(x1*v2-x2*v1)/det,c=(x2*u1-x1*u2)/det,b=(y1*v2-y2*v1)/det,d=(y2*u1-y1*u2)/det;
    return [a,b,c,d,p0[0]-a*s0[0]-c*s0[1],p0[1]-b*s0[0]-d*s0[1]];
}
/** Native SVG strips reuse one decoded image. Opposite faces are exactly
 * affine; four strips keep perspective error subpixel on the narrow sides. */
export function backTextureMesh(quad,steps=4){
    if(!Number.isInteger(steps)||steps<1||steps>32)throw new TypeError('Invalid back subdivision');
    // In the existing near-overhead camera a side back can be edge-on. Keep
    // that zero-width geometry: do not widen the tile just to show its print.
    if(quad?.length===4&&quad.every(p=>p.length===2&&p.every(Number.isFinite))
        &&Math.abs(quad.reduce((a,p,i)=>a+p[0]*quad[(i+1)%4][1]-p[1]*quad[(i+1)%4][0],0))<1e-8)return [];
    const H=quadProjector(quad),n=Math.abs(H.g)+Math.abs(H.h)<1e-8?1:steps,triangles=[];
    for(let i=0;i<n;i++){
        const u=i/n,v=(i+1)/n;
        for(const uv of [[[u,0],[v,0],[v,1]],[[u,0],[v,1],[u,1]]]){
            const points=uv.map(([x,y])=>H.point(x,y));triangles.push({uv,points,matrix:affine(uv,points)});
        }
    }
    return triangles;
}
