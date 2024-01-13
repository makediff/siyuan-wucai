interface ExportInitResponse {
    lastCursor2: string
    taskStatus: string
    exportConfig: WuCaiExportConfig
}
interface ExportDownloadResponse {
    notes: Array<NoteEntry>
    lastCursor2: string
}
interface WuCaiPageContext {
    title: string
    url: string // 原链接
    wucaiurl: string // 五彩后台链接
    readurl: string //全文剪藏链接
    tags: string // 包含前缀的标签，如 #read#
    alltags: string // 合并页面标签和笔记标签的tag列表
    pagenote: string
    notetype: string // 笔记类型, page, dailynote
    isstar: boolean
    ispagemirror: boolean //是否剪藏
    isdailynote: boolean
    createat: string
    updateat: string
    noteid: string
    createat_ts: number // 时间戳
    updateat_ts: number // 时间戳
    citekey: string
    author: string
    publishat: string
    publishat_ts: number
    domain: string
    domain2: string
    highlightcount: number // 划线数量
    mdcontent: string // 剪藏的markdown
    highlights: Array<HighlightInfo>
}
interface HighlightInfoAPI {
    note: string // 文字划线
    imageUrl: string // 图片划线
    updateat: number
    createat: number
    highlighttype: number
    annonation: string // 划线的想法(单词拼写错误)
    color: string // 颜色
    slotid: number // 颜色id
    refid: string // 划线id
    refurl: string // 划线跳转链接
    url: string // 跳转原文url
}
// https://www.yuque.com/makediff/wucai/snoza8gdix68yfdn#dZ2Jr
interface HighlightInfo {
    note: string // 文字划线
    imageurl: string // 图片划线
    updateat_ts: number
    createat_ts: number
    type: string // 划线类型
    annotation: string // 划线想法
    color: string // 颜色
    slotid: number // 颜色id
    refid: string // 划线id
    refurl: string // 划线跳转链接
}
interface NoteEntry {
    title: string
    url: string
    wucaiurl: string
    readurl: string
    sou: string
    noteIdX: string
    noteType: number
    createAt: number
    updateAt: number
    pageNote: string
    pageScore: number
    citekey: string
    author: string
    publishat: number
    tags: Array<string>
    notetags: string
    highlights: Array<HighlightInfoAPI>
}
interface ExportInitResponse {
    lastCursor2: string
    exportConfig: WuCaiExportConfig
}
interface ExportDownloadResponse {
    notes: Array<NoteEntry>
    lastCursor2: string
}
interface WuCaiExportConfig {
    sytitlet: string
    sytpl: string
    sywrites: number
    syquery: string
}
interface WuCaiPluginSettings {
    clientId: string
    token: string
    notename: string
    notebook: string // notebook id
    lastCursor2: string
    exportConfig: WuCaiExportConfig
    lastSyncFailed: bool
}
interface FilterPrettyOptions {
    prefix: string // 每行的前导符
    trim: boolean // 是否对行进行trim
    color: string // 是否在第一行加一个颜色
}
interface FilterStyle1Options {
    prefix: string // 每行的前导符
    trim: boolean // 是否对行进行trim
    anno: string // 想法前导符
    colortags: Array<string> // 颜色优先级1
    color: string // 是否在第一行加一个颜色，优先级2，颜色块的名字
    colorline: boolean // 是否对整行加颜色，优先级3
    refid: boolean // 是否划线块引用
}
interface FilterStyleDailyOptions {
    groupby: string
}