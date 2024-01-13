import nunjucks from 'nunjucks'
import { WuCaiUtils } from './utils'
import { BGCONSTS } from './bgconsts'

const strref = typeof 's'

class WuCaiTemplates {
    static leftHolder = '{{'
    static rightHolder = '}}'

    templateEnv: nunjucks.Environment

    pageTemplateStr: string
    pageTemplateEngine: nunjucks.Template

    titleTemplateStr: string
    titleTemplateEngine: nunjucks.Template

    cachedTitleTemplates: { [key: string]: nunjucks.Template }

    static defaultTitleTemplate = '{{ createat_ts | date("YYYY/MM") }}/{{title}}'
    static Style001: string = `## 页面信息
- 笔记类型: {{notetype}} , 星标: {{isstar}}
- 标签: {{mergedtags}}
{% if not isdailynote %}
- 作者: {{author}} , 域名: {{domain}} , 域名2: {{domain2}}
{% endif %} 
- [原文链接]({{url}}) , [五彩链接]({{wucaiurl}})
- {{highlightcount}} 条划线
- 创建时间: {{createat}} , 更新时间: {{updateat}}

{% if pagenote %}
## 页面笔记
{{pagenote}}
{% endif %}

{% if isdailynote  %}
## Daily note
{{ highlights | style_dailynote }}
{% else %}
## 划线列表
{% for item in highlights %}
{{ item | style1({prefix:"- ", anno:"\t- ："}) }}
{% endfor %}
{% endif %}
`
    static isNeedRender(s: string) {
        return (s || '').indexOf(WuCaiTemplates.leftHolder) >= 0
    }

