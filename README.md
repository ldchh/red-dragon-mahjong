---
title: Hongzhong Mahjong
emoji: 🀄
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
---

# 红中麻将 · 一桌好牌

支持好友同桌与人机练习的湖南红中麻将。Python 后端、原生 HTML/CSS/JavaScript 前端，无前端构建步骤。

v1.9.20 新增「海贼王 · 红发香克斯」独立牌背：完整举刀构图、暗红底色与鲜红刀光，可免费预览，1 张礼券永久解锁。装扮预览在启动时准备并保留缓存，点开更快。默认配色、柯南及香克斯共三项；牌背与牌面、桌布独立搭配，保留原麻将字图与已有权益。见 [美术制作记录](docs/art/tile-backs/one-piece-shanks/README.md)、[真实截图索引](output/playwright/shanks-back/index.html)、[本次验收](docs/红发香克斯牌背实现与验收-v1.9.20.md)、[正式 APK](releases/hongzhong-mahjong-1.9.20.apk) 和 [上传与更新说明](docs/HuggingFace上传与自动更新-v1.9.20.md)。

v1.9.19 每天完成4场10／15／20局整场对局可领取1张礼券，离线与联机合并进度；登峰礼新增第七大段2券、第八大段4券。修复蓝紫幻纹详情在滚动条临界高度反复抖动。APK、真实对局与录屏证据见 [本次验收](docs/礼券任务与装扮预览验收-v1.9.19.md) 和 [上传与更新说明](docs/HuggingFace上传与自动更新-v1.9.19.md)。

v1.9.17 新增第十三款「间谍过家家 · 秘密家宴」：灰绿织纹、旧金收线，劳埃德、约尔、阿尼亚与完整 SPY×FAMILY 字标同桌，自动使用轻木／机械合扣和短爵士钢琴行动音。免费预览试听，1 张礼券永久解锁；牌面与独立牌背分别保留，原牌值图、旧主题、声音、钱包和规则保持。见 [本次真实截图索引](output/playwright/spy-family/index.html)、[声音试听](docs/audio/spy-family/试听.html)、[美术制作记录](docs/art/spy-family/README.md) 和 [实现与验收](docs/间谍过家家秘密家宴实现与验收-v1.9.17.md)。309 项功能回归及 3307 个本次浏览器断言通过；4×CPU严格20ms基线问题与改后变化单独列入验收。安卓资源已同步并检查 Java 编译；**未重新打包，现有 v1.9.14 APK 不包含本次改动**，未发布线上。

v1.9.16 新增第十二款「英雄联盟 · 峡谷幻光」：青蓝织物、岩纹风痕、晶光雾带与三位指定英雄，自动使用短风切／晶体合扣／奇幻完成行动音。免费预览试听，1 张礼券永久解锁；牌面与独立牌背分别保留，原牌值图、旧主题、声音、钱包和对局规则不变。见 [本次真实截图索引](output/playwright/league-of-legends/index.html)、[声音试听](docs/audio/league-of-legends/试听.html)、[美术制作记录](docs/art/league-of-legends/README.md) 和 [实现与验收](docs/英雄联盟峡谷幻光实现与验收-v1.9.16.md)。功能回归通过，4×CPU严格20ms性能门槛改前／改后均未通过，变化如实记录。安卓源码资源已同步并做Java编译检查；**未重新打包，现有v1.9.14 APK不包含本次改动**，未发布线上。

v1.9.15 新增独立牌背「名侦探柯南 · 蓝金徽章」，可免费预览，1 张礼券永久解锁，已拥有者免费使用。牌面与牌背自由搭配：独立牌背优先，其次牌面默认背色，最后桌布配色；切换牌面或桌布保留已选牌背。原牌值图片、蓝紫幻纹V4、11款桌布和声音保持。见 [平面纹理](static/assets/tile-backs/detective-conan/blue-gold-v1.webp)、[本次真实截图索引](output/playwright/conan-back/index.html) 和 [实现与验收](docs/柯南蓝金徽章牌背实现与验收-v1.9.15.md)。安卓资源已同步校验并完成 Java 编译检查；**未重新打包，现有 v1.9.14 APK 不包含本次改动**，未发布线上。

v1.9.14 新增「火影忍者 · 忍道墨卷」：四位指定忍者同卷，烟青纸墨桌布配木扣／短笛行动音；鼬、红月及乌鸦固定右上，水门移到右下。免费预览试听，1 张礼券永久解锁；当前牌面、配套牌背、已有装扮和存档保留。见 [真实截图索引](output/playwright/naruto/index.html)、[声音试听](docs/audio/naruto/试听.html) 和 [本次验收](docs/火影忍者忍道墨卷实现与验收-v1.9.14.md)。已构建沿用原签名的 [正式 APK](output/apk/hongzhong-mahjong-1.9.14.apk)，收录截至本版的11款桌布及蓝紫幻纹V4；[Hugging Face 上传包与更新说明](docs/HuggingFace上传与自动更新-v1.9.14.md) 已准备。按后续决定暂未发布，未向玩家发送通知。

v1.9.13 新增「海贼王 · 向新世界出航」：使用玩家选定的完整蓝海船景和透明动画标题，暖木桌沿搭配木扣／轻鼓／短拨弦行动音。免费预览试听，1 张礼券永久解锁；保留当前牌面、配套牌背、旧主题、钱包与存档。见 [真实截图索引](output/playwright/one-piece/index.html)、[声音试听](docs/audio/one-piece/试听.html) 和 [本次验收](docs/海贼王向新世界出航实现与验收-v1.9.13.md)。本次不打包 APK、不发布线上；**未重新打包，现有 v1.9.8 APK 不包含本次改动**。

v1.9.12 新增「名侦探柯南 · 真相之眼」：暮蓝侦探书案、旧金案卷纹、新一半身与柔和暖红外套的放大镜柯南，自动绑定木扣／短钢琴行动音。免费预览试听，1 张礼券永久解锁；保留当前牌面及配套牌背、旧主题、钱包、规则和存档。见 [真实截图索引](output/playwright/detective-conan/index.html)、[声音试听](docs/audio/detective-conan/试听.html) 和 [本次验收](docs/名侦探柯南真相之眼实现与验收-v1.9.12.md)。本次只同步校验安卓资源与 Java 源码，**未重新打包，现有 v1.9.8 APK 不包含本次改动**，未发布线上。

