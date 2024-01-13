import { BGCONSTS } from "./bgconsts"
import moment from 'moment'
import { WuCaiTemplates } from "./templates";

class WuCaiUtils {
    static _genClientID() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    static getWuCaiClientID() {
        let tmpId = window.localStorage.getItem(BGCONSTS.CLIENT_ID_KEY) || ''
        if (tmpId && tmpId.length > 0) {
            return tmpId
        }
        window.localStorage.setItem(BGCONSTS.CLIENT_ID_KEY, this._genClientID())
        return tmpId
    }

    static resetWuCaiClientId() {
        let tmpId = this._genClientID()
        window.localStorage.setItem(BGCONSTS.CLIENT_ID_KEY, tmpId)
        return tmpId
    }

    static getAuthHeaders(tk: string) {
        return {
            AUTHORIZATION: `Token ${tk}`,
            'Siyuan-Client': `${this.getWuCaiClientID()}`,
        }
    }

    static getDomainByUrl(s: string): string {
        if (!s) {
            return ''
        }
        if (/^www\./.test(s)) {
            s = 'https://' + s
        }
        try {
            let ux = new URL(s)
            if (!ux) {
                return ''
            }
            return ux.hostname.toLocaleLowerCase()
        } catch (error) {
            return ''
        }
    }

    static getDomain2ByDomain(urlDomain: string): string {
        if (!urlDomain || urlDomain.length <= 0) {
            return ''
        }
        let hostArr = urlDomain.split('.')
        const hostLen = hostArr.length
        if (hostLen <= 2) {
            return urlDomain
        }
        return `${hostArr[hostLen - 2]}.${hostArr[hostLen - 1]}`
    }

    static formatDateTime(date: any, format = 'YYYY-MM-DD HH:mm'): string {
        if (!date) {
            return ''
        }
        // http://momentjs.cn/docs/use-it/typescript.html
        // https://momentjs.com/
        return moment(date).format(format)
    }

    // 通过时间（秒）获得一个默认的时间格式
    static formatTime(ts: number, fdt: string = 'YYYY-MM-DD HH:mm'): string {
        if (ts <= 0) {
            return ''
        }
        let d1 = new Date(ts * 1000)
        return this.formatDateTime(d1, fdt)
    }

    static repeatStr(s: string, n: number): string {
        if (n <= 0 || !s || s.length <= 0) {
            return ''
        }
        let ret = []
        for (let i = 0; i < n; i++) {
            ret.push(s)
        }
        return ret.join('')
    }