    constructor() {
        this.templateEnv = nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true })
        // add custom function, https://mozilla.github.io/nunjucks/api.html#addfilter
        this.templateEnv.addFilter('date', function (ts: number, fmt: string): string {
            if (ts <= 0) {
                return ''
            }
            let dt = new Date(ts * 1000)
            return WuCaiUtils.formatDateTime(dt, fmt)
        })
        this.templateEnv.addFilter('pretty', function (cnt: string, options: FilterPrettyOptions): string {
            options = options || ({} as FilterPrettyOptions)
            let prefix = options.prefix || ''
            let isTrim = options.trim === undefined ? true : options.trim
            cnt = cnt || ''
            if (cnt.length <= 0) {
                return ''
            }
            let lines = cnt.split(/\n/)
            let ret: Array<string> = []
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i] || ''
                if (isTrim) {
                    line = line.replace(/^\s+|\s+$/g, '')
                }
                if (line.length <= 0) {
                    continue
                }
                ret.push(prefix + line + '\n')
            }
            return ret.join('\n')
        })
        this.templateEnv.addFilter('style_dailynote', function (highlights: Array<HighlightInfo>, options: FilterStyleDailyOptions) {
            options = options || ({} as FilterStyleDailyOptions)
            let ret = []
            let groupby = options.groupby || 'YYYY-MM-DD HH:mm'
            let groupHighlights: { [key: string]: Array<HighlightInfo> } = {}
            let groupNames: Array<string> = []
            let groupNamesMap: { [key: string]: number } = {}
            for (let highlight of highlights) {
                let ts = WuCaiUtils.formatTime(highlight.createat_ts || highlight.updateat_ts || 0, groupby)
                if (groupNamesMap[ts] == undefined) {
                    groupNamesMap[ts] = 1
                    groupNames.push(ts)
                    groupHighlights[ts] = []
                }
                groupHighlights[ts].push(highlight)
            }
            groupNamesMap = undefined // help for gc
            highlights = undefined // help for gc
            for (let gname of groupNames) {
                let rootlevel = 0
                ret.push(`- ${gname}`)
                let level = rootlevel + 1
                let highlightPrefix = WuCaiUtils.repeatStr('\t', level)
                let annoPrefix = WuCaiUtils.repeatStr('\t', level + 1)
                for (let highlight of groupHighlights[gname]) {
                    if (highlight.imageUrl && highlight.imageUrl.length > 0) {
                        ret.push(`${highlightPrefix}- ![](${highlight.imageUrl})`)
                        continue
                    }
                    let notes = (highlight.note || '').split('\n')
                    for (let note of notes) {
                        if (!note || WuCaiUtils.isOnlyDateTimeLine(note)) {
                            continue
                        }
                        let p1 = WuCaiUtils.detectIsMardownFormat(note) ? '' : '- '
                        ret.push(`${highlightPrefix}${p1}${note}`)
                    }
                    if (highlight.annotation) {
                        let notes = (highlight.annotation || '').split('\n')
                        for (let note of notes) {
                            if (!note || WuCaiUtils.isOnlyDateTimeLine(note)) {
                                continue
                            }
                            let p1 = WuCaiUtils.detectIsMardownFormat(note) ? '' : '- '
                            ret.push(`${annoPrefix}${p1}${note}`)
                        }
                    }
                }
            }
            return ret.join('\n')
        }
        )
        this.templateEnv.addFilter('style1', function (item: HighlightInfo, options: FilterStyle1Options) {
            options = options || ({} as FilterStyle1Options)
            let notePrefix = options.prefix || '' // 划线前缀
            let note = item.note || '' // 划线
            let anno = item.annotation || '' // 想法
            let annoPrefix = options.anno || '' // 想法的前缀
            let highlighttype = item.type || 'highlight'
            let color = options.color || ''
            let colorChar = options.colortags || [] // 颜色字符
            let slotId = item.slotid || 1
            let appendHighlightRefid = options.refid && true
            let ret = []
            if ('math' === highlighttype) {
                ret.push(`\n$$\n${note}\n$$\n`)
            } else if ('image' === highlighttype) {
                ret.push(`${notePrefix}![](${note})`)
            } else if (WuCaiUtils.detectIsMardownFormat(note)) {
                ret.push(note)
            } else {
                let lines = note.split(/\n/)
                let lineCount = 0
                for (let line of lines) {
                    line = WuCaiUtils.trimString(line)
                    if (!line) {
                        continue
                    }
                    ret.push(`${notePrefix}` + line)
                    lineCount++
                }
            }
            if (anno) {
                if (WuCaiUtils.detectIsMardownFormat(anno)) {
                    ret.push(anno)
                } else {
                    let newLineAnnoPrefix = WuCaiUtils.getPrefxFromAnnoPrefix(annoPrefix)
                    let arrAnno = anno.split(/\n/)
                    let lineCount = 0
                    for (let line of arrAnno) {
                        line = WuCaiUtils.trimString(line)
                        if (line.length <= 0) {
                            continue
                        }
                        if (annoPrefix) {
                            // 标签自动识别
                            if (/^#/.test(line)) {
                                line = ' ' + line
                            }
                            if (0 == lineCount) {
                                line = annoPrefix + line
                            } else {
                                line = newLineAnnoPrefix + line
                            }
                        }
                        ret.push(line)
                        lineCount++
                    }
                }
            }
            let tmpLen = ret.length
            if (appendHighlightRefid) {
                if (tmpLen > 0) {
                    ret[tmpLen - 1] += ' ^' + item.refid
                }
            }
            if (tmpLen > 0) {
                ret.push('')
            }
            return ret.join('\n')
        })
        this.cachedTitleTemplates = {}
    }

    precompile(tpl: string, titleTpl: string): string {
        let err = ''

        tpl = tpl || WuCaiTemplates.Style001

        this.pageTemplateStr = tpl
        this.pageTemplateEngine = nunjucks.compile(tpl, this.templateEnv)

        this.titleTemplateStr = titleTpl || WuCaiTemplates.defaultTitleTemplate
        this.titleTemplateEngine = nunjucks.compile(this.titleTemplateStr, this.templateEnv)
        return err
    }
}

export { WuCaiTemplates }