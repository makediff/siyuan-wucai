import { Plugin, showMessage } from "siyuan"
import { logger } from "./logger"
import { WuCaiApi } from "./api"
import { WuCaiUtils } from "./utils"
import { WuCaiTemplates } from "./templates"
import { BGCONSTS } from "./bgconsts"

const API_URL_INIT = '/apix/openapi/wucai/sync/init'
const API_URL_DOWNLOAD = '/apix/openapi/wucai/sync/download'
const API_URL_ACK = '/apix/openapi/wucai/sync/ack'
const API_URL_DELETE_SERVER_NOTE = '/apix/openapi/wucai/sync/delete'
const API_URL_ARCHIVE_NOTE = '/apix/openapi/wucai/sync/archive'

function localize(msg: string): string {
    return msg
}

class WuCaiSync {
    settings: WuCaiPluginSettings
    pageTemplate: WuCaiTemplates // 渲染模板
    isSyncing: boolean
    syPugin: Plugin

    constructor(syPlugin: Plugin) {
        this.syPugin = syPlugin
        this.isSyncing = false
        this.settings = {
            token: '',
            lastCursor2: '',
            notename: 'WuCai',
            notebook: '',
            clientId: '',
        } as WuCaiPluginSettings
        this.pageTemplate = new WuCaiTemplates()
    }

    // return true if success
    checkAccount(): boolean {
        const token = this.settings.token || ''
        const notename = this.settings.notename || ''
        if (!notename) {
            this.notice("WuCai Notebook name is empty")
            this.syPugin.openSetting()
            return false
        }
        if (!token) {
            this.notice("WuCai sync TOKEN is empty")
            this.syPugin.openSetting()
            return false
        }
        return true
    }

    async startSync() {
        if (!this.checkAccount()) {
            return
        }
        const notename = this.settings.notename
        let notebook = this.settings.notebook || ''
        if (!notebook) {
            this.settings.lastCursor2 = ''
            const allNotesRsp = await WuCaiApi.SYListNotebooks() || {}
            let allNotes = allNotesRsp.notebooks || []
            let dstNote = allNotes.find(x => x.name === notename)
            if (!dstNote) {
                dstNote = await WuCaiApi.SYCreateNotebook(notename)
                if (dstNote) {
                    dstNote = dstNote.notebook || {}
                } else {
                    // create note error
                }
            }
            if (dstNote) {
                notebook = dstNote.id
                this.settings.notebook = dstNote.id
                this.saveSettings()
            }
        }
        if (!notebook) {
            this.notice(`Sync failed. Not found notebook ${notename}`)
            return
        }
        logger({ msg: "begin sync, notebook is ", notebook, })
        this.exportInit('startSync init')
    }

    saveSettings(newData = null) {
        if (newData) {
            for (let k of Object.keys(newData)) {
                this.settings[k] = newData[k]
            }
        }
        this.syPugin.saveData(BGCONSTS.WUCAI_SETTINGS_KEY, this.settings)
    }

    async loadSettings() {
        const thiz = this
        await this.syPugin.loadData(BGCONSTS.WUCAI_SETTINGS_KEY)
            .then((data) => {
                logger({ msg: "WuCai, load config", data, })
                thiz.settings = Object.assign(thiz.settings, data || {})
            })
            .catch(err => {
                showMessage(`load WuCai plugin failed, ${err}`)
            })
        if (!this.settings.clientId) {
            this.settings.clientId = WuCaiUtils.getWuCaiClientID()
        }
    }

    notice(msg: string) {
        msg = 'WuCai, ' + (msg || '')
        showMessage(msg)
    }

    getLastCursor(newCursor: string, savedCursor: string): string {
        return newCursor || savedCursor || ''
    }

    // 对接口返回的内容进行检查
    // 如果有错误返回 true, 否则返回 false
    checkResponseBody(rsp: any): boolean {
        if (!rsp) {
            return false
        }
        if (rsp && 1 === rsp.code) {
            return false
        }
        let errCode = rsp.code
        if (10000 === errCode) {
            // 无效的 Token ，需要重新生成
            this.settings.token = ''
        } else if (10100 === errCode || 10101 === errCode) {
            // 同步服务到期了
            this.settings.token = ''
        }
        let err = localize(rsp['message'] || 'call api failed')
        if (errCode) {
            err += ', error:' + errCode
        }
        this.handleSyncError(err)
        return true
    }

    getErrorMessageFromResponse(response: Response) {
        if (response && response.status === 409) {
            return 'Sync in progress initiated by different client'
        }
        if (response && response.status === 417) {
            return 'SiYuan export is locked. Wait for an hour.'
        }
        return response ? response.statusText : "Can't connect to server"
    }

    handleSyncError(msg: string) {
        this.settings.lastSyncFailed = true
        this.saveSettings()
        this.notice(msg)
    }

