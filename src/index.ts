import fs from 'fs'
import path from 'path'
import { type Context, Schema } from 'koishi'
import { } from 'koishi-plugin-puppeteer'

export const name = 'foretell'
export const using = ['puppeteer'] as const

interface StyleConfig {
  fontFamily: string
  maxFontSize: number
  minFontSize: number
  offsetWidth: number
}
export interface Config {
  style: StyleConfig
}

export const Config = Schema.object({
  style: Schema.object({
    fontFamily: Schema.string().default('"SimHei"')
      .description('字体（参照 CSS 中的 [font-family](https://developer.mozilla.org/zh-CN/docs/Web/CSS/font-family) ）'),
    maxFontSize: Schema.number().min(1).default(80).description('最大字体大小（px）'),
    minFontSize: Schema.number().min(1).default(38).description('最小字体大小（px）'),
    offsetWidth: Schema.number().min(1).default(900)
      .description('单行最大宽度（px），任意一行文本达到此宽度后会缩小字体以尽可能不超出此宽度，直到字体大小等于`minFontSize`'),
  }).description('目前没有用的设置')
})

interface Tell {
  ch: string,
  en: string
}

export function apply(ctx: Context, config: Config) {
  try {
    var data = fs.readFileSync(path.join(__dirname, 'tells.json'), 'utf8');
    var content = JSON.parse(data);
  } catch (err) {
    console.log(`Error reading file from disk: ${err}`);
  }
  try {
    var tells: Tell[] = content.tells
  } catch (e) {
    var tells: Tell[] = [{ en: "error", ch: "文件读取错误" }]
  }
  const fontPath = path.join(__dirname, 'fusion-pixel-12px-monospaced-zh_hans.ttf').split('\\').join('/')
  const bg = fs.readFileSync(path.resolve(__dirname, './small.png'))
  ctx.command('预言机')
    .action(async (_) => {
      
      var id = Math.floor(Math.random() * tells.length)
      const res = await ctx.puppeteer.render(
        html({
          text:tells[id].ch,
          fontFamily: fontPath,
          fontColor: '#000000',
          strokeColor: '#000000',
          maxFontSize: config.style.maxFontSize,
          minFontSize: config.style.minFontSize,
          offsetWidth: config.style.offsetWidth,
          img: bg,
        })
      );
      return res;
    })
}

function html(params: {
  text: string,
  fontFamily: string,
  fontColor: string,
  strokeColor: string,
  maxFontSize: number,
  minFontSize: number,
  offsetWidth: number,
  img: Buffer,
}) {
  return `
  <head>
    <style>
      @font-face {
            font-family: myFont;
            src: url('${params.fontFamily}');
      }
      body {
        width: 1100px;
        height: 78px;
        padding: 52 32;
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
      }
      .shadow_text {
        text-shadow: 2px 0px 0px black;
        font-weight: normal;
        filter: blur(0.5px);
    }
    </style>
  </head>
  <body>
    <div  class="shadow_text">${params.text.replaceAll('\n', '<br/>')}</div>
  </body>
  <script>
    const dom = document.querySelector('body')
    const div = dom.querySelector('div')
    let fontSize = 55
    dom.style.fontSize = fontSize + 'px'
  </script>`
}