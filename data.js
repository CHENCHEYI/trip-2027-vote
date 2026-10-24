/* 2027 員旅投票：方案內容與選項。數字與行程來自三份規劃頁（紐西蘭、北海道、澳洲），改規劃頁時這裡要一起改。 */
window.TRIP = {
  api: 'https://script.google.com/macros/s/AKfycbzh5pjVaQw0v9vKRuOB496dA2XtgIN-AMQ9Tl0KNLIr-jZnvev1M1m58pOzWtV0d1H7/exec',

  destinations: [
    {
      id: 'nz',
      name: '紐西蘭南島',
      short: '峽灣、冰河、星空',
      en: 'NEW ZEALAND · SOUTH ISLAND',
      tagline: '皇后鎮進、基督城出。湖景、峽灣、雪山和南半球星空，春天的公路旅行。',
      facts: [
        { label: '當地住', value: '6', unit: '晚' },
        { label: '時差', value: '+5', unit: '小時' },
        { label: '飛行', value: '11', unit: '小時＋國內線' }
      ],
      route: ['皇后鎮 3 晚', '庫克山 1 晚', '蒂卡波 1 晚', '基督城 1 晚'],
      highlights: [
        '米佛峽灣巴士＋遊船一日團',
        '庫克山胡克谷步道，平緩好走',
        '蒂卡波湖觀星與溫泉',
        '想跳傘的人可以在皇后鎮自費跳'
      ],
      days: [
        { d: '10/21', t: '傍晚搭紐航直飛奧克蘭（夜航）' },
        { d: '10/22', t: '轉國內線到皇后鎮，傍晚 Skyline 纜車看湖' },
        { d: '10/23', t: 'Glenorchy 湖景公路、箭鎮老街' },
        { d: '10/24', t: '米佛峽灣一日團' },
        { d: '10/25', t: '瓦納卡湖邊那棵樹 → 庫克山村' },
        { d: '10/26', t: '胡克谷步道 → 蒂卡波湖、觀星' },
        { d: '10/27', t: '回到基督城，歡送晚餐' },
        { d: '10/28', t: '清晨國內線到奧克蘭，直飛回台北，傍晚到' }
      ],
      headsUp: '10 月米佛公路有雪崩管制，可能臨時封路；10/25 是紐西蘭國定假日，部分餐廳加收約 15%。春天白天約 14–17°C，清晨 3–6°C。',
      interests: [
        { id: 'skyline', label: 'Skyline 纜車＋斜坡車' },
        { id: 'glenorchy', label: 'Glenorchy 湖景公路' },
        { id: 'arrowtown', label: '箭鎮老街' },
        { id: 'milford', label: '米佛峽灣遊船' },
        { id: 'skydive', label: '皇后鎮跳傘', note: '自費' },
        { id: 'wanaka', label: '瓦納卡湖邊那棵樹' },
        { id: 'hooker', label: '胡克谷步道' },
        { id: 'stargazing', label: '蒂卡波觀星' },
        { id: 'tekapo-springs', label: 'Tekapo 溫泉' },
        { id: 'winery', label: '酒莊品酒', note: '自費' }
      ]
    },
    {
      id: 'hk',
      name: '北海道',
      short: '紅葉、溫泉、海鮮',
      en: 'HOKKAIDO · 道央＋道南',
      tagline: '函館進、新千歲出。秋天的紅葉、兩晚溫泉旅館、函館夜景和札幌市區。',
      facts: [
        { label: '當地住', value: '7', unit: '晚' },
        { label: '時差', value: '+1', unit: '小時' },
        { label: '飛行', value: '4', unit: '小時' }
      ],
      route: ['函館 2 晚', '洞爺湖 1 晚', '登別 1 晚', '札幌 3 晚'],
      highlights: [
        '大沼公園、函館的紅葉正好在 10 月底',
        '洞爺湖、登別住溫泉旅館，含會席晚餐',
        '函館山夜景、函館朝市海鮮',
        '最後三晚住札幌，小樽、余市一日遊'
      ],
      days: [
        { d: '10/21', t: '早班機飛函館，下午五稜郭、元町坡道，歡迎晚餐後上函館山看夜景' },
        { d: '10/22', t: '函館朝市、金森紅磚倉庫、香雪園紅葉' },
        { d: '10/23', t: '大沼公園遊船 → 洞爺湖溫泉旅館' },
        { d: '10/24', t: '有珠山纜車、昭和新山 → 登別地獄谷，住溫泉旅館' },
        { d: '10/25', t: '登別 → 支笏湖 → 札幌，全團吃成吉思汗烤羊肉' },
        { d: '10/26', t: '小樽運河、余市威士忌蒸餾所' },
        { d: '10/27', t: '札幌市區自由、北大銀杏大道，歡送晚餐' },
        { d: '10/28', t: '下午從新千歲搭長榮回台北，晚上到' }
      ],
      headsUp: '函館山纜車每年秋天停駛點檢，很可能遇到，夜景改搭車上山。10 月下旬白天約 14–15°C、清晨約 5–6°C，下午 4 點 40 分就天黑。紅葉每年早晚約差一週。',
      interests: [
        { id: 'hakodate-night', label: '函館山夜景' },
        { id: 'morning-market', label: '函館朝市海鮮' },
        { id: 'goryokaku', label: '五稜郭' },
        { id: 'onuma', label: '大沼公園紅葉' },
        { id: 'ryokan', label: '溫泉旅館會席料理' },
        { id: 'usu', label: '有珠山纜車' },
        { id: 'jigokudani', label: '登別地獄谷' },
        { id: 'otaru', label: '小樽運河' },
        { id: 'whisky', label: '余市威士忌蒸餾所' },
        { id: 'ginkgo', label: '北大銀杏大道' },
        { id: 'shopping', label: '札幌逛街' }
      ]
    },
    {
      id: 'au',
      name: '澳洲墨爾本',
      short: '大洋路、企鵝、酒莊',
      en: 'AUSTRALIA · MELBOURNE',
      tagline: '墨爾本進出。大洋路十二門徒岩、菲利普島看企鵝回家、亞拉河谷酒莊。',
      facts: [
        { label: '當地住', value: '5', unit: '晚' },
        { label: '時差', value: '+3', unit: '小時' },
        { label: '飛行', value: '9', unit: '小時，夜班' }
      ],
      route: ['亞拉河谷 1 晚', '菲利普島 1 晚', '大洋路 2 晚', '墨爾本 1 晚'],
      highlights: [
        '傍晚在菲利普島看小企鵝上岸回家',
        '大洋路十二門徒岩看夕陽',
        '亞拉河谷酒莊、Healesville 動物園看無尾熊',
        '去回都是夜班機，白天都在當地玩'
      ],
      days: [
        { d: '10/21', t: '晚上搭華航直飛墨爾本（夜航）' },
        { d: '10/22', t: '中午到墨爾本 → 亞拉河谷動物園、酒莊，歡迎晚餐' },
        { d: '10/23', t: 'Puffing Billy 蒸汽火車 → 菲利普島，傍晚看企鵝歸巢' },
        { d: '10/24', t: '半島溫泉 → 搭渡輪過海灣 → 大洋路 Lorne' },
        { d: '10/25', t: '大洋路西行，十二門徒岩看夕陽' },
        { d: '10/26', t: '回墨爾本市區，維多利亞女王市場、咖啡巷弄' },
        { d: '10/27', t: '市區自由、Brighton 彩色小屋，晚上搭機' },
        { d: '10/28', t: '清晨回到台北' }
      ],
      headsUp: '10/23–24 墨爾本有橄欖球世界盃賽事，這兩晚刻意住市區以外。10 月白天約 20°C、清晨約 10°C，一天之內變化大，約三分之一的日子會下雨。',
      interests: [
        { id: 'penguins', label: '菲利普島企鵝歸巢' },
        { id: 'twelve-apostles', label: '十二門徒岩' },
        { id: 'yarra-winery', label: '亞拉河谷酒莊', note: '自費' },
        { id: 'healesville', label: '無尾熊、袋鼠動物園' },
        { id: 'puffing-billy', label: 'Puffing Billy 蒸汽火車' },
        { id: 'hot-springs', label: '半島溫泉' },
        { id: 'balloon', label: '熱氣球', note: '自費' },
        { id: 'helicopter', label: '十二門徒直升機', note: '自費' },
        { id: 'laneways', label: '墨爾本咖啡巷弄' },
        { id: 'market', label: '維多利亞女王市場' }
      ]
    }
  ],

  companions: [
    { id: 0, label: '不帶' },
    { id: 1, label: '1 位' },
    { id: 2, label: '2 位' },
    { id: 3, label: '3 位以上' }
  ],
  priorities: [
    { id: 'budget', label: '預算別太高' },
    { id: 'short-flight', label: '飛行時間短' },
    { id: 'relaxed', label: '輕鬆不趕' },
    { id: 'food', label: '吃得好' },
    { id: 'scenery', label: '自然風景' },
    { id: 'adventure', label: '刺激活動' },
    { id: 'onsen', label: '泡湯放鬆' },
    { id: 'shopping', label: '購物' },
    { id: 'photo', label: '拍照打卡' },
    { id: 'weather', label: '天氣舒服' }
  ],
  budgets: [
    { id: 'b1', label: '1.5 萬以內' },
    { id: 'b2', label: '1.5–3 萬' },
    { id: 'b3', label: '3–4.5 萬' },
    { id: 'b4', label: '4.5 萬以上' }
  ]
};