    handleSyncSuccess(msg: string = 'Synced', lastCursor: string = '') {
        this.settings.lastSyncFailed = false
        this.settings.lastCursor2 = this.getLastCursor(lastCursor, this.settings.lastCursor2)
        this.saveSettings()
        this.notice('WuCai, ' + msg)
    }

    async exportInit(flagx = '') {
        let lastCursor2 = this.settings.lastCursor2
        logger({
            msg: 'begin export init',
            lastCursor2,
            flagx,
        })

        let params = { lastCursor2 }
        let rsp
        try {
            rsp = await WuCaiApi.callWuCaiApi(API_URL_INIT, params, this.settings.token)
        } catch (e) {
            logger({ msg: 'WuCai plugin: fetch failed in exportInit: ', e })
        }
        if (!rsp || !rsp.ok) {
            logger({ msg: 'WuCai plugin: bad response in exportInit: ', rsp })
            this.handleSyncError(this.getErrorMessageFromResponse(rsp))
            this.isSyncing = false
            return
        }

        let data2 = await rsp.json()
        if (this.checkResponseBody(data2)) {
            this.isSyncing = false
            return
        }

        let initRet: ExportInitResponse = data2['data'] || {}
        logger({ msg: 'in exportInit', initRet, lastCursor2, flagx })

        this.settings.exportConfig = initRet.exportConfig

        // 每次都使用最新的配置，重新预编译模板
        const compileErr = this.pageTemplate.precompile(initRet.exportConfig.sytpl, initRet.exportConfig.sytitlet)
        if (compileErr) {
            logger({ msg: "build template error", compileErr, })
            this.notice(compileErr)
            return
        }

        lastCursor2 = this.getLastCursor(initRet.lastCursor2, this.settings.lastCursor2)
        this.settings.lastCursor2 = lastCursor2
        await this.saveSettings()

        if ('SYNCED' === initRet.taskStatus) {
            this.handleSyncSuccess('Synced', lastCursor2)
            let msg = 'Latest WuCai sync already happened on your other device. Data should be up to date'
            this.notice(msg)
            logger({ msg: 'syncing -> false', flagx: flagx + ' init+ck+synced' })
            this.isSyncing = false
        } else if ('EXPIRED' === initRet.taskStatus) {
            this.handleSyncError('sync service expried')
            logger({ msg: 'syncing -> false', flagx: flagx + ' init+ck+expired' })
            this.isSyncing = false
        } else if ('SYNCING' === initRet.taskStatus) {
            this.notice('Syncing WuCai data')
            await this.downloadArchive(lastCursor2, flagx + ' init+ck')
        } else {
            this.handleSyncError('Sync failed,' + initRet.taskStatus)
            logger({ msg: 'syncing -> false', flagx: flagx + ' init+ck+exception' })
            this.isSyncing = false
        }
    }

    async downloadArchive(lastCursor2: string, flagx: string = ''): Promise<void> {
        let response
        const { syquery } = this.settings.exportConfig
        logger({ msg: 'download', flagx, lastCursor2, syquery })
        try {
            response = await WuCaiApi.callWuCaiApi(API_URL_DOWNLOAD, {
                lastCursor2,
                flagx,
                q: syquery || '',
            }, this.settings.token)
        } catch (e) {
            logger({ msg: 'WuCai plugin: fetch failed in downloadArchive: ', e })
        }
        if (!response || !response.ok) {
            logger({ msg: 'WuCai plugin: bad response in downloadArchive: ', response })
            this.handleSyncError(this.getErrorMessageFromResponse(response))
            logger({ msg: 'syncing -> false', flagx: flagx + ' download+exception' })
            this.isSyncing = false
            return
        }

        const data2 = await response.json()
        if (this.checkResponseBody(data2)) {
            logger({ msg: 'syncing -> false', flagx: flagx + ' download+nil' })
            this.isSyncing = false
            return
        }

        const downloadRet: ExportDownloadResponse = data2['data']
        let entries: Array<NoteEntry> = downloadRet.notes || []
        const entriesCount = entries.length
        const isNeedRender = WuCaiTemplates.isNeedRender(this.pageTemplate.titleTemplateStr)
        for (const entry of entries) {
            if (!entry) {
                continue
            }
            try {
                await this.processEntity(entry, isNeedRender)
            } catch (err) {
                //
            }
        }

        lastCursor2 = this.getLastCursor(downloadRet.lastCursor2, lastCursor2)
        this.settings.lastCursor2 = lastCursor2

        // if (BGCONSTS.IS_DEBUG) {
        //     this.settings.lastCursor2 = ''
        //     lastCursor2 = ''
        // }

        await this.saveSettings()

        const isCompleted = entriesCount <= 0
        if (isCompleted) {
            logger({ msg: 'syncing -> false', flagx: flagx + ' download+done' })
            this.isSyncing = false
            await this.acknowledgeSyncCompleted()
            this.handleSyncSuccess('Synced!', lastCursor2)
            this.notice('WuCai sync completed')
        } else {
            this.handleSyncSuccess('syncing', lastCursor2)
            await new Promise((resolve) => setTimeout(resolve, 5000))
            this.downloadArchive(lastCursor2, flagx)
        }
    }

