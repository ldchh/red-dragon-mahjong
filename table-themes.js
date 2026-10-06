// A theme defines the complete table, never the shared camera or game state.
import {colourContrast,deriveBackDark} from './table-colour.js?v=1.9.20';
export const THEME_STORAGE_KEY = 'hz_table_theme_v1';
export const DEFAULT_THEME_ID = 'jade';
export const TABLE_THEMES = Object.freeze([
    Object.freeze({
        id:'jade',name:'经典青玉',subtitle:'青玉绒面，深木包边',version:'2',
        tileBack:'#e29936',tileBackDark:'#b66c18',
        colors:{center:'#326e5a',middle:'#255d4f',edge:'#183f39',rim:'#102e2c'},
        material:{kind:'felt',texture:null,opacity:0,grain:.12},
        border:{color:'#193b33',line:'#7e8a65',stitch:'#a0aa81',width:12,radius:22},
        tableUiTokens:{plate:'#173a32',raised:'#264b3f',text:'#f1ead5',muted:'#c1cdb6',line:'#8a9c76',
            accent:'#dec891',actionLight:'#826f43',actionDark:'#5f5936',active:'#6e6940'},
        art:null,thumbnail:null,layout:null,
    }),
    Object.freeze({
        id:'naiwa',name:'奶蛙 · 捧腹大笑',subtitle:'暖麦芽织物，咖啡包边，一大一小两份笑意',version:'4',
        tileBack:'#157171',tileBackDark:'#005353',
        colors:{center:'#817458',middle:'#76694f',edge:'#625743',rim:'#493f32'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/naiwa/naiwa-fabric-v2.webp?v=1.9.20',width:1024,height:683},opacity:.40,grain:.08},
        border:{color:'#493f32',line:'#9f8d61',stitch:'#ad9b72',width:14,radius:22},
        tableUiTokens:{plate:'#342d24',raised:'#504537',text:'#f4ead4',muted:'#dbcaab',line:'#a28c65',
            accent:'#e3c58c',actionLight:'#8c754f',actionDark:'#675538',active:'#80673f'},
        art:{src:'/static/assets/tables/naiwa/naiwa-print-v2.webp?v=1.9.20',width:835,height:1040},
        thumbnail:{src:'/static/assets/tables/naiwa/naiwa-cloth-thumb-v2.webp?v=1.9.20',width:210,height:140},
        layout:{aspect:835/1040,desktopHeight:700,landscapeHeight:660,
            face:{x:.085,y:.115,w:.32,h:.225}},
        accents:[{id:'resting',
            art:{src:'/static/assets/tables/naiwa/naiwa-resting-v2.webp?v=1.9.20',width:320,height:260},
            layout:{anchor:'bottom-right',widths:{desktop:140,landscape:145,compact:135},
                right:40,bottom:90,face:{x:.38,y:.18,w:.56,h:.39}},
        }],
    }),
    Object.freeze({
        id:'cinnamoroll',name:'玉桂狗 · 云端游园',subtitle:'四周云雾，气球与星星游园，轻点与拨弦相伴',version:'2',
        tileBack:'#3b6388',tileBackDark:'#244765',
        colors:{center:'#a0b7c8',middle:'#92aabc',edge:'#858da9',rim:'#667f96'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/cinnamoroll/cloud-fabric-v2.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.025},
        border:{color:'#667f96',line:'#a4b8ca',stitch:'#b6c7d4',width:12,radius:22},
        tableUiTokens:{plate:'#293f53',raised:'#3a526b',text:'#f0f3f6',muted:'#c4d4e3',line:'#849db5',
            accent:'#e3cddb',actionLight:'#6b7b98',actionDark:'#485e7a',active:'#61738d'},
        art:{src:'/static/assets/tables/cinnamoroll/cloud-print-v1.webp?v=1.9.20',width:1024,height:1021},
        thumbnail:{src:'/static/assets/tables/cinnamoroll/cloud-cloth-thumb-v2.webp?v=1.9.20',width:210,height:140},
        layout:{aspect:1024/1021,desktopHeight:640,landscapeHeight:580,
            face:{x:.28,y:.25,w:.40,h:.27}},
        accents:[{id:'balloon',
            art:{src:'/static/assets/tables/cinnamoroll/cloud-balloon-v1.webp?v=1.9.20',width:384,height:365},
            layout:{anchor:'bottom-right',widths:{desktop:160,landscape:160,compact:145},
                right:40,bottom:120,face:{x:.25,y:.62,w:.35,h:.22}},
        },{
            id:'bouquet',
            art:{src:'/static/assets/tables/cinnamoroll/cloud-bouquet-v1.webp?v=1.9.20',width:384,height:606},
            layout:{anchor:'bottom-left',widths:{desktop:160,landscape:130,compact:115},
                left:68,bottom:120,underlay:'allow',face:{x:.08,y:.06,w:.84,h:.48}},
        },{
            id:'cloud-mobile',
            art:{src:'/static/assets/tables/cinnamoroll/cloud-mobile-v1.webp?v=1.9.20',width:384,height:601},
            layout:{anchor:'top-right',widths:{desktop:145,landscape:130,compact:120},
                right:24,top:80,underlay:'allow',face:{x:.16,y:.30,w:.68,h:.62}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/cinnamoroll/discard-v1.wav?v=1.9.20',format:'wav',gain:.78},
            pong:{src:'/static/assets/audio/table-themes/cinnamoroll/pong-v1.wav?v=1.9.20',format:'wav',gain:.85},
            kong:{src:'/static/assets/audio/table-themes/cinnamoroll/kong-v1.wav?v=1.9.20',format:'wav',gain:.9},
            hu:{src:'/static/assets/audio/table-themes/cinnamoroll/hu-v1.wav?v=1.9.20',format:'wav',gain:.92},
            zi_mo:{src:'/static/assets/audio/table-themes/cinnamoroll/hu-v1.wav?v=1.9.20',format:'wav',gain:.92},
        }},
    }),
    Object.freeze({
        id:'valorant',name:'无畏契约 · 萌系特工',subtitle:'青蓝风痕与紫影，三位特工围坐，轻机械与能量确认',version:'1',
        tileBack:'#8db7bd',tileBackDark:'#648e99',
        colors:{center:'#35465b',middle:'#304053',edge:'#253248',rim:'#1b2635'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/valorant/tactical-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.55,grain:.025},
        border:{color:'#1b2635',line:'#536d7f',stitch:'#788d9c',width:13,radius:20},
        tableUiTokens:{plate:'#1d2b3d',raised:'#33475b',text:'#dfe8ed',muted:'#b4c8d2',line:'#627f91',
            accent:'#d4a1a9',actionLight:'#587b89',actionDark:'#355564',active:'#426675'},
        art:{src:'/static/assets/tables/valorant/agent-01-v1.webp?v=1.9.20',width:1024,height:989},
        thumbnail:{src:'/static/assets/tables/valorant/tactical-thumb-v1.webp?v=1.9.20',width:210,height:140},
        layout:{aspect:1024/989,desktopHeight:620,landscapeHeight:560,
            face:{x:.23,y:.34,w:.50,h:.28}},
        accents:[{
            id:'agent-02',art:{src:'/static/assets/tables/valorant/agent-02-v1.webp?v=1.9.20',width:640,height:658},
            layout:{anchor:'bottom-right',widths:{desktop:220,landscape:180,compact:180},
                right:20,bottom:100,faceRiverLimit:30,face:{x:.18,y:.10,w:.65,h:.60}},
        },{
            id:'agent-03',art:{src:'/static/assets/tables/valorant/agent-03-v1.webp?v=1.9.20',width:640,height:673},
            layout:{anchor:'bottom-left',widths:{desktop:120,landscape:130,compact:130},
                left:20,bottom:180,faceRiverLimit:30,face:{x:.32,y:.26,w:.40,h:.34}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/valorant/discard-v1.wav?v=1.9.20',format:'wav',gain:.76},
            pong:{src:'/static/assets/audio/table-themes/valorant/pong-v1.wav?v=1.9.20',format:'wav',gain:.82},
            kong:{src:'/static/assets/audio/table-themes/valorant/kong-v1.wav?v=1.9.20',format:'wav',gain:.86},
            hu:{src:'/static/assets/audio/table-themes/valorant/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
            zi_mo:{src:'/static/assets/audio/table-themes/valorant/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
        }},
    }),
    Object.freeze({
        id:'kuromi',name:'库洛米 · 莓紫心愿',subtitle:'莓紫织物与灰粉飘带，长耳伙伴相伴，木敲与玩具琴轻跳',version:'1',
        tileBack:'#d5bdd8',tileBackDark:'#b39fb9',
        colors:{center:'#817088',middle:'#705d78',edge:'#5f506a',rim:'#302b38'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/kuromi/berry-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.5,grain:.025},
        border:{color:'#302b38',line:'#987d9a',stitch:'#b291a8',width:13,radius:22},
        tableUiTokens:{plate:'#3e3048',raised:'#5b4964',text:'#e6dee8',muted:'#d0bad4',line:'#a084ab',
            accent:'#deb1c9',actionLight:'#86617c',actionDark:'#61455e',active:'#795b7b'},
        art:{src:'/static/assets/tables/kuromi/berry-pair-v1.webp?v=1.9.20',width:1024,height:601},
        thumbnail:{src:'/static/assets/tables/kuromi/berry-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // Protect BOTH faces and the pink forehead skull in the real alpha print.
        layout:{aspect:1024/601,desktopHeight:620,landscapeHeight:560,
            face:{x:.21,y:.34,w:.53,h:.48}},
        accents:[{
            id:'heart-wink',art:{src:'/static/assets/tables/kuromi/berry-heart-v1.webp?v=1.9.20',width:640,height:637},
            layout:{anchor:'bottom-right',widths:{desktop:200,landscape:175,compact:155},
                right:20,bottom:100,faceRiverLimit:30,face:{x:.26,y:.38,w:.47,h:.35}},
        },{
            id:'playful',art:{src:'/static/assets/tables/kuromi/berry-playful-v1.webp?v=1.9.20',width:640,height:689},
            // Repeated playful pose may lack a safe pocket on short landscape;
            // the shared solver hides only this echo, retaining pair and heart.
            layout:{anchor:'top-right',widths:{desktop:130,landscape:100,compact:95},
                right:24,top:180,faceRiverLimit:30,face:{x:.36,y:.26,w:.40,h:.35}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/kuromi/discard-v1.wav?v=1.9.20',format:'wav',gain:.78},
            pong:{src:'/static/assets/audio/table-themes/kuromi/pong-v1.wav?v=1.9.20',format:'wav',gain:.84},
            kong:{src:'/static/assets/audio/table-themes/kuromi/kong-v1.wav?v=1.9.20',format:'wav',gain:.88},
            hu:{src:'/static/assets/audio/table-themes/kuromi/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
            zi_mo:{src:'/static/assets/audio/table-themes/kuromi/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
        }},
    }),
    Object.freeze({
        id:'eggy-party',name:'蛋仔派对 · 弹弹乐园',subtitle:'蜜桃游乐垫，雾青滑道与三位弹跳伙伴',version:'1',
        tileBack:'#256a73',tileBackDark:'#14434f',
        colors:{center:'#c2a099',middle:'#b08b8c',edge:'#9c777f',rim:'#765967'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/eggy-party/park-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.018},
        border:{color:'#765967',line:'#c3a49c',stitch:'#ddbeb0',width:13,radius:24},
        tableUiTokens:{plate:'#4f3545',raised:'#684b5a',text:'#f7ece4',muted:'#e6ccd2',line:'#b99ba1',
            accent:'#f2d79c',actionLight:'#8b5e75',actionDark:'#654451',active:'#745365'},
        art:{src:'/static/assets/tables/eggy-party/jumping-egg-v1.webp?v=1.9.20',width:1024,height:1002},
        thumbnail:{src:'/static/assets/tables/eggy-party/park-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // Bounds measured on the generated, alpha-trimmed print: squint eyes + mouth.
        // The white shirt and jumping feet may continue underneath opaque cards.
        layout:{aspect:1024/1002,desktopHeight:620,landscapeHeight:560,
            face:{x:.35,y:.23,w:.32,h:.18}},
        accents:[{
            id:'helmet-buddy',art:{src:'/static/assets/tables/eggy-party/helmet-buddy-v1.webp?v=1.9.20',width:640,height:578},
            layout:{anchor:'bottom-left',widths:{desktop:95,landscape:95,compact:95},
                left:24,bottom:156,faceRiverLimit:30,face:{x:.20,y:.19,w:.59,h:.53}},
        },{
            id:'orange-buddy',art:{src:'/static/assets/tables/eggy-party/orange-buddy-v1.webp?v=1.9.20',width:640,height:673},
            layout:{anchor:'bottom-right',widths:{desktop:195,landscape:155,compact:145},
                right:24,bottom:120,faceRiverLimit:30,face:{x:.30,y:.31,w:.40,h:.38}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/eggy-party/discard-v1.wav?v=1.9.20',format:'wav',gain:.78},
            pong:{src:'/static/assets/audio/table-themes/eggy-party/pong-v1.wav?v=1.9.20',format:'wav',gain:.84},
            kong:{src:'/static/assets/audio/table-themes/eggy-party/kong-v1.wav?v=1.9.20',format:'wav',gain:.88},
            hu:{src:'/static/assets/audio/table-themes/eggy-party/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
            zi_mo:{src:'/static/assets/audio/table-themes/eggy-party/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
        }},
    }),
    Object.freeze({
        id:'cyberpunk',name:'赛博朋克 · 霓虹暮城',subtitle:'靛蓝暮城与雾中灯带，一处屋顶背影，柔和电子脉冲',version:'1',
        tileBack:'#78aebd',tileBackDark:'#4f7b91',
        colors:{center:'#3d4964',middle:'#293548',edge:'#242f43',rim:'#192330'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/cyberpunk/city-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.014},
        border:{color:'#192330',line:'#64738d',stitch:'#8190a9',width:13,radius:22},
        tableUiTokens:{plate:'#1c293c',raised:'#35465f',text:'#e8edf6',muted:'#c6cce0',line:'#7b8ca8',
            accent:'#c6acd2',actionLight:'#657591',actionDark:'#42516a',active:'#50627f'},
        art:{src:'/static/assets/tables/cyberpunk/rooftop-observer-v1.webp?v=1.9.20',width:512,height:663},
        thumbnail:{src:'/static/assets/tables/cyberpunk/city-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // The schema's "face" protects this back-facing figure's head/shoulders.
        // City skyline, mist and lights belong to the continuous fabric, not accents.
        layout:{aspect:512/663,desktopHeight:340,landscapeHeight:300,
            face:{x:.34,y:.07,w:.34,h:.285}},
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/cyberpunk/discard-v1.wav?v=1.9.20',format:'wav',gain:.78},
            pong:{src:'/static/assets/audio/table-themes/cyberpunk/pong-v1.wav?v=1.9.20',format:'wav',gain:.84},
            kong:{src:'/static/assets/audio/table-themes/cyberpunk/kong-v1.wav?v=1.9.20',format:'wav',gain:.88},
            hu:{src:'/static/assets/audio/table-themes/cyberpunk/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
            zi_mo:{src:'/static/assets/audio/table-themes/cyberpunk/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
        }},
    }),
    Object.freeze({
        id:'fox-spirit',name:'狐妖小红娘 · 花缘雅集',subtitle:'烟青绢面与藕粉花枝，三位雅客相伴，玉碰与短弦回应',version:'1',
        tileBack:'#385666',tileBackDark:'#233b49',
        colors:{center:'#91a19a',middle:'#879a95',edge:'#728981',rim:'#4e4840'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/fox-spirit/silk-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.014},
        border:{color:'#4e4840',line:'#a99a6c',stitch:'#c2b38a',width:13,radius:22},
        tableUiTokens:{plate:'#38352f',raised:'#504a40',text:'#f5eedf',muted:'#ded2bd',line:'#a99a80',
            accent:'#ead2ab',actionLight:'#8a8068',actionDark:'#605746',active:'#756a53'},
        art:{src:'/static/assets/tables/fox-spirit/flower-character-v1.webp?v=1.9.20',width:1024,height:979},
        thumbnail:{src:'/static/assets/tables/fox-spirit/silk-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // Face and flower together; streaming hair and robe remain printable below cards.
        layout:{aspect:1024/979,desktopHeight:620,landscapeHeight:560,
            face:{x:.19,y:.18,w:.58,h:.37}},
        accents:[{
            id:'gourd-guest',art:{src:'/static/assets/tables/fox-spirit/gourd-character-v1.webp?v=1.9.20',width:640,height:687},
            // Includes BOTH white ears and the red eyes. Entire pale gourd stays in this print.
            layout:{anchor:'bottom-left',widths:{desktop:90,landscape:90,compact:90},
                left:24,bottom:150,faceRiverLimit:30,face:{x:.15,y:.25,w:.74,h:.31}},
        },{
            id:'crown-guest',art:{src:'/static/assets/tables/fox-spirit/crown-character-v1.webp?v=1.9.20',width:640,height:719},
            // Protect high crown, yin-yang ornament, gold pin and face as a single detail.
            layout:{anchor:'bottom-right',widths:{desktop:175,landscape:155,compact:140},
                right:24,bottom:100,faceRiverLimit:30,face:{x:.21,y:.02,w:.62,h:.58}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/fox-spirit/discard-v1.wav?v=1.9.20',format:'wav',gain:.72},
            pong:{src:'/static/assets/audio/table-themes/fox-spirit/pong-v1.wav?v=1.9.20',format:'wav',gain:.80},
            kong:{src:'/static/assets/audio/table-themes/fox-spirit/kong-v1.wav?v=1.9.20',format:'wav',gain:.84},
            hu:{src:'/static/assets/audio/table-themes/fox-spirit/hu-v1.wav?v=1.9.20',format:'wav',gain:.86},
            zi_mo:{src:'/static/assets/audio/table-themes/fox-spirit/hu-v1.wav?v=1.9.20',format:'wav',gain:.86},
        }},
    }),
    Object.freeze({
        id:'detective-conan',name:'名侦探柯南 · 真相之眼',subtitle:'暮蓝书案、旧金线索，新一与红衣放大镜柯南',version:'1',
        tileBack:'#bba974',tileBackDark:'#907e4e',
        colors:{center:'#3e5367',middle:'#34475a',edge:'#2d3d4e',rim:'#202d3a'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/detective-conan/detective-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.012},
        border:{color:'#202d3a',line:'#a69975',stitch:'#b3b5aa',width:13,radius:22},
        tableUiTokens:{plate:'#233241',raised:'#3b4e60',text:'#eef0ec',muted:'#ced4d3',line:'#899486',
            accent:'#d4c69f',actionLight:'#7d827b',actionDark:'#505d62',active:'#596f7d'},
        art:{src:'/static/assets/tables/detective-conan/shinichi-print-v1.webp?v=1.9.20',width:1024,height:1131},
        thumbnail:{src:'/static/assets/tables/detective-conan/detective-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // Bounds measured on the alpha-padded print: both eyes, mouth and face.
        layout:{aspect:1024/1131,desktopHeight:620,landscapeHeight:580,
            face:{x:.245,y:.39,w:.545,h:.34}},
        accents:[{
            id:'red-magnifier',art:{src:'/static/assets/tables/detective-conan/conan-print-v1.webp?v=1.9.20',width:640,height:764},
            // Protect magnified eye, lens rim, original face AND gripping hand.
            layout:{anchor:'bottom-right',widths:{desktop:170,landscape:170,compact:155},
                right:24,bottom:100,faceRiverLimit:30,face:{x:.20,y:.15,w:.60,h:.53}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/detective-conan/discard-v1.wav?v=1.9.20',format:'wav',gain:.76},
            pong:{src:'/static/assets/audio/table-themes/detective-conan/pong-v1.wav?v=1.9.20',format:'wav',gain:.83},
            kong:{src:'/static/assets/audio/table-themes/detective-conan/kong-v1.wav?v=1.9.20',format:'wav',gain:.87},
            hu:{src:'/static/assets/audio/table-themes/detective-conan/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
            zi_mo:{src:'/static/assets/audio/table-themes/detective-conan/hu-v1.wav?v=1.9.20',format:'wav',gain:.90},
        }},
    }),
    Object.freeze({
        id:'one-piece',name:'海贼王 · 向新世界出航',subtitle:'蓝海鼓帆、暖木船舷，草帽伙伴笑着向新世界出航',version:'1',
        tileBack:'#dab862',tileBackDark:'#b59344',
        colors:{center:'#477d95',middle:'#32667c',edge:'#264e67',rim:'#5c4537'},
        material:{kind:'matte-woven',texture:{src:'/static/assets/tables/one-piece/voyage-fabric-v1.webp?v=1.9.20',width:1024,height:1024},opacity:.6,grain:.008},
        border:{color:'#5c4537',line:'#b4935d',stitch:'#d2b78c',width:13,radius:22},
        tableUiTokens:{plate:'#203e4d',raised:'#2f4e59',text:'#f4efdf',muted:'#dbdecf',line:'#a4b5a4',
            accent:'#e4c989',actionLight:'#8c937c',actionDark:'#5b716d',active:'#466472'},
        art:{src:'/static/assets/tables/one-piece/voyage-scene-v1.webp?v=1.9.20',width:1254,height:1254},
        thumbnail:{src:'/static/assets/tables/one-piece/voyage-thumb-v1.webp?v=1.9.20',width:210,height:140},
        // The user's selected complete painting is fixed to the square cloth.
        // Detail regions report occlusion; they never rearrange the picture.
        layout:{mode:'full-cloth',aspect:1,desktopHeight:620,landscapeHeight:580,
            face:{x:.27,y:.198,w:.19,h:.162},
            regions:[
                {id:'luffy-hat-face',x:.27,y:.198,w:.19,h:.162},
                {id:'nami-face',x:.155,y:.217,w:.081,h:.09},
                {id:'zoro-face',x:.055,y:.303,w:.11,h:.095},
                {id:'chopper-hat-face',x:.18,y:.317,w:.141,h:.143},
                {id:'sunny-bow',x:.434,y:.104,w:.155,h:.19},
            ]},
        accents:[{
            id:'anime-title',art:{src:'/static/assets/tables/one-piece/anime-title-v1.webp?v=1.9.20',width:1600,height:494},
            // Protect the COMPLETE animation wordmark, not only its straw-hat skull.
            layout:{anchor:'bottom-right',widths:{desktop:200,landscape:200,compact:200},
                right:24,bottom:120,faceRiverLimit:30,face:{x:.009,y:.03,w:.982,h:.94}},
        }],
        soundPack:{version:'1',events:{
            discard:{src:'/static/assets/audio/table-themes/one-piece/discard-v1.wav?v=1.9.20',format:'wav',gain:.76},
            pong:{src:'/static/assets/audio/table-themes/one-piece/pong-v1.wav?v=1.9.20',format:'wav',gain:.83},
            kong:{src:'/static/assets/audio/table-themes/one-piece/kong-v1.wav?v=1.9.20',format:'wav',gain:.86},
            hu:{src:'/static/assets/audio/table-themes/one-piece/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
            zi_mo:{src:'/static/assets/audio/table-themes/one-piece/hu-v1.wav?v=1.9.20',format:'wav',gain:.9},
        }},
    }),
    Object.freeze({
        id: 'naruto',
        name: '火影忍者 · 忍道墨卷',
        subtitle: '烟青纸墨，红月乌鸦，四位忍者同卷相聚',
        version: '1',
        tileBack: '#30495d',
        tileBackDark: '#1e3041',
        colors: {
                center: '#899096',
                middle: '#7a838b',
                edge: '#636d77',
                rim: '#353a43'
        },
        material: {
                kind: 'matte-woven',
                texture: {
                        src: '/static/assets/tables/naruto/ink-fabric-v2.webp?v=1.9.20',
                        width: 1024,
                        height: 1024
                },
                opacity: 0.6,
                grain: 0.025
        },
        border: {
                color: '#353a43',
                line: '#9c7b52',
                stitch: '#a69b83',
                width: 13,
                radius: 22
        },
        tableUiTokens: {
                plate: '#303942',
                raised: '#434d58',
                text: '#f4efdf',
                muted: '#ded9cc',
                line: '#a99a82',
                accent: '#e2c28f',
                actionLight: '#64717b',
                actionDark: '#424d59',
                active: '#4a5763'
        },
        art: {
                src: '/static/assets/tables/naruto/naruto-print-v1.webp?v=1.9.20',
                width: 1024,
                height: 1024
        },
        thumbnail: {
                src: '/static/assets/tables/naruto/ink-thumb-v1.webp?v=1.9.20',
                width: 210,
                height: 140
        },
        layout: {
                mode: 'anchored-ensemble',
                aspect: 1,
                desktopHeight: 700,
                landscapeHeight: 660,
                face: {
                        x: 0.405,
                        y: 0.105,
                        w: 0.165,
                        h: 0.215
                },
                regions: [
                        {
                                id: 'hands',
                                x: 0.4,
                                y: 0.37,
                                w: 0.22,
                                h: 0.18
                        }
                ],
                placements: {
                        desktop: {
                                cx: 0.29500000000000004,
                                cy: 0.18,
                                width: 0.46
                        },
                        landscape: {
                                cx: 0.32,
                                cy: 0.22,
                                width: 0.46
                        },
                        compact: {
                                cx: 0.29500000000000004,
                                cy: 0.22,
                                width: 0.46
                        }
                }
        },
        accents: [
                {
                        id: 'itachi',
                        art: {
                                src: '/static/assets/tables/naruto/itachi-print-v2.webp?v=1.9.20',
                                width: 768,
                                height: 768
                        },
                        layout: {
                                anchor: 'top-right',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.3,
                                        y: 0.225,
                                        w: 0.18,
                                        h: 0.185
                                },
                                regions: [
                                        {
                                                id: 'front-hand',
                                                x: 0.04,
                                                y: 0.56,
                                                w: 0.37,
                                                h: 0.29
                                        },
                                        {
                                                id: 'sign-hand',
                                                x: 0.48,
                                                y: 0.36,
                                                w: 0.16,
                                                h: 0.3
                                        },
                                        {
                                                id: 'moon-crows',
                                                x: 0.43,
                                                y: 0.025,
                                                w: 0.52,
                                                h: 0.53
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.795,
                                                cy: 0.215,
                                                width: 0.34
                                        },
                                        landscape: {
                                                cx: 0.795,
                                                cy: 0.215,
                                                width: 0.34
                                        },
                                        compact: {
                                                cx: 0.795,
                                                cy: 0.215,
                                                width: 0.34
                                        }
                                },
                                right: 24,
                                top: 120
                        }
                },
                {
                        id: 'minato',
                        art: {
                                src: '/static/assets/tables/naruto/minato-print-v1.webp?v=1.9.20',
                                width: 768,
                                height: 1287
                        },
                        layout: {
                                anchor: 'bottom-right',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.415,
                                        y: 0.235,
                                        w: 0.365,
                                        h: 0.235
                                },
                                regions: [
                                        {
                                                id: 'palm-kunai',
                                                x: 0.01,
                                                y: 0.515,
                                                w: 0.75,
                                                h: 0.475
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.87,
                                                cy: 0.68,
                                                width: 0.19
                                        },
                                        landscape: {
                                                cx: 0.865,
                                                cy: 0.61,
                                                width: 0.2
                                        },
                                        compact: {
                                                cx: 0.865,
                                                cy: 0.61,
                                                width: 0.2
                                        }
                                },
                                right: 24,
                                bottom: 120
                        }
                },
                {
                        id: 'sasuke',
                        art: {
                                src: '/static/assets/tables/naruto/sasuke-print-v1.webp?v=1.9.20',
                                width: 768,
                                height: 1316
                        },
                        layout: {
                                anchor: 'bottom-left',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.365,
                                        y: 0.285,
                                        w: 0.37,
                                        h: 0.245
                                },
                                regions: [
                                        {
                                                id: 'cross-arm',
                                                x: 0.19,
                                                y: 0.49,
                                                w: 0.72,
                                                h: 0.205
                                        },
                                        {
                                                id: 'sword',
                                                x: 0.06,
                                                y: 0.42,
                                                w: 0.2,
                                                h: 0.205
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.2,
                                                cy: 0.75,
                                                width: 0.2
                                        },
                                        landscape: {
                                                cx: 0.2,
                                                cy: 0.75,
                                                width: 0.2
                                        },
                                        compact: {
                                                cx: 0.22500000000000003,
                                                cy: 0.75,
                                                width: 0.18
                                        }
                                },
                                left: 24,
                                bottom: 120
                        }
                }
        ],
        soundPack: {
                version: '1',
                events: {
                        discard: {
                                src: '/static/assets/audio/table-themes/naruto/discard-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.76
                        },
                        pong: {
                                src: '/static/assets/audio/table-themes/naruto/pong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.83
                        },
                        kong: {
                                src: '/static/assets/audio/table-themes/naruto/kong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.86
                        },
                        hu: {
                                src: '/static/assets/audio/table-themes/naruto/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        },
                        zi_mo: {
                                src: '/static/assets/audio/table-themes/naruto/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        }
                }
        }
}),
    Object.freeze({
        id: 'league-of-legends',
        name: '英雄联盟 · 峡谷幻光',
        subtitle: '青蓝风痕，粉紫晶光，三位英雄共赴峡谷',
        version: '1',
        tileBack: '#cfba8b',
        tileBackDark: '#a38b58',
        colors: {
                center: '#48647b',
                middle: '#355165',
                edge: '#233948',
                rim: '#152c38'
        },
        material: {
                kind: 'matte-woven',
                texture: {
                        src: '/static/assets/tables/league-of-legends/rift-fabric-v1.webp?v=1.9.20',
                        width: 1024,
                        height: 1024
                },
                opacity: 0.6,
                grain: 0.025
        },
        border: {
                color: '#152c38',
                line: '#b49a68',
                stitch: '#8e8063',
                width: 13,
                radius: 22
        },
        tableUiTokens: {
                plate: '#152d3d',
                raised: '#2d4658',
                text: '#f0ead8',
                muted: '#c7d4dc',
                line: '#91a2af',
                accent: '#e3c58a',
                actionLight: '#607c90',
                actionDark: '#354f65',
                active: '#3f5d72'
        },
        art: {
                src: '/static/assets/tables/league-of-legends/yasuo-print-v1.webp?v=1.9.20',
                width: 1024,
                height: 795
        },
        thumbnail: {
                src: '/static/assets/tables/league-of-legends/rift-thumb-v1.webp?v=1.9.20',
                width: 210,
                height: 140
        },
        layout: {
                mode: 'anchored-ensemble',
                aspect: 1.2880503144654087,
                desktopHeight: 700,
                landscapeHeight: 660,
                face: {
                        x: 0.618,
                        y: 0.291,
                        w: 0.092,
                        h: 0.111
                },
                regions: [
                        {
                                id: 'holding-hand',
                                x: 0.19,
                                y: 0.48,
                                w: 0.105,
                                h: 0.11
                        },
                        {
                                id: 'visible-blade',
                                x: 0,
                                y: 0.365,
                                w: 0.19,
                                h: 0.17
                        }
                ],
                placements: {
                        desktop: {
                                cx: 0.31499999999999995,
                                cy: 0.195,
                                width: 0.4
                        },
                        landscape: {
                                cx: 0.33999999999999997,
                                cy: 0.23500000000000001,
                                width: 0.4
                        },
                        compact: {
                                cx: 0.31499999999999995,
                                cy: 0.215,
                                width: 0.4
                        }
                }
        },
        accents: [
                {
                        id: 'jinx',
                        art: {
                                src: '/static/assets/tables/league-of-legends/jinx-print-v1.webp?v=1.9.20',
                                width: 1024,
                                height: 663
                        },
                        layout: {
                                anchor: 'bottom-left',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.455,
                                        y: 0.16,
                                        w: 0.148,
                                        h: 0.197
                                },
                                regions: [
                                        {
                                                id: 'shark-mouth',
                                                x: 0.012,
                                                y: 0.15,
                                                w: 0.215,
                                                h: 0.335
                                        },
                                        {
                                                id: 'weapon-hand',
                                                x: 0.225,
                                                y: 0.375,
                                                w: 0.104,
                                                h: 0.18
                                        },
                                        {
                                                id: 'tattoo',
                                                x: 0.633,
                                                y: 0.37,
                                                w: 0.074,
                                                h: 0.174
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.29,
                                                cy: 0.7250000000000001,
                                                width: 0.38
                                        },
                                        landscape: {
                                                cx: 0.24,
                                                cy: 0.7250000000000001,
                                                width: 0.3
                                        },
                                        compact: {
                                                cx: 0.24,
                                                cy: 0.7450000000000001,
                                                width: 0.3
                                        }
                                },
                                left: 24,
                                bottom: 120
                        }
                },
                {
                        id: 'gwen',
                        art: {
                                src: '/static/assets/tables/league-of-legends/gwen-print-v1.webp?v=1.9.20',
                                width: 1024,
                                height: 709
                        },
                        layout: {
                                anchor: 'bottom-right',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.495,
                                        y: 0.187,
                                        w: 0.07,
                                        h: 0.105
                                },
                                regions: [
                                        {
                                                id: 'scissors-upper-blade',
                                                x: 0.13,
                                                y: 0.058,
                                                w: 0.295,
                                                h: 0.156
                                        },
                                        {
                                                id: 'scissors-lower-blade',
                                                x: 0.065,
                                                y: 0.178,
                                                w: 0.3,
                                                h: 0.071
                                        },
                                        {
                                                id: 'scissors-ring',
                                                x: 0.694,
                                                y: 0.417,
                                                w: 0.105,
                                                h: 0.153
                                        },
                                        {
                                                id: 'gripping-hand',
                                                x: 0.638,
                                                y: 0.526,
                                                w: 0.076,
                                                h: 0.059
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.8250000000000001,
                                                cy: 0.68,
                                                width: 0.38
                                        },
                                        landscape: {
                                                cx: 0.8250000000000001,
                                                cy: 0.7000000000000001,
                                                width: 0.38
                                        },
                                        compact: {
                                                cx: 0.8250000000000001,
                                                cy: 0.68,
                                                width: 0.34
                                        }
                                },
                                right: 24,
                                bottom: 120
                        }
                }
        ],
        soundPack: {
                version: '1',
                events: {
                        discard: {
                                src: '/static/assets/audio/table-themes/league-of-legends/discard-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.76
                        },
                        pong: {
                                src: '/static/assets/audio/table-themes/league-of-legends/pong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.83
                        },
                        kong: {
                                src: '/static/assets/audio/table-themes/league-of-legends/kong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.86
                        },
                        hu: {
                                src: '/static/assets/audio/table-themes/league-of-legends/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        },
                        zi_mo: {
                                src: '/static/assets/audio/table-themes/league-of-legends/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        }
                }
        }
}),
    Object.freeze({
        id: 'spy-family',
        name: '间谍过家家 · 秘密家宴',
        subtitle: '灰绿织纹，旧金收线，三人的秘密家宴',
        version: '1',
        tileBack: '#e8cc93',
        tileBackDark: '#6a4c28',
        colors: {
                center: '#8da79a',
                middle: '#779287',
                edge: '#586f63',
                rim: '#24372e'
        },
        material: {
                kind: 'matte-woven',
                texture: {
                        src: '/static/assets/tables/spy-family/supper-fabric-v1.webp?v=1.9.20',
                        width: 1024,
                        height: 1024
                },
                opacity: 0.6,
                grain: 0.022
        },
        border: {
                color: '#24372e',
                line: '#b49a68',
                stitch: '#958763',
                width: 13,
                radius: 22
        },
        tableUiTokens: {
                plate: '#243a30',
                raised: '#3b5347',
                text: '#f4eedf',
                muted: '#d4e0d5',
                line: '#a5b5a4',
                accent: '#ecd5a0',
                actionLight: '#7b9788',
                actionDark: '#425e50',
                active: '#486153'
        },
        art: {
                src: '/static/assets/tables/spy-family/loid-print-v1.webp?v=1.9.20',
                width: 891,
                height: 1533
        },
        thumbnail: {
                src: '/static/assets/tables/spy-family/supper-thumb-v1.webp?v=1.9.20',
                width: 210,
                height: 140
        },
        layout: {
                mode: 'anchored-ensemble',
                aspect: 0.5812133072407045,
                desktopHeight: 700,
                landscapeHeight: 660,
                face: {
                        x: 0.35,
                        y: 0.055,
                        w: 0.22,
                        h: 0.109
                },
                regions: [
                        {
                                id: 'pistol-hand',
                                x: 0.19,
                                y: 0.11,
                                w: 0.17,
                                h: 0.11
                        },
                        {
                                id: 'extended-forearm',
                                x: 0.32,
                                y: 0.165,
                                w: 0.3,
                                h: 0.07
                        }
                ],
                placements: {
                        desktop: {
                                cx: 0.28,
                                cy: 0.30999999999999994,
                                width: 0.28
                        },
                        landscape: {
                                cx: 0.13000000000000003,
                                cy: 0.32999999999999996,
                                width: 0.24
                        },
                        compact: {
                                cx: 0.13000000000000003,
                                cy: 0.32999999999999996,
                                width: 0.24
                        }
                }
        },
        accents: [
                {
                        id: 'yor',
                        art: {
                                src: '/static/assets/tables/spy-family/yor-print-v1.webp?v=1.9.20',
                                width: 1024,
                                height: 1156
                        },
                        layout: {
                                anchor: 'bottom-right',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.6135,
                                        y: 0.0995,
                                        w: 0.148,
                                        h: 0.128
                                },
                                regions: [
                                        {
                                                id: 'near-face-hand',
                                                x: 0.61,
                                                y: 0.186,
                                                w: 0.115,
                                                h: 0.07
                                        },
                                        {
                                                id: 'weapon-and-right-hand',
                                                x: 0.864,
                                                y: 0.285,
                                                w: 0.127,
                                                h: 0.108
                                        },
                                        {
                                                id: 'gold-weapon-tips',
                                                x: 0.776,
                                                y: 0.333,
                                                w: 0.12,
                                                h: 0.144
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.78,
                                                cy: 0.65,
                                                width: 0.44
                                        },
                                        landscape: {
                                                cx: 0.805,
                                                cy: 0.67,
                                                width: 0.38
                                        },
                                        compact: {
                                                cx: 0.78,
                                                cy: 0.65,
                                                width: 0.28
                                        }
                                },
                                right: 24,
                                bottom: 120
                        }
                },
                {
                        id: 'anya',
                        art: {
                                src: '/static/assets/tables/spy-family/anya-print-v1.webp?v=1.9.20',
                                width: 1024,
                                height: 1321
                        },
                        layout: {
                                anchor: 'bottom-left',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.375,
                                        y: 0.146,
                                        w: 0.271,
                                        h: 0.177
                                },
                                regions: [
                                        {
                                                id: 'left-open-hand',
                                                x: 0.018,
                                                y: 0.196,
                                                w: 0.168,
                                                h: 0.112
                                        },
                                        {
                                                id: 'right-open-hand',
                                                x: 0.831,
                                                y: 0.203,
                                                w: 0.164,
                                                h: 0.112
                                        },
                                        {
                                                id: 'black-gold-ornaments',
                                                x: 0.282,
                                                y: 0.067,
                                                w: 0.414,
                                                h: 0.1
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.24,
                                                cy: 0.7799999999999999,
                                                width: 0.32
                                        },
                                        landscape: {
                                                cx: 0.24,
                                                cy: 0.7599999999999999,
                                                width: 0.24
                                        },
                                        compact: {
                                                cx: 0.24,
                                                cy: 0.7599999999999999,
                                                width: 0.22
                                        }
                                },
                                left: 24,
                                bottom: 120
                        }
                },
                {
                        id: 'title',
                        art: {
                                src: '/static/assets/tables/spy-family/title-print-v1.webp?v=1.9.20',
                                width: 1536,
                                height: 483
                        },
                        layout: {
                                anchor: 'top-left',
                                widths: {
                                        desktop: 240,
                                        landscape: 210,
                                        compact: 180
                                },
                                face: {
                                        x: 0.018,
                                        y: 0.018,
                                        w: 0.964,
                                        h: 0.964
                                },
                                regions: [
                                        {
                                                id: 'whole-original-logo',
                                                x: 0.018,
                                                y: 0.018,
                                                w: 0.964,
                                                h: 0.964
                                        }
                                ],
                                placements: {
                                        desktop: {
                                                cx: 0.22,
                                                cy: 0.17,
                                                width: 0.22
                                        },
                                        landscape: {
                                                cx: 0.22,
                                                cy: 0.17,
                                                width: 0.22
                                        },
                                        compact: {
                                                cx: 0.22,
                                                cy: 0.17,
                                                width: 0.22
                                        }
                                },
                                left: 24,
                                top: 120
                        }
                }
        ],
        soundPack: {
                version: '1',
                events: {
                        discard: {
                                src: '/static/assets/audio/table-themes/spy-family/discard-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.76
                        },
                        pong: {
                                src: '/static/assets/audio/table-themes/spy-family/pong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.83
                        },
                        kong: {
                                src: '/static/assets/audio/table-themes/spy-family/kong-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.86
                        },
                        hu: {
                                src: '/static/assets/audio/table-themes/spy-family/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        },
                        zi_mo: {
                                src: '/static/assets/audio/table-themes/spy-family/hu-v1.wav?v=1.9.20',
                                format: 'wav',
                                gain: 0.9
                        }
                }
        }
}),
]);

const hex = value => /^#[0-9a-f]{6}$/i.test(value||'');
const bounded = (value,min,max) => Number.isFinite(value)&&value>=min&&value<=max;
const localImage = asset => asset&&typeof asset.src==='string'
    &&/^\/static\/assets\/tables\/[a-zA-Z0-9/_-]+\.(webp|png)(\?v=[a-zA-Z0-9.-]+)?$/.test(asset.src)
    &&Number.isInteger(asset.width)&&bounded(asset.width,1,2048)
    &&Number.isInteger(asset.height)&&bounded(asset.height,1,2048);
const faceBounds = f => f&&['x','y','w','h'].every(key=>bounded(f[key],0,1))
    &&f.w>0&&f.h>0&&f.x+f.w<=1&&f.y+f.h<=1;
const placementProfiles = p => p&&['desktop','landscape','compact'].every(k=>
    p[k]&&bounded(p[k].cx,.05,.95)&&bounded(p[k].cy,.05,.95)&&bounded(p[k].width,.06,.70));
const detailRegions = regions => regions===undefined||Array.isArray(regions)&&regions.length<=12
    &&regions.every(r=>/^[a-z][a-z0-9-]{0,31}$/.test(r?.id||'')&&faceBounds(r));
const localAudio=asset=>asset&&/^\/static\/assets\/audio\/table-themes\/[a-zA-Z0-9/_-]+\.wav(\?v=[a-zA-Z0-9.-]+)?$/.test(asset.src||'')
    &&asset.format==='wav'&&bounded(asset.gain,.05,1);

export function themeImageAssets(theme) {
    return [theme.art,theme.thumbnail,theme.material.texture,...(theme.accents||[]).map(a=>a.art)].filter(Boolean);
}

export function validateTheme(theme,{requireContrast=true}={}) {
    if(!theme||!/^[a-z][a-z0-9-]{0,31}$/.test(theme.id||'')||typeof theme.name!=='string'
        ||!theme.name.trim()||typeof theme.version!=='string')return false;
    if(!theme.colors||!['center','middle','edge','rim'].every(key=>hex(theme.colors[key])))return false;
    if(theme.tileBack!==undefined&&!hex(theme.tileBack))return false;
    if(theme.tileBackDark!==undefined&&!hex(theme.tileBackDark))return false;
    if(theme.soundPack!==undefined&&(!theme.soundPack||!(typeof theme.soundPack.version==='string'&&theme.soundPack.version)
        ||!theme.soundPack.events||!['discard','pong','kong','hu','zi_mo'].every(k=>localAudio(theme.soundPack.events[k]))))return false;
    const material=theme.material,border=theme.border,ui=theme.tableUiTokens;
    if(!material||!['felt','matte-woven'].includes(material.kind)||!bounded(material.opacity,0,.6)
        ||!bounded(material.grain,0,.3)||(material.texture&&!localImage(material.texture)))return false;
    if(!border||!['color','line','stitch'].every(key=>hex(border[key]))
        ||!bounded(border.width,4,22)||!bounded(border.radius,8,30))return false;
    if(!ui||!['plate','raised','text','muted','line','accent','actionLight','actionDark','active'].every(key=>hex(ui[key])))return false;
    if((theme.art&&!localImage(theme.art))||(theme.thumbnail&&!localImage(theme.thumbnail)))return false;
    if(theme.accents!==undefined){
        if(!Array.isArray(theme.accents)||theme.accents.length>4)return false;
        const ids=new Set();
        for(const accent of theme.accents){
            const l=accent?.layout;
            if(!accent||!/^[a-z][a-z0-9-]{0,31}$/.test(accent.id||'')||ids.has(accent.id)
                ||!localImage(accent.art)||!l||!['bottom-right','bottom-left','top-right','top-left'].includes(l.anchor)
                ||!['desktop','landscape','compact'].every(k=>bounded(l.widths?.[k],60,240))
                ||!bounded(l.anchor.endsWith('left')?l.left:l.right,20,120)
                ||!bounded(l.anchor.startsWith('top')?l.top:l.bottom,20,180)
                ||(l.faceRiverLimit!==undefined&&(!Number.isInteger(l.faceRiverLimit)||!bounded(l.faceRiverLimit,24,30)))
                ||(l.underlay!==undefined&&!['allow','protect-detail'].includes(l.underlay))||!faceBounds(l.face))return false;
            ids.add(accent.id);
            if(!detailRegions(l.regions)||theme.layout?.mode==='anchored-ensemble'&&!placementProfiles(l.placements))return false;
        }
    }
    if(theme.art&&!theme.layout)return false;
    if(theme.layout){
        const l=theme.layout,f=l.face;
        if(l.mode!==undefined&&!['full-cloth','anchored-ensemble'].includes(l.mode))return false;
        if(l.mode==='anchored-ensemble'&&(!theme.art||!placementProfiles(l.placements)))return false;
        if(l.mode==='full-cloth'&&(!theme.art||theme.art.width!==theme.art.height||l.aspect!==1))return false;
        if(l.regions!==undefined&&(!Array.isArray(l.regions)||l.regions.length>12
            ||l.regions.some(r=>!/^[a-z][a-z0-9-]{0,31}$/.test(r?.id||'')||!faceBounds(r))))return false;
        if(!bounded(l.aspect,.3,2)||!['desktopHeight','landscapeHeight'].every(key=>bounded(l[key],100,700))
            ||!f||!['x','y','w','h'].every(key=>bounded(f[key],0,1))||f.w<=0||f.h<=0||f.x+f.w>1||f.y+f.h>1)return false;
        if(theme.art&&Math.abs(l.aspect-theme.art.width/theme.art.height)>.002)return false;
    }
    return !requireContrast||themeContrast(theme).primary.pass&&themeContrast(theme).dark.pass;
}

export function themeContrast(theme) {
    const back=theme.tileBack||'#e29936';
    return {primary:colourContrast(back,theme.colors.middle),
        dark:colourContrast(theme.tileBackDark||deriveBackDark(back),theme.colors.middle)};
}

export function themeById(id,catalog=TABLE_THEMES) {
    return Array.isArray(catalog)?catalog.find(theme=>{
        if(theme?.id!==id)return false;
        // Explicit fixed-palette exception, NOT a relaxed metric: the mandated
        // Naiwa primary has ΔL=.02658 (fails); dark has .12554 (passes). Strict
        // validateTheme still returns false. Only this shipped object may be
        // used, to preserve the user's exact colours; new themes must pass.
        const fixedNaiwa=theme===TABLE_THEMES[1]&&theme.tileBack==='#157171'
            &&theme.tileBackDark==='#005353'&&theme.colors.middle==='#76694f';
        return validateTheme(theme,{requireContrast:!fixedNaiwa});
    })||null:null;
}