    static isOnlyDateTimeLine(s: string): boolean {
        // 2023-09-08 13:36:12
        return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) && true
    }

    static detectIsMardownFormat(s: string): boolean {
        // 检测是否是 markdown 里的某些格式，比如 todo, list， tag， backlink, 这些需要保留原来的格式
        if (!s || s.length <= 0) {
            return false
        }
        // is a todo item, and not contains new line
        if (/^- \[[ x]\] +/.test(s) && s.indexOf('\n') < 0) {
            return true
        }
        // is a block
        if (/^\`\`\`/.test(s) && /\`\`\`\s*$/.test(s)) {
            return true
        }
        return false
    }

    static trimString(s: string): string {
        if (!s || s.length <= 0) {
            return ''
        }
        return s.replace(/^\s+|\s+$/g, '')
    }

    static getPrefxFromAnnoPrefix(s: string): string {
        if (!s || s.length <= 0) {
            return ''
        }
        // fetch prefix from annoPrefix, if it start with - or >
        let idx = s.indexOf(' ')
        if (idx > 0) {
            return s.substring(0, idx + 1)
        }
        return ''
    }

    static renderTemplate(holders: WuCaiPageContext, wucaiTemplate: WuCaiTemplates): string {
        return wucaiTemplate.pageTemplateEngine.render(holders)
    }

    static formatPageNote(note: string, isHashTag: boolean): string {
        if (isHashTag) {
            return note || ''
        }
        return this.convertHashTagToBackLink(note) || ''
    }

    static highlightTypeMaps: { [key: number]: string } = {
        1: 'highlight',
        2: 'image',
        3: 'math',
        4: 'quote',
    }

    static formatHighlights(entryUrl: string, highlights: Array<HighlightInfoAPI>): Array<HighlightInfo> {
        if (!highlights) {
            return []
        }
        const isHashTag = true
        let ret: Array<HighlightInfo> = []
        for (let old of highlights) {
            if (!old) {
                continue
            }
            const type = old.highlighttype || 1
            let one: HighlightInfo = {
                note: (old.note || old.imageUrl || '').trim(),
                imageurl: old.imageUrl,
                updateat_ts: old.updateat,
                createat_ts: old.createat,
                type: this.highlightTypeMaps[type] || 'highlight',
                annotation: old.annonation || '',
                color: old.color,
                slotid: old.slotid,
                refid: old.refid,
                refurl: old.refurl,
            }
            if (!isHashTag) {
                if (one.annotation) {
                    one.annotation = this.convertHashTagToBackLink(one.annotation)
                }
                if (one.note) {
                    one.note = this.convertHashTagToBackLink(one.note)
                }
            }
            if (entryUrl && one.refurl) {
                one.refurl = WuCaiUtils.getHighlightUrl(entryUrl, one.refurl)
            } else {
                one.refurl = ''
            }
            ret.push(one)
        }
        return ret
    }

    static isWhiteSpaceForTagParser(c: number) {
        if (65292 == c || 12290 == c || 65307 == c || 65311 == c) {
            return true
        }
        return (
            10 == c || 13 == c ||
            (32 <= c && c <= 34) || (36 <= c && c <= 44) ||
            46 == c || (58 <= c && c <= 63) ||
            59 == c || 64 == c || (91 <= c && c <= 94) ||
            (123 <= c && c <= 126) || 65292 == c
        )
    }

    static convertHashTagToBackLink(cnt: string): string {
        cnt = cnt || ''
        if (cnt.length <= 0 || cnt.indexOf('#') < 0) {
            return cnt
        }
        const cntLength = cnt.length
        let left = -1
        const lastL = cntLength - 1
        const tagsPosi = []
        for (let i = 0; i < cntLength; i++) {
            const cCode = cnt.charCodeAt(i)
            const isLast = i == lastL
            const isWhiteS = this.isWhiteSpaceForTagParser(cCode)
            const il = i - left
            if (35 === cCode) {
                if (left > -1 && il > 1) {
                    tagsPosi.push([left, i])
                }
                left = i
            } else if (left > -1 && (isWhiteS || isLast) && il >= 1) {
                if (isLast && !isWhiteS && il >= 1) {
                    tagsPosi.push([left, i + 1])
                } else if (il > 1) {
                    tagsPosi.push([left, i])
                }
                left = -1
            }
        }
        if (tagsPosi.length <= 0) {
            return cnt
        }
        const ret = []
        let offsetStart = 0
        for (const posi of tagsPosi) {
            const s = posi[0]
            const e = posi[1]
            if (s - offsetStart > 0) {
                ret.push(cnt.substring(offsetStart, s))
            }
            ret.push('[[' + cnt.substring(s + 1, e) + ']]')
            offsetStart = e
        }
        if (offsetStart > 0 && offsetStart < cnt.length) {
            ret.push(cnt.substring(offsetStart, cnt.length))
        }
        return ret.join('')
    }

    // for Obsidian frontmatter
    static trimTags(tags: Array<string>): string {
        if (!tags || tags.length <= 0) {
            return ''
        }
        return tags
            .filter((x) => x)
            .map((x) => {
                let tmp = x.replace(/[#\[\]]/g, '')
                if (tmp) {
                    tmp = `#${tmp}#`
                }
                return tmp
            })
            .filter((x) => x).join(' ')
    }

    static formatPageMirror(s: string): string {
        s = s || ''
        if (!s) {
            return ''
        }
        return s.replace(/g1proxy\.nostrabc\.com/g, 'g1proxy.wimg.site')
    }

    static formatTags(tags: Array<string>, isHashTag: boolean): string {
        let ret: Array<string> = []
        tags = tags || []
        tags.forEach((tag) => {
            tag = tag.trim()
            if (!tag || tag.length <= 0) {
                return
            }
            tag = tag.replace(/\s+/g, '-')
            let isHash = tag[0] === '#'
            let isInner = tag[0] === '['
            if (isHash && isHashTag) {
                ret.push(tag)
            } else if (isInner && !isHashTag) {
                ret.push(tag)
            } else {
                let coreTag = ''
                if (isHash) {
                    coreTag = tag.substring(1)
                } else if (isInner) {
                    coreTag = tag.substring(2, tag.length - 2).trim()
                }
                if (coreTag.length > 0) {
                    if (isHashTag) {
                        ret.push('#' + coreTag + '#')
                    } else {
                        ret.push(`[[${coreTag}]]`)
                    }
                }
            }
        })
        return ret.join(' ')
    }

    static mergeTagsAndTrim(t1: Array<string>, t2: string): string {
        t1 = t1 || []
        t2 = t2 || ''
        let t2tag = t1
            .concat(t2.split(','))
            .filter((x) => x)
            .map((x) => {
                return x.replace(/[#\[\]]/g, '').replace(/\s+/g, '-')
            })
        let ret: { [key: string]: number } = {}
        for (let tg of t2tag) {
            if (!t2tag) {
                continue
            }
            if (ret[tg] === undefined) {
                ret[tg] = 1
            }
        }
        return Object.keys(ret).sort().join(' ')
    }

    // 23.6.8 https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html#gotchas
    static formatPageTitle(s: string): string {
        s = s || s
        if (s.length <= 0) {
            return s
        }
        return s.replace(/(:\s+)/g, ':')
    }

    static getHighlightUrl(entryUrl: string, refurl: string): string {
        if (!entryUrl || entryUrl.length <= 0) {
            return ''
        }
        if (!refurl || refurl.length <= 0) {
            return ''
        }
        entryUrl = entryUrl.replace(/#+$/, '')
        let idx = entryUrl.indexOf('#')
        if (idx >= 0) {
            return entryUrl
        }
        return entryUrl + refurl
    }

    static normalTitle(title: string): string {
        title = title || ''
        title = title.replace(/[\s\t\n]+/g, ' ')
        // https://blog.csdn.net/xiejx618/article/details/17471819
        // \ / : * ? " < > |
        title = title.replace(/[\~\\、\/\*"'<>%\$#&;；:?？。，！!\|]/g, '')
        if (title.length <= 0) {
            return 'No title'
        }
        return title
    }

}

export { WuCaiUtils }