    async acknowledgeSyncCompleted() {
        let rsp
        try {
            let params = { lastCursor2: this.settings.lastCursor2 }
            rsp = await WuCaiApi.callWuCaiApi(API_URL_ACK, params, this.settings.token)
        } catch (e) {
            logger(['WuCai plugin: fetch failed to acknowledged sync: ', e])
        }
        if (rsp && !rsp.ok) {
            logger(['WuCai plugin: bad response in acknowledge sync: ', rsp])
            this.handleSyncError(this.getErrorMessageFromResponse(rsp))
        }
    }

    async renderBlockContent(entry: NoteEntry, isNeedRenderTitle: boolean): Promise<{ [key: string]: string }> {
        let filename: string
        let urldomain: string = WuCaiUtils.getDomainByUrl(entry.url)
        let urldomain2: string = WuCaiUtils.getDomain2ByDomain(urldomain)
        const noteid = entry.noteIdX
        const isdailynote = entry.noteType === 3
        const notetype = isdailynote ? 'dailynote' : 'page'
        const titleTemplate = this.pageTemplate.titleTemplateStr
        if (isNeedRenderTitle) {
            const view = {
                noteid,
                title: WuCaiUtils.normalTitle(entry.title),
                createat_ts: entry.createAt,
                updateat_ts: Math.max(entry.updateAt, entry.createAt),
                domain2: urldomain2 || '',
                domain: urldomain || '',
                notetype,
                isdailynote,
            }
            filename = this.pageTemplate.titleTemplateEngine.render(view)
        } else {
            filename = titleTemplate
        }
        filename = filename.replace(/[\/ \s]+$/, '')

        entry.highlights = entry.highlights || []
        entry.pageScore = entry.pageScore || 0

        const isstar = entry.pageScore > 0
        const isHashTag = true
        const tags = WuCaiUtils.formatTags(entry.tags, isHashTag)
        const alltags = WuCaiUtils.mergeTagsAndTrim(entry.tags, entry.notetags)
        let mdcontent = ''
        let ispagemirror = false
        const pageCtx: WuCaiPageContext = {
            title: WuCaiUtils.formatPageTitle(entry.title),
            url: entry.url,
            wucaiurl: entry.wucaiurl || '',
            readurl: entry.readurl || '',
            tags,
            alltags,
            notetype,
            pagenote: WuCaiUtils.formatPageNote(entry.pageNote, isHashTag),
            isstar,
            ispagemirror,
            isdailynote,
            highlights: WuCaiUtils.formatHighlights(entry.url, entry.highlights),
            highlightcount: entry.highlights.length,
            createat: WuCaiUtils.formatTime(entry.createAt),
            createat_ts: entry.createAt,
            updateat: WuCaiUtils.formatTime(entry.updateAt),
            updateat_ts: entry.updateAt,
            noteid: noteid,
            citekey: entry.citekey || '',
            author: entry.author || '',
            publishat: WuCaiUtils.formatTime(entry.publishat),
            publishat_ts: entry.publishat || 0,
            domain: urldomain,
            domain2: urldomain2,
            mdcontent,
        }
        let contents = WuCaiUtils.renderTemplate(pageCtx, this.pageTemplate)
        // contents = `${contents}\n{: ${BGCONSTS.ATTR_KEY_NOTEID}="${noteid}"}`
        return { contents, filename, }
    }

    async processEntity(entry: NoteEntry, isNeedRender: boolean) {
        const notebook = this.settings.notebook
        const noteid = entry.noteIdX

        const { contents, filename } = await this.renderBlockContent(entry, isNeedRender)
        logger({ contents, filename })

        let blockId = await WuCaiApi.findWuCaiPageBlockIdByAttr(noteid, notebook)
        logger({ msg: "query block by noteid", noteid, blockId, notebook, })
        if (blockId) {
            // check again !
            let blockAttrs = await WuCaiApi.SYGetBlockAttrs(blockId)
            if (!blockAttrs) {
                blockId = ''
            }
        }
        if (blockId) {
            let upRet = await WuCaiApi.SYUpdateBlock("markdown", contents, blockId)
            logger({ msg: "update block", blockId, noteid, upRet, })
        } else {
            blockId = await WuCaiApi.SYCreateDocWithMarkdown(notebook, filename, contents)
            logger({ msg: "create new block", blockId, noteid, })
            if (blockId) {
                await WuCaiApi.setWuCaiPageAttr(blockId, noteid)
                if (BGCONSTS.IS_DEBUG) {
                    let tmpAttrs = await WuCaiApi.SYGetBlockAttrs(blockId)
                    logger({ msg: "new block attrs", blockId, noteid, tmpAttrs, })
                }
            }
        }
    }

    async exitSync() {
        // 
    }
}

export { WuCaiSync }