v1.9.11 返工「赛博朋克 · 蓝紫幻纹」牌面，按用户最新明亮原图制作青蓝／淡紫晶面、流光双框、云纹与星芒；原 28 PNG 与 28 SVG 保留原字节，图案直接叠在底纹上。保留同一商品 ID 和购买权益，已拥有者免费换新，新玩家 1 张礼券永久解锁；配套蓝紫牌背优先于桌布，切回经典恢复原偏好，声音继续跟随桌布。见 [真实截图索引](output/playwright/cyberpunk-face/rework-soft-v4/index.html)、[验收与未验证范围](docs/蓝紫幻纹牌面返工验收-v1.9.11.md)。安卓源码资源已同步校验；**未重新打包，现有 v1.9.8 APK 不包含本次改动**，未发布线上。

v1.9.9 新增第八款完整桌布「狐妖小红娘 · 花缘雅集」：烟青绢面、藕粉花枝、细红绳与旧金收边，三位雅客配有玉碰／短弦行动音。默认锁定，可免费预览试听，1 张礼券永久解锁；旧主题、钱包、规则和存档保留。实景与声音见 [截图索引](output/playwright/fox-spirit/index.html)、[独立试听](docs/audio/fox-spirit/试听.html) 和 [本次验收](docs/狐妖小红娘花缘雅集实现与验收-v1.9.9.md)。安卓源码资源已同步并做 Java 编译检查；未重新打包，现有 v1.9.8 APK 不包含本次改动，未发布线上。

v1.9.8 新增设置兑换码、新人有礼和真人友人场每日任务；登峰第 2／3／5 大段分别奖励 1／1／2 张礼券，老玩家第五大段可补领差额。安卓联机与离线都使用完整内置素材，启动后自动检查安装包更新，显示更新内容和下载入口。见 [本次验收](docs/礼券活动与自动更新验收-v1.9.8.md)、[截图索引](output/playwright/rewards-v198/index.html)、[正式 APK](output/apk/hongzhong-mahjong-1.9.8.apk) 和 [Hugging Face 上传说明](docs/HuggingFace上传与自动更新-v1.9.8.md)。未自动发布线上。

v1.9.7 新增第七款完整桌布「赛博朋克 · 霓虹暮城」：蓝紫城市、薄雾灯带与局部屋顶背影，自动绑定电子出牌／碰／杠／胡音。免费预览试听，1 张礼券永久解锁；沿用已有钱包、预加载、稳定印花、公共视角和红色提示。见 [本次验收](docs/赛博朋克霓虹暮城实现与验收-v1.9.7.md)、[真实截图索引](output/playwright/cyberpunk/index.html)、[声音试听](docs/audio/cyberpunk/试听.html)。只同步并校验安卓源码资源，**未重新打包，现有 v1.9.6 APK 不包含本次改动**；未发布线上。

v1.9.6 将碰杠胡移到手牌上方，加入牌预览、大按钮、询问提示音与联机计时；当前出牌使用贴合透视牌面的红色细框和小三角，按玩家参考图恢复紧凑大小与贴牌位置。保留六款桌布、原规则、手牌及公共视角，支持键盘与减少动态效果。见 [本次验收](docs/碰杠操作条与出牌聚光验收-v1.9.6.md)、[九尺寸截图与试听索引](output/playwright/table-cues-v196/index.html)。已按后续要求构建 [v1.9.6 APK](output/apk/hongzhong-mahjong-1.9.6.apk)，通过签名、对齐和 154 个内置资源的一致性校验；本版未做安卓安装运行验证，未发布线上。

v1.9.5 入馆先准备牌面、六款桌布、头像、字体与行动声音，显示真实加载进度；牌面失败可重试，减少白板。装扮预览及时更新，解锁失败不扣券；听牌和聊天不再隐藏桌布印花。见 [验收与截图](docs/启动预加载与装扮稳定性验收-v1.9.5.md)、[Space 上传说明](docs/HuggingFace上传清单-v1.9.5.md)。本版只同步安卓资源，没有重新打包；现有 [v1.9.4 APK](output/apk/hongzhong-mahjong-1.9.4.apk) 不包含本次改动。

## 启动

需要 Python 3.10 或以上版本。

```bash
python -m pip install -r requirements.txt
python app.py
```

