import fs from 'fs'
import path from 'path'
import { type Context, Schema, Time } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { } from '@koishijs/cache'

export const name = 'foretell'

export const inject = {
  required: ['cache', 'puppeteer'],
  optional: [],
}

declare module '@koishijs/cache' {
  interface Tables {
    trinkets_base: { time: number, order: Array<number>, current: number }
  }
}

interface StyleConfig {
  fontFamily: string
  maxFontSize: number
  minFontSize: number
  offsetWidth: number
}

interface RandomConfig {
  trinket: number
}
export interface Config {
  style: StyleConfig
  random: RandomConfig
}

export const Config = Schema.object({
  style: Schema.object({
    maxFontSize: Schema.number().min(1).default(50).description('最大字体大小（px）'),
    minFontSize: Schema.number().min(1).default(10).description('最小字体大小（px）'),
    offsetWidth: Schema.number().min(1).default(440)
      .description('单行最大宽度（px），任意一行文本达到此宽度后会缩小字体以尽可能不超出此宽度，直到字体大小等于`minFontSize`'),
  }).description('格式设置'),
  random: Schema.object({
    trinket: Schema.number().min(0).max(100).default(20).description('抽取到饰品的概率，0-100')
  }).description('随机设置')
})

interface Tell {
  ch: string,
  en: string
}

interface Trinket {
  id: number,
  name: string,
  des: string
}

function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function padding(num: string, length: number) {
  for (var len = num.length; len < length; len = num.length) {
    num = "0" + num;
  }
  return num;
}

export function apply(ctx: Context, config: Config) {

  try {
    let data = fs.readFileSync(path.join(__dirname, 'tells.json'), 'utf8');
    let content = JSON.parse(data);
    try {
      var tells: Tell[] = content.tells
    } catch (e) {
      var tells: Tell[] = [{ en: "error", ch: "文件中存在错误" }]
    }
  } catch (err) {
    console.log(`Error reading file from disk: ${err}`);
  }

  try {
    let data = fs.readFileSync(path.join(__dirname, 'trinkets.json'), 'utf8');
    let content = JSON.parse(data);
    try {
      var trinkets: Trinket[] = content.trinkets
    } catch (e) {
      var trinkets: Trinket[] = [{ id: 0, name: "error", des: "文件中存在错误" }]
    }
  } catch (err) {
    console.log(`Error reading file from disk: ${err}`);
  }

  const fontPath = path.join(__dirname, 'fusion-pixel-12px-monospaced-zh_hans.ttf').split('\\').join('/')
  const tellBg = fs.readFileSync(path.resolve(__dirname, './short.jpg'))
  ctx.command('预言机')
    .action(async ({ session }) => {
      while (1) {
        let random = Math.floor(Math.random() * 100)
        if (random < config.random.trinket) {
          let guildId = session.guildId
          if (!guildId) {
            guildId = session.userId
          }
          let base = await ctx.cache.get('trinkets_base', guildId)
          if (!base) {
            // 生成打乱的顺序
            // Generate shuffled order
            const order = Array.from({ length: trinkets.length }, (_, i) => i);
            for (let i = order.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [order[i], order[j]] = [order[j], order[i]];
            }
            base = { time: Date.now(), order, current: 0 };
            ctx.cache.set('trinkets_base', guildId, base, 2 * Time.day)
          }
          if (!isSameDay(base.time, Date.now())) {
            base.time = Date.now()
            for (let i = base.order.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [base.order[i], base.order[j]] = [base.order[j], base.order[i]];
            }
            base.current = 0
            ctx.cache.set('trinkets_base', guildId, base, 2 * Time.day)
          }
          base.current = base.current + 1
          if (base.current > trinkets.length) {
            continue
          }
          const trinket = trinkets[base.order[base.current - 1]]
          ctx.cache.set('trinkets_base', guildId, base, 2 * Time.day)
          return await ctx.puppeteer.render(
            trinketsRender({
              fontFamily: fontPath,
              img: fs.readFileSync(path.resolve(__dirname, `./trinkets/trinket_${padding(String(trinket.id), 3)}.png`)),
              name: trinket.name,
              des: trinket.des
            })
          )
        } else {
          return await ctx.puppeteer.render(
            tellRender({
              text: tells[Math.floor(Math.random() * tells.length)].ch,
              fontFamily: fontPath,
              maxFontSize: config.style.maxFontSize,
              minFontSize: config.style.minFontSize,
              offsetWidth: config.style.offsetWidth,
              img: tellBg,
              width: 500,
              height: 185,
            })
          )
        }
      }

    })
}

function tellRender(params: {
  text: string,
  fontFamily: string,
  maxFontSize: number,
  minFontSize: number,
  offsetWidth: number,
  img: Buffer,
  width: number,
  height: number,
}) {
  return `
  <head>
    <style>
      @font-face {
            font-family: myFont;
            src: url('${params.fontFamily}');
      }
      body {
        width: ${params.width}px;
        height: ${params.height}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin: 0;
        font-weight: 900;
        font-family: "myFont";
        color: '#000000';
        background-image: url(data:image/png;base64,${params.img.toString('base64')});
        background-repeat: no-repeat;
        background-size: ${params.width}px ${params.height}px;
      }
      .shadow_text {
        line-height: ${params.height}px;
        text-shadow: 2px 0px 0px black;
        font-weight: normal;
        filter: blur(0.5px);
    }
    </style>
  </head>
  <body>
    <div  class="shadow_text">${params.text.replaceAll('\n', '<BR>')}</div>
  </body>
  <script>
    const dom = document.querySelector('body')
    const div = dom.querySelector('div')
    let fontSize = ${params.maxFontSize}
    dom.style.fontSize = fontSize + 'px'
    while (div.offsetWidth >= ${params.offsetWidth} && fontSize > ${params.minFontSize}) {
      dom.style.fontSize = --fontSize + 'px'
    }
  </script>`
}

function trinketsRender(params: {
  fontFamily: string,
  img: Buffer,
  name: string,
  des: string
}) {
  let des = params.des
  const regex = /\{\{.*?\}\}/g;
  des = des.replace(regex, '');
  des = des.replace(/#/g, '<BR>· ')
  des = "· " + des
  return `
  <head>
  <style>
        @font-face {
            font-family: myFont;
            src: url('${params.fontFamily}');
        }

        body {
            width: 160px;
            display: inline-flex;
            flex-direction: column;
            margin: 0;
            font-weight: normal;
            font-family: "myFont";
            font-size: 12px;
            background-color: #333333;
            color: #ffffff;
        }

        .top {
          display: flex;
          flex-direction: row;
          line-height: 64px;
          align-items: left;
        }

        .right {
          padding-left: 5px;
        }

        .down {
          font-size: 8px;
          line-height:10px;
          padding-top: 5px;
          padding-left: 5px;
          padding-bottom: 10px;
        }

        img {
          width: 64px;
          height: 64px;
          margin-right: 2px;
          border-style:solid;
          border-width:2px;
          border-color:black;
        }
    </style>
  </head>
  <body>
  <div class="top"><img src="data:image/png;base64,${params.img.toString('base64')}" />
    <div class="right">${params.name}</div>
  </div>
  <div class="down">${des}</div>
  </body>
  <script>
  </script>`
}