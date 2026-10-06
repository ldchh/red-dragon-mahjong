import {TABLE_THEMES} from './table-themes.js?v=1.9.20';
import {TILE_FACES} from './tile-faces.js?v=1.9.20';
import {TILE_BACKS} from './tile-backs.js?v=1.9.20';

// Runtime catalogue: new themes automatically participate without another UI list.
export const COSMETICS = Object.freeze({
    tablecloth: Object.freeze(TABLE_THEMES.map(t => Object.freeze({
        id:t.id, name:t.name, subtitle:t.subtitle, thumb:t.thumbnail?.src,
        default:t.id==='jade', theme:t,
    }))),
    tileBack: TILE_BACKS,
    tileFace: TILE_FACES,
});
export const UPCOMING = Object.freeze({tablecloth:2,tileBack:3,tileFace:3});
export const ACTIVITIES = Object.freeze([Object.freeze({
    id:'summit',tab:'登峰礼',title:'登峰有礼',
    description:'晋升段位，解锁更多装扮',
    milestones:Object.freeze([
        Object.freeze({id:'summit_2',major:2,title:'初登 · 听风客',coupons:1}),
        Object.freeze({id:'summit_3',major:3,title:'渐入 · 控场师',coupons:1}),
        Object.freeze({id:'summit_5',major:5,title:'登堂 · 千面手',coupons:2}),
        Object.freeze({id:'summit_7',major:7,title:'守岳 · 镇国柱',coupons:2}),
        Object.freeze({id:'summit_8',major:8,title:'登峰 · 诛仙位',coupons:4}),
    ]),
})]);