打开 [本地牌馆](http://localhost:7860)。默认端口是 **7860**，可用环境变量 `PORT` 更改。

在主界面点击“友人场”，创建房间并选择 1 / 5 / 10 / 15 / 20 局，将六位房间号发给好友。房主点击“开始对局”，空位自动补齐人机。点击“离线场”可进入本机人机牌馆。

v1.9.3 新增第六款“蛋仔派对 · 弹弹乐园”：蜜桃粉整桌、雾青滑道、跳跃蛋仔和两名伙伴，搭配软胶轻弹、双／三拍回弹及短庆祝音。默认锁定，可免费预览和试听，确认用 1 张礼券永久解锁并使用；旧钱包、偏好和统一段位保留。本次已构建带全新红中麻将图标的 Android APK，未发布线上。制作、当前测试和未验证范围见 [验收记录](docs/蛋仔派对弹弹乐园实现与验收-v1.9.3.md)，实景与声音见 [本次截图索引](output/playwright/eggy-party/index.html)。

v1.9.2 再次提亮大厅、友人场和功能按钮，移除局内昵称长条底框。离线与联机共用一个段位，首次合并取当前较高值而不叠加星数，按设备自然月重置并保留历史；登峰礼检查当前段位，已有礼券和装扮保留。规则说明集中到设置的“规则”页。实现、检查结果和九尺寸截图见 [本次验收](docs/统一段位与界面精简验收-v1.9.2.md) 和 [截图索引](output/playwright/lobby-v192/index.html)。安卓资源已同步；未重新打包，现有 APK 不包含本次改动；没有发布 Hugging Face，联机同步需要随后部署本版后端及前端。

v1.9.1 稍微提亮大厅绿色底色。离线新牌桌取消轻松／标准／进阶选择，人机随当前离线大段自动设置 1–8 档，开桌后整场固定；10／15／20 局整场加星与联机一致，≥30 分额外 +1 星。旧存档保留原难度和结算规则，1／5 局新牌桌仅练习且可推进清水胡任务；自然月重置和每日午夜刷新保持。检查与实景见 [本次验收](docs/大厅提亮与离线段位人机验收-v1.9.1.md)。安卓仅同步资源和编译检查，未重新打包或发布。

v1.9.0 将主界面改为横屏一屏舞台，个人信息、活动、装扮与设置采用卷轴弹层；新增八枚段位徽章、登峰礼券和本机装扮钱包。对手未公开手牌使用屏幕空间立体立牌，本人手牌、公共相机、牌河、副露、规则与主题素材保持。实现、九种尺寸实景、测试与性能对比见 [本版验收](docs/主界面改版与礼券装扮验收-v1.9.0.md) 和 [截图索引](output/playwright/lobby-v190/index.html)。

## 玩法与操作

- 112 张牌：万、筒、条各 36 张，红中 4 张。红中作癞子；不能吃，普通胡牌仅可自摸；支持七对、抢补杠。
- 点击手牌出牌，也可用左右方向键选择，回车或空格出牌。碰、杠、胡、过在适用时显示。
- “听”按钮可查看可胡的牌；桌面提供自动胡牌、声音开关和快捷聊天。
- 人机难度随房主段位变化，支持断线人机接管；90 秒内刷新或恢复连接可取回原座位。大厅的临时离线座位也会保留 90 秒。
- 10 / 15 / 20 局整场结算计入统一段位。离线与联机共用本机段位，联机回执由服务器按玩家身份保存，修改昵称不会改变段位。
- 浏览器保留玩家身份和房间恢复信息。运行资源均位于 `static/`，牌面使用本地 SVG／PNG，不需要外部 CDN 或字体下载。

完整规则见 [规则说明.md](规则说明.md)。

## Android APK

当前安装包为 [hongzhong-mahjong-1.9.19.apk](output/apk/hongzhong-mahjong-1.9.19.apk)，包含十三款完整桌布、蓝紫幻纹V4、柯南独立牌背与自由搭配、本地牌面与声音、礼券活动和自动检查更新。增加共享的每日四场礼券与第七／八大段奖励，修复装扮详情滚动临界位置的循环抖动。联机与离线页面均内置，232个包内运行文件已与源码校验，图片、字体和声音无需从服务器下载；启动直接进入全屏横屏离线主界面，断网或 Hugging Face 未启动仍可与三位本机人机游玩。新牌桌人机随统一大段设置 1–8 档，10／15／20 局整场排位与联机加星一致；历史存档沿用原规则。

沿用现有签名；物理手机／平板未测，本次模拟器检查结果以验收记录为准。钱包、装扮和统一段位通过原生文件在联机／离线共用；自然月归档、每日本地午夜刷新保持。旧包已有自动更新机制，发布新版APK和清单后会在启动加载完成的主页提示更新内容，玩家点击下载并按系统提示覆盖安装；1.9.6及更早的旧包需要手动装一次。原生首页仅为加载失败的兜底。当前因本机缺少HF写入凭据尚未上线。安装机制见 [Android 说明](android/README.md)；本版安装包与兑换目录见 [上传说明](docs/HuggingFace上传与自动更新-v1.9.19.md)。

## 牌桌装扮

提供经典青玉、“奶蛙 · 捧腹大笑”、“玉桂狗 · 云端游园”、“无畏契约 · 萌系特工”、“库洛米 · 莓紫心愿”、“蛋仔派对 · 弹弹乐园”、“赛博朋克 · 霓虹暮城”、“狐妖小红娘 · 花缘雅集”、“名侦探柯南 · 真相之眼”、“海贼王 · 向新世界出航”、“火影忍者 · 忍道墨卷”、“英雄联盟 · 峡谷幻光”和“间谍过家家 · 秘密家宴”十三款完整桌布。装扮只在主页打开；锁定款可免费预览试听，各需 1 张礼券，二次确认后永久解锁并使用。首次创建钱包保留老玩家当前非默认款，其余上锁。登峰第 2／3／5 大段分别领 1／1／2 张礼券；第五大段已领过 1 张的老玩家可补领 1 张，月度重置不清空领取记录。新人首次完成 10／15／20 局整场可领 1 张礼券，本设备只领一次，联机与离线共用。兑换码在设置中输入，联网向服务器核验；每个码全体玩家合计只成功兑换一次，同设备重试复用原回执。钱包和选择本机保存，取消不扣券，换装不重建手牌或改变规则。

“牌面”和“牌背”分别选择、保存。蓝紫幻纹可直接搭配「名侦探柯南 · 蓝金徽章」，不要求拥有柯南桌布；换牌面或桌布保持柯南背纹与蓝色材料，声音仍随桌布。主动选回免费的“默认配色”才清除独立纹理：蓝紫幻纹使用自身默认蓝色，经典使用当前桌布配色。新牌背运行图准备成功后才通过钱包事务扣 1 张券、永久解锁并使用；取消或失败不扣券，已拥有者图片临时失败用稳定蓝色回退，保留选择，重试后恢复。早期版本记录中的强制绑定描述已由 [独立搭配原则](docs/牌面与牌背独立搭配原则.md) 取代。

v1.7.10 按四张用户原图重制库洛米、紫灰长耳伙伴、心形眨眼和活泼姿态，四边灰粉飘带／蕾丝真实进入完整桌布，缩略图取自本次实战。自动绑定木块落点、玩具琴双击／三击和六音庆祝，自摸使用胡音；静音、试听取消和行动去重保持。60 项 Python、57 项 Node、1415 项本次浏览器检查通过；129 个安卓资源字节一致，断网副本的本地声音、解码和真实 Worker 出牌已验证。手机短横屏仅收起无安全空位的重复活泼姿态，保留伙伴主组合和心形；极限 30 张容量遮挡、未实机验证范围明确记录。见 [本次实现与验收](docs/库洛米莓紫心愿实现与验收-v1.7.10.md)、[实景和声音索引](output/playwright/kuromi/index.html)、[独立试听页](docs/audio/kuromi/试听.html)。没有打包 APK 或发布线上。

v1.7.9 按三张用户参考重制白发、猫耳与兜帽角色，接入连续四边风痕／紫影织物和配套出牌、碰、杠、胡音；自摸复用胡音。应用和刷新自动绑定声音，静音偏好保留。修正装饰保护模板，使正常 0–4 组副露、本人提示与最大容量都参与避让；短横屏的第四项可滚动选择。59 项 Python、56 项 Node、1163 项本次浏览器检查通过；120 个安卓资源逐字节校验，并验证断网副本加载、声音解码和真实 Worker 出牌。在线完整一局与离线结算／下一局已验证。七尺寸截图、实测值、极限容量遮挡及未实机验证范围见 [实现与验收](docs/无畏契约萌系特工实现与验收-v1.7.9.md)、[实景和声音索引](output/playwright/valorant/index.html) 与 [独立试听页](docs/audio/valorant/试听.html)。没有打包 APK 或发布线上。

v1.7.8 补齐玉桂狗四周云雾织物、左下气球束和右上云星挂饰，缩略图取自实际牌桌，整桌预览也显示相同云雾材质。手机横屏按信息保护区收减右上挂饰，左下气球束与完整云雾桌布保留。26 项 Node、8 项 Python 相关回归及 801 项本次浏览器检查通过，111 个安卓资源同步并逐项字节校验；见 [补全记录](docs/玉桂狗云雾与印花补全-v1.7.8.md) 和 [本次实景索引](output/playwright/cinnamoroll-clouds/index.html)。没有重新打包或发布。

玉桂狗自带四类专属行动声音，应用和刷新自动绑定，自摸复用胡牌音；本人听到的各家行动使用本人主题。主页可主动试听，取消停止且不改正式选择，换桌保持静音。新声音从实际下载的木敲／拨弦原料剪辑加工，来源、制作和真实浏览器输出录音见 [v1.7.7 交付记录](docs/玉桂狗云端游园实现与验收-v1.7.7.md)，可打开 [本次截图与声音索引](output/playwright/cinnamoroll/index.html) 或 [独立试听页](docs/audio/cinnamoroll/试听.html)。

在线与安卓离线共用同一牌面工厂、双色实体牌身和主题系统。v1.7.2 按用户最新要求，将万、筒、条及红中全部 28 种牌面统一为本机雀魂 Steam 4.0.35 的同一套对局贴图；大厅装饰、整桌预览、手牌、牌河、副露、听牌和抓马均使用本地 PNG。图案保留原始 RGB，只处理图集底色透明度，普通五牌不使用赤五。PNG 独立保存；原有 28 张原创 SVG 仅作为加载失败时的备用图，原生成器不会覆盖 PNG。来源、提取方法、样张和验证见 [全套牌面接入记录](docs/雀魂全套牌面接入记录.md)。

公共视角独立于主题：1000×1000 正方形桌面统一投影，风车牌河、副露与对手牌背使用同一世界坐标布局。本人手牌放大并保持正向，本人副露平躺在近端右侧桌面，头像、文字和按钮留在屏幕空间。出牌以 180ms／160ms 飞向实际投影落点，支持减少动态效果。信息保护区、牌下延伸区与脸部留白按最终投影测量，牌体自然遮挡印花。实现、七尺寸实景、实测指标和新增主题方法见 [牌桌系统交付说明](docs/牌桌系统实现与验收.md)，可打开 [截图索引](output/v1.7/index.html) 与 [指标报告](output/v1.7/metrics.html)。

v1.7.3 在奶蛙桌布右下方新增用户参考图中的趴坐微笑小奶蛙。新图案参与桌布同一透视、按屏幕缩小，与原来的大笑奶蛙形成主次；弹层占用空位时临时隐藏，关闭后恢复固定位置。在线、离线及装扮预览共用，素材本地预加载。素材、尺寸和截图见[小奶蛙补充记录](docs/奶蛙桌布小奶蛙补充记录.md)。

v1.7.4 只维护电脑与手机／平板横屏游玩：安卓启动锁定横屏；网页自动尝试方向锁定，受限时显示不可跳过的横屏提示。局内去掉标题和装扮入口，声音使用喇叭开关，对家头像贴近其牌列；大小奶蛙统一暖金黄色，昵称统一为 1–8 个 Unicode 字符。完成 101 项回归、99 项页面／方向路径检查与原生 Java 编译，保存 39 张实景，详见 [本版实现与验收](docs/横屏牌馆与界面精简验收-v1.7.4.md)。没有打包 APK 或发布线上。

v1.7.5 将本人的碰杠牌统一平躺在桌布上，手牌保持原大小并为副露让位；中央风位、局数、余牌与回合提示使用正向分区布局，解决短横屏文字覆盖。在线与离线共用，真实碰／明杠／暗杠／补杠、刷新续局和出牌均已验证，详见 [本版记录与截图](docs/本人副露与中央牌盘优化-v1.7.5.md)。安卓资源已同步，没有打包或发布。

v1.7.6 按用户要求将本人手牌宽高放大约 12%，同步副露避让与周边提示、按钮位置；修正窄横屏的实际头像保护边界，让小奶蛙继续显示。通过 20 项布局／主题／材质测试及 379 项页面检查，详见 [尺寸变化与截图](docs/手牌适度放大-v1.7.6.md)。安卓资源已同步，没有打包或发布。

## 回归检查

v1.9.20：先设 `QA_OUTPUT=output/playwright/shanks-back`，运行 `python tools/run_spy_regression.py --baseline` 保存改前330项与不可变源码；完成后同命令不带 `--baseline` 运行全部回归（新增 `test_shanks_back.cjs`、`test_shanks_back_assets.py`）。使用隔离本地服务，设 `QA_BASE_URL=http://127.0.0.1:8769`、`QA_OUTPUT=output/playwright/shanks-back/<检查名>`，依次运行 `node tools/check_shanks_back_wallet.cjs`、`failures`、`visual`、`sequence`、`animations`、`online`、`details`（后六项使用相同 `check_shanks_back_` 文件名前缀），同步安卓后运行 `check_shanks_back_native.cjs`。三项牌背目录的运行图与缩略图按启动队列动态枚举去重，不写死总资源数；旧原牌图／相机／世界布局／投影渲染继续逐字节保护。APK沿用现有签名，用 `build_android.ps1` 构建、`verify_current_apk.py` 校验234个内置运行文件；`publish_ui_release.py` 仅在本机具备Space写入凭据时执行已授权发布。结果、失败与未验证范围以 [本次验收](docs/红发香克斯牌背实现与验收-v1.9.20.md) 为准。

装扮响应使用 `node tools/check_wardrobe_open_speed.cjs --baseline` 对比冻结v1.9.19，再运行不带该参数的当前检查：桌面／手机横屏各用1×和4×CPU，每项3轮实际点击，分别记录按钮首响应与整桌预览完成时间。保留 `check_preview_stability.cjs --normal` 九尺寸和 `check_wardrobe_jitter_v1919.cjs --classic-scrollbars` 11尺寸原断言；另跑 `check_tile_face_wallet.cjs` 检查牌面原流程。用 `profile_table.cjs` 对照改前／改后局内长帧，严格20ms基线问题单列。更新清单生成后运行 `check_shanks_back_update.cjs`，最后 `python tools/build_shanks_back_evidence.py` 从真实结果汇总验收与截图索引。

v1.9.19：`QA_OUTPUT=output/playwright/v1.9.19` 下运行 `python tools/run_spy_regression.py` 保存全部193项Node、137项Python回归；新增 `test_rewards_v1919.cjs`、`test_daily_coupon_events.py`。本机隔离服务 `python tools/serve_rewards_v1919_qa.py` 在8795运行，浏览器设置 `QA_BASE_URL=http://127.0.0.1:8795`。执行 `check_rewards_v1919.cjs` 验证40小局的两场离线＋两场联机及九尺寸领奖；执行 `find_wardrobe_resize_loop.cjs --after`、`check_wardrobe_jitter_v1919.cjs --classic-scrollbars`、`record_wardrobe_jitter_v1919.cjs`，显式启用真实滚动条，保留持续尺寸采样和改前后录屏；再运行原 `check_preview_stability.cjs --normal`、`check_tile_face_wallet.cjs`。打包工具已兼容PowerShell5.1，APK与资源校验用 `build_android.ps1`、`verify_current_apk.py`；正式模拟器检查用 `check_ui_formal_v1919.cjs`。本次已修改的奖励区域单独测试，牌桌几何、规则与原美术仍逐源码／哈希保护。 当前更新浮窗验证用 `check_ui_update_v1919.cjs`；干净奖励截图用 `capture_rewards_v1919.cjs`，证据文档由 `build_rewards_v1919_evidence.py` 从本轮结果生成。

v1.9.18：`QA_OUTPUT=output/playwright/v1.9.18` 时运行 `python tools/run_spy_regression.py` 保存当前全部 Node/Python 回归，改前附加 `--baseline`。最终181项Node、133项Python共314项通过；新增 `test_standing_height.cjs`、`test_release_version.cjs`、`test_redemption_batch.py`，保留原混合副露、牌河、映射、并发及幂等检查。历史源码保护只许可本次高度与预览实现的修改，其余继续逐源码比较。真实页面用 `check_preview_stability.cjs --normal`、`capture_raised_backs.cjs`、`check_standing_v190.cjs`、`check_conan_back_visual.cjs`，通过本机隔离服务和隔离钱包运行。APK使用 `tools/build_android.ps1`；`verify_current_apk.py`核对签名／版本／资源，`check_ui_formal_v1918.cjs`只在专用模拟器运行实际签名APK，`check_ui_update_v1918.cjs`验证当前清单的更新UI。4×CPU严格20ms性能门槛仍未通过，顺序对比超过20ms帧两尺寸各增1帧，详见本次验收。

v1.9.17：`python tools/run_spy_regression.py` 保存全部 Node／Python 回归（179／130项）；新增 `test_spy_theme.cjs`、`test_spy_theme.py` 核对三人、完整字标、真实 alpha、音频、许可、原图哈希、旧素材和独立外观。隔离服务使用 `tools/serve_theme_qa.py`（`MAHJONG_QA_PORT=8769`、独立 `RANK_PROFILE_PATH`），检查设置 `QA_BASE_URL=http://127.0.0.1:8769`。先跑 `node tools/check_spy_wallet.cjs`，然后同前缀 `wallet_failure`、`visual`（经典／蓝紫 × 默认／柯南四套）、`scene`、`details`、`opening`、`long_names`、`loading`、`audio`、`audition`、`round`；权威行动使用 `serve_spy_action_qa.py` 的本机8793与 `check_spy_online.cjs`。`capture_spy_master.cjs` 冻结真实构图导出平面母稿；`check_table_cues.cjs --themes=spy-family` 保留原操作提示断言。同步安卓后跑 `check_spy_offline.cjs`、`check_spy_native.cjs`、`verify_spy_integration.py`、`check_spy_java.ps1`。关闭其他浏览器检查后运行 `profile_spy.py`，重用改前不可变基线并串行比较本版青玉／秘密家宴，严格门槛和变化如实记录；`build_spy_evidence.py` 仅从成功结果生成验收与索引。完整命令、九尺寸截图和未验证范围见本版验收。

v1.9.16：`python tools/run_league_regression.py` 保存全部 Node／Python 回归（174／126项）；新增 `test_league_theme.cjs`、`test_league_theme.py` 核对三图、alpha、声音、许可、原图哈希与目录接入。先启动本机隔离的 `tools/serve_theme_qa.py`（`MAHJONG_QA_PORT=8769`，`RANK_PROFILE_PATH` 使用测试文件），设 `QA_BASE_URL=http://127.0.0.1:8769`；权威行动另启动 `python tools/serve_league_action_qa.py`（仅本机8792、隔离临时状态）。`node tools/run_league_acceptance.cjs` 按顺序执行礼券、四套外观、九尺寸、配饰、开局、加载、声音、自然整局和操作提示；每组也可单独运行 `check_league_<名称>.cjs`。同步安卓后运行 `check_league_offline.cjs`、`check_league_native.cjs`，再用 `python tools/verify_league_integration.py` 和 `tools/check_league_java.ps1` 校验。关闭其它浏览器检查后运行 `python tools/profile_league.py` 串行比较不可变旧版、新版青玉和新桌布，保留严格20ms门槛失败与长帧变化；最后 `python tools/build_league_evidence.py` 生成制作记录、验收、实测数据与截图索引。透明素材技术导出见 `tools/export_league_art.py`，不覆盖参考图或重新生成原牌值图。本次不打包APK、不发布线上，实机等未验证范围见验收。

v1.9.15：`python tools/run_conan_back_regression.py` 保存全部 Node／Python 回归；新增 `test_tile_backs.cjs`、`test_tile_back_projection.cjs`、`test_conan_back_assets.py`，旧牌面强制绑定断言按独立搭配原则更新，原图、钱包和世界布局断言保留。浏览器使用本机隔离 `tools/serve_theme_qa.py`（`MAHJONG_QA_PORT=8769`，独立 `RANK_PROFILE_PATH`），设 `QA_BASE_URL=http://127.0.0.1:8769` 和 `QA_OUTPUT=output/playwright/conan-back/<检查名>`；先运行 `node tools/check_conan_back_wallet.cjs`，再依次运行同前缀 `failures`、`sequence`、`visual`、`animations`、`online`，同步安卓后运行 `native`。旧牌面购买检查 `node tools/check_tile_face_wallet.cjs` 输出到 `face-regression`。`python tools/verify_conan_back_integration.py` 校验安卓副本；`tools/check_conan_back_java.ps1` 只编译检查 Java。停止其他浏览器检查后运行 `python tools/profile_conan_back.py`，依次测不可变旧版、新版默认配色、新版柯南纹理，保留严格20ms门槛失败及长帧变化；`python tools/build_conan_back_evidence.py` 生成本次验收、数据与截图索引。素材技术导出见 `tools/prepare_conan_back_assets.py`，不再生成或改动原人物。当前结果及未验证范围见 [本次验收](docs/柯南蓝金徽章牌背实现与验收-v1.9.15.md)，本次不打包或发布。

v1.9.14：`python tools/run_naruto_regression.py`保存全部Node／Python回归；新增 `tests/test_naruto_theme.cjs`、`tests/test_naruto_theme.py`，检查四图透明度／来源字节、严格配色、固定构图、旧10款配置和牌背优先级。隔离服务使用 `MAHJONG_QA_PORT=8769`、独立 `RANK_PROFILE_PATH` 与 `QA_BASE_URL=http://127.0.0.1:8769`；先运行 `node tools/check_naruto_wallet.cjs`，再运行同前缀 `visual`（经典／`QA_TILE_FACE=cyberpunk-face`各一次）、`scene`、`details`、`opening`、`loading`、`wallet_failure`、`audio`、`audition`。四真人动作检查使用 `python tools/serve_naruto_action_qa.py`（仅本机8791）与 `node tools/check_naruto_online.cjs`。安卓同步后运行 `offline`、`native`、`verify_naruto_integration.py`；正式打包与字节／签名核对使用 `tools/build_android.ps1`、`verify_naruto_apk.py`，专用AVD正式包检查用 `check_naruto_formal.cjs`（仅 `hongzhong_qa`，先备份其受控夹具）。`profile_naruto.py`必须在其他QA／模拟器停止时顺序比较不可变v1.9.13与本版；原20ms门槛失败及桌面青玉长帧+3如实保留。`prepare_naruto_release.py`只生成本地上传目录、ZIP与真实签名APK版本清单；`check_naruto_update.cjs`验证加载结束后的更新提示，不发布或下载。截图／验收索引用 `build_naruto_evidence.py`生成；全部结果与未验证部分见本次验收。

v1.9.13：`python tools/run_one_piece_regression.py` 保存全部 Node／Python 回归；新增 `tests/test_one_piece_theme.cjs`、`tests/test_one_piece_theme.py` 检查完整场景、标题、通用整桌印画模式、配色、原图和音频字节。浏览器使用本机隔离服务，按顺序运行 `check_one_piece_wallet.cjs`，再运行 `check_one_piece_wallet_failure.cjs`、`check_one_piece_loading.cjs`、`check_one_piece_visual.cjs`（分别经典与 `QA_TILE_FACE=cyberpunk-face`）、`check_one_piece_scene.cjs`、`check_one_piece_details.cjs`、`check_one_piece_opening.cjs`、`check_one_piece_audio.cjs`、`check_one_piece_audition.cjs`；四真人成功动作检查使用独立本机 `serve_one_piece_action_qa.py` 与 `check_one_piece_online.cjs`。同步后执行 `check_one_piece_offline.cjs`、`check_one_piece_native.cjs` 和 `verify_one_piece_integration.py`。结束其他QA后运行 `python tools/profile_one_piece.py`保存性能前后对比；本次严格门槛未通过，手机旧主题长帧增加如实保留。`python tools/build_one_piece_evidence.py`从成功检查结果构建验收和截图索引。全部工具保留旧款回归，详细命令、结果与未验证范围见本版验收。

本次额外四人联机行动检查：启动 `python tools/serve_detective_action_qa.py`（默认仅监听127.0.0.1:8791，使用独立段位数据），再运行 `node tools/check_detective_online.cjs`。该服务只供本地合法112牌夹具复验，不应部署线上，也未修改生产 `app.py`。46项实际服务器／声音检查另列于本次验收。

v1.9.12：`python tools/run_detective_regression.py` 跑全部 Node／Python 回归；新增 `tests/test_detective_theme.cjs`、`tests/test_detective_theme.py`。本次浏览器设置 `QA_BASE_URL=http://127.0.0.1:8769`，服务使用 `MAHJONG_QA_PORT=8769` 和独立 `RANK_PROFILE_PATH`；依次运行 `node tools/check_detective_wallet.cjs`、同前缀 `visual`（再设 `QA_TILE_FACE=cyberpunk-face` 检查另一牌面）、`details`、`opening`、`loading`、`wallet_failure`、`audio`、`audition`。同步安卓后运行 `offline`、`native`；`verify_detective_integration.py` 校验所有旧资源、原牌图和安卓副本。`profile_detective.py` 顺序比较改前不可变源码与本版，保留严格门槛失败；结果、截图和未验证范围见本次验收。

v1.9.11：`python tools/run_tile_face_regression.py` 运行全部 Node／Python 回归；新增 `tests/test_tile_appearance.cjs`、`tests/test_tile_face_assets.py` 检查原图哈希、实际栅格导出、方向映射、背色优先级、1 券事务和存储恢复。实际浏览器使用隔离 `tools/serve_theme_qa.py`，设置 `MAHJONG_QA_PORT=8768`、独立 `RANK_PROFILE_PATH`，检查时设 `QA_BASE_URL=http://127.0.0.1:8768`；`QA_OUTPUT=output/playwright/cyberpunk-face/rework-soft-v4/<检查名>`。运行 `node tools/check_tile_face_wallet.cjs` 后，执行同前缀 `rework`、`failures`、`sheets`、`visual`、`actions` 检查，同步安卓资源后执行 `offline`；原 `check_startup_v195.cjs`、`check_wardrobe_v195.cjs` 和 `check_lobby_flows_v190.cjs` 保留原断言。`python tools/export_cyberpunk_face.py` 仅缩放／无损导出已生成的 v3 母稿；`python tools/verify_tile_face_integration.py` 校验受保护源码、旧素材、字体与安卓逐字节同步。整体证据脚本及全回归输出设 `QA_OUTPUT=output/playwright/cyberpunk-face/rework-soft-v4`，再运行 `python tools/build_tile_face_evidence.py`。当前队列动态枚举 **93 个任务、24 个唯一主题 WAV**；不打包或发布。命令、全部结果见本次验收。

v1.9.9 当前检查：`python tools/run_fox_regression.py` 保存全部 Node／Python 回归（133／102 项）；新增 `tests/test_fox_theme.py` 检查原图哈希、透明素材、许可原料及运行 WAV。先启动隔离的 `tools/serve_theme_qa.py`，运行 `check_fox_wallet.cjs`，再运行同前缀的 `wallet_failure`、`visual`、`loading`、`opening`、`audio`、`audition`、`details` 检查；同步后运行 `check_fox_offline.cjs`。命令为 `node tools/<文件>`，本次 `QA_BASE_URL=http://127.0.0.1:8767`，新服务端口设 `MAHJONG_QA_PORT=8767`，段位文件单独设 `RANK_PROFILE_PATH`。`check_table_cues.cjs --themes=fox-spirit --matrix-only` 检查九尺寸动作提示与红框；`python tools/verify_fox_integration.py` 审核受保护源码、旧素材、字体和安卓副本，`profile_table.cjs --diagnostics` 保留真实长帧结果。当前启动队列动态枚举 **92 个任务、24 个唯一主题 WAV**，预览和缓存断言按目录计算；下方旧版本数字仅为其历史记录。命令、全部结果与未验证范围见 [v1.9.9 验收](docs/狐妖小红娘花缘雅集实现与验收-v1.9.9.md)。

v1.9.8 当前检查：`python tools/run_rewards_regression.py` 保存全部 Node／Python 回归日志；也可分别运行 `node --test tests/test_*.cjs` 和 `python -m unittest discover -s tests -v`。新增 `tests/test_rewards_v198.cjs`、`tests/test_rewards.py`，覆盖旧钱包差额、全球限兑并发与重试、持久台账冲突、新人一次奖励、双真人整场和新版清单校验。浏览器先启动 `python tools/serve_rewards_qa.py`（8766，仅本机，独立钱包与临时兑换码），再运行 `node tools/check_rewards_v198.cjs`、`node tools/check_rewards_offline_v198.cjs`；旧钱包流程与启动检查分别运行 `check_lobby_flows_v190.cjs`、`check_startup_v195.cjs`，环境变量 `QA_BASE_URL=http://127.0.0.1:8766`、`QA_OUTPUT=output/playwright/rewards-v198/<检查名>`。安卓诊断包检查 `check_rewards_native_v198.cjs` 仅操作专用 `emulator-5554`，会清理该模拟器的测试数据，不用于玩家设备；`check_rewards_formal_v198.cjs` 在这个模拟器覆盖安装正式包并断网续局。正式 APK 文件验证运行 `python tools/verify_rewards_apk.py`；性能用 `profile_table.cjs --diagnostics` 对比，已知 4× CPU 长帧仍如实记录。

v1.9.7 相关检查：`node --test tests/test_*.cjs`、`python -m unittest discover -s tests -v`；新增图片／原料／音频二进制规范检查 `tests/test_cyberpunk_theme.py`。真实浏览器先运行 `python tools/serve_theme_qa.py`，再执行 `tools/check_cyberpunk_wallet.cjs`（先跑，后续复用其正常购买结果）、`check_cyberpunk_wallet_failure.cjs`、`check_cyberpunk_visual.cjs`、`check_cyberpunk_loading.cjs`、`check_cyberpunk_opening.cjs`、`check_cyberpunk_audio.cjs`、`check_cyberpunk_audition.cjs`。同步安卓资源后运行 `check_cyberpunk_offline.cjs`、`verify_cyberpunk_release.cjs`。命令均为 `node tools/<文件>`；测量与素材重制命令见本次验收。启动队列自动枚举 **83 个任务、20 个唯一主题 WAV**，无需修改生产计数。

v1.9.6 新增 `node --test tests/test_table_cues.cjs tests/test_discard_outline.cjs`，验证操作条夹紧、可见轮廓、侧面与遮挡。浏览器运行 `node tools/check_table_cues.cjs`，当前默认覆盖九尺寸并枚举完整桌布目录；`--closeups-only` 保存四座、1280×720／640×360、青玉／玉桂狗的 `deviceScaleFactor:3` 近景，`--themes=cyberpunk` 指定新桌布。先用 `python tools/serve_theme_qa.py` 启动本机 8765 隔离服务，可通过 `QA_BASE_URL` 和 `QA_OUTPUT` 指定服务及输出目录。性能单独运行 `node tools/profile_table.cjs --diagnostics`，长帧门槛及改前／改后结果见验收文档。全部 Node 单测可运行 `node --test tests/test_*.cjs`；既有主题和声音浏览器检查保留，当前启动队列校验目录中全部唯一主题音频，声音检查将询问提示与成功行动分开计数。

v1.9.5 新增 `node --test tests/test_game_assets.cjs tests/test_theme_asset_loader.cjs`，检查启动队列、真实进度、并发上限、失败重试和牌面回退。页面验证运行 `node tools/check_startup_v195.cjs` 与 `node tools/check_wardrobe_v195.cjs`；它们默认使用本机 8786 隔离服务，可用 `MAHJONG_QA_PORT=8786` 启动 `tools/serve_theme_qa.py`。检查结果、基线和真实截图保存在 `output/playwright/wardrobe-v195/`。既有装扮钱包检查读取当前版本；必需印花／底纹失败断言保留，缩略图失败单独验证为不阻塞运行桌布。

v1.9.4 新增 `tests/test_lobby_entry.cjs`、`tests/test_mobile_camera.cjs`；手机页面检查用 `tools/check_mobile_landscape.cjs`。安卓调试版通过 `tools/check_mobile_native.cjs` 检查全屏、刘海和真实出牌，`tools/check_mobile_native_entry.cjs` 用隔离本机代理验证模式切换、旧联机页面及失败后重试；不向线上发送请求。正式 APK 的资源一致性检查见 `tools/verify_mobile_apk.py`，本次结果及实际截图见 [手机横屏验收](docs/手机横屏与入场修复验收-v1.9.4.md)。

统一段位新增 `node --test tests/test_shared_rank.cjs` 与 `python -m unittest discover -s tests -p test_shared_rank.py -v`。真实联机／离线同步检查先启动 `python tools/serve_rank_qa.py`，再运行 `node tools/check_unified_rank.cjs`；此服务仅监听本机并使用隔离段位数据，末局合法赢牌夹具不进入生产服务。原有浏览器检查仍通过 `tools/qa_lobby.cjs` 进入牌桌，登峰夹具改为推进统一段位，领取／解锁断言保持。

```bash
python -m unittest discover -s tests -v
node --check static/script.js
node --test tests/test_nickname.cjs tests/test_offline.cjs tests/test_offline_progression.cjs tests/test_offline_rank_mode.cjs
node --test tests/test_table_themes.cjs tests/test_table_world.cjs tests/test_table_material.cjs
node --test tests/test_action_sound.cjs
node --test tests/test_wallet.cjs tests/test_rank_badge.cjs tests/test_standing_wall.cjs
```

测试覆盖牌型判断、独立癞子枚举交叉验证、发牌数量、计分守恒、碰杠与抢杠、并发和过期操作、断线座位、段位持久化以及任务重复领奖。离线引擎另有 3,000 组牌型与 Python 规则比对、出牌和计分迁移比对、存档恢复、自摸按钮事件以及 100 局完整对局守恒检查。离线段位测试覆盖与在线计算比对、两种难度奖励差异、领取幂等、自然月归档、跨月结算、本地午夜刷新及不同时区。Python 比对测试需要 Node.js。

牌桌测试覆盖正方形投影四角和逆投影、四家各 0～30 张牌河只在规定厚度带叠压、牌面完整可见与跨座位不重叠、0～4 组杠与 14 张牌背的条带容量，以及最终投影至少 4px 的牌区间距。真实浏览器测量：先运行 `python tools/serve_theme_qa.py`，再运行 `node tools/measure_table.cjs --size 1280x720`；其余规定尺寸和完整复验步骤见交付说明。它使用隔离存档，不连接线上服务。

v1.7 的严格验收仍有未达标项：指定奶蛙牌背主色 ΔL=.0266；叠压整段露出量因额外行缝超出 .30tk；4× CPU 存在长帧。详见交付说明与原始报告，不能按全绿通过发布。

弹弹乐园新增检查见 `tools/check_eggy_wallet.cjs`、`check_eggy_wallet_failure.cjs`、`check_eggy_visual.cjs`、`check_eggy_preview.cjs`、`check_eggy_opening.cjs`、`check_eggy_audio.cjs`、`check_eggy_audition.cjs` 和 `measure_eggy_theme.cjs`；生产钱包的领取／解锁检查不使用已拥有夹具。`tools/verify_eggy_apk.py` 核对正式安装包的全部运行文件和启动器前景。

大厅验收使用已有 Playwright CLI／Edge，先启动 `python tools/serve_theme_qa.py`，再运行 `node tools/check_lobby_v190.cjs`、`node tools/check_lobby_flows_v190.cjs` 和 `node tools/check_standing_v190.cjs`。旧浏览器检查统一通过 `tools/qa_lobby.cjs` 进入牌桌；主题外观回归可设置 `QA_OWNED_COSMETICS=1` 使用明确标记的已拥有测试钱包，实际礼券验收不使用该夹具。字体更新运行 `python tools/build_display_font.py`；新增主题名忘记更新 WOFF 会触发字符覆盖测试。完整命令和结果见本版验收。

## 文件结构

- `app.py`：房间与 Socket.IO 事件、回合驱动、断线恢复、结算及身份存储。
- `game/core.py`：发牌、摸打、碰杠、计分和流局退杠。
- `game/rules.py`：带缓存的胡牌、七对与听牌判断。
- `static/`：大厅、牌桌、28 张 SVG 牌面、5 个原创头像及本地 Socket.IO 客户端。
- `static/offline/`：本机规则引擎、房间驱动、Worker、人机和存档适配。
- `android/`：默认进入离线主界面、内置资源与联网 WebView、原生共享钱包，锁定横屏，支持返回键和加载失败兜底页。
- `tests/test_game.py`：后端回归测试。
- `static/tile.js`、`static/table-world-layout.js`、`static/table-view.js`、`static/table-motion.js`：共享牌体、唯一世界坐标布局、相机与出牌动画。
- `static/lobby.js`、`static/lobby-sheets.js`、`static/lobby.css`：主界面、卷轴弹层与焦点管理；`wallet.js`、`cosmetics.js`、`rank-badge.js`：本机礼券、扩展目录与段位徽章；`standing-wall.js`：对手立体立牌。
- `game/rewards.py`、`static/reward-ui.js`：持久化全局一次兑换与本机回执；`static/app-update.js`、`update-core.js`、`service-client.js`、`app-config.js`：更新清单、原生后台请求与浮窗；`releases/`：版本清单及公开兑换码哈希目录，明文码仅保存在管理员本地。
- `tools/generate_tile_assets.py`：v3 原创平涂牌面生成器，需要 `fontTools`，默认使用 `tools/fonts/` 的 OFL 字体；支持 `--font-num`、`--font-wan`、`--font-zhong`，缺字或缺授权直接报错。
- `tools/measure_tile_art.cjs`：真实 canvas 覆盖率／外接框、60px／24px 与用户参考对照；`tools/profile_table.cjs`：4× CPU 逐帧检查。
- `tools/font_specimen.py`：生成字体样张、60px／24px 总览和五种牌体姿态；PNG 使用 Playwright CLI 与 Edge 截取实际 SVG／DOM。
- `tools/sync_android_assets.py`、`tools/verify_v17_assets.py`：同步与逐字节核对安卓运行资源，不构建 APK。
- `tools/build_android.ps1`：同步网页与离线资源、编译、签名并校验 APK。

段位数据默认写入项目目录的 `rank_profiles.json`，可通过 `RANK_PROFILE_PATH` 指向持久化目录。

## Docker / Hugging Face Spaces

使用已有 `Dockerfile`，默认暴露 7860 端口。部署时包含 `app.py`、`game/`、`static/` 和 `requirements.txt`；运行数据需配置持久化目录。容器重建时，未持久化的段位文件不会保留。
