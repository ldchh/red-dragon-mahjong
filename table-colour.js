/** Small dependency-free OKLab/OKLCH conversion for theme diagnostics. */
export function oklch(hex) {
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),
        m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),
        s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    const L=.2104542553*l+.793617785*m-.0040720468*s,
        a=1.9779984951*l-2.428592205*m+.4505937099*s,
        bb=.0259040371*l+.7827717662*m-.808675766*s;
    return {L,C:Math.hypot(a,bb),h:(Math.atan2(bb,a)*180/Math.PI+360)%360};
}
export function colourContrast(a,b) {
    const aa=oklch(a),bb=oklch(b),deltaL=Math.abs(aa.L-bb.L),deltaH=Math.min(Math.abs(aa.h-bb.h),360-Math.abs(aa.h-bb.h));
    return {deltaL,deltaH,pass:deltaL>=.20||deltaH>=90&&deltaL>=.10};
}
export const deriveBackDark=back=>'#'+[1,3,5].map(i=>Math.round(parseInt(back.slice(i,i+2),16)*.70).toString(16).padStart(2,'0')).join('');
