import { fetchSyncPost, IWebSocketData, } from "siyuan"
import { BGCONSTS } from "./bgconsts"
import { WuCaiUtils } from "./utils"
import { logger } from "./logger"

class WuCaiApi {

    static async callSiYuanAPI(url: string, data: any) {
        const rsp: IWebSocketData = await fetchSyncPost(url, data)
        if (rsp && 0 === rsp.code) {
            return rsp.data
        }
        return null
    }

    static callWuCaiApi(url: string, data: any, token: string) {
        const rt = Math.floor(+new Date() / 1000)
        data['v'] = BGCONSTS.VERSION_NUM
        data['serviceId'] = BGCONSTS.SERVICE_ID
        url += `?appid=${BGCONSTS.APPID}&ep=${BGCONSTS.ENDPOINT}&version=${BGCONSTS.VERSION}&reqtime=${rt}`
        const headers = WuCaiUtils.getAuthHeaders(token)
        return fetch(BGCONSTS.BASE_URL + url, {
            headers: { ...headers, 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    static async SYListNotebooks(): Promise<ReslsNotebooks> {
        return this.callSiYuanAPI('/api/notebook/lsNotebooks', '')
    }

    static async SYCreateNotebook(name: string): Promise<Notebook> {
        return this.callSiYuanAPI('/api/notebook/createNotebook', { name })
    }

    static async SYCreateDocWithMarkdown(notebook: NotebookId, path: string, markdown: string): Promise<DocumentId> {
        const url = '/api/filetree/createDocWithMd';
        return this.callSiYuanAPI(url, { notebook, path, markdown, })
    }

    static async SYUpdateBlock(dataType: DataType, data: string, id: BlockId): Promise<ResdoOperations> {
        const url = '/api/block/updateBlock'
        return this.callSiYuanAPI(url, { dataType, data, id })
    }

    static async SYSetBlockAttrs(id: BlockId, attrs: { [key: string]: string }) {
        const url = '/api/attr/setBlockAttrs'
        return this.callSiYuanAPI(url, { id, attrs })
    }

    static async SYGetBlockAttrs(id: BlockId): Promise<{ [key: string]: string }> {
        const url = '/api/attr/getBlockAttrs'
        return this.callSiYuanAPI(url, { id })
    }

    static async findWuCaiPageBlockIdByAttr(noteidx: string, box: string) {
        return this.SYFindBlockByAttr(box, BGCONSTS.ATTR_KEY_NOTEID, noteidx)
    }

    static async setWuCaiPageAttr(id: string, wucainoteid: string) {
        return this.SYSetBlockAttrs(id, { [BGCONSTS.ATTR_KEY_NOTEID]: wucainoteid })
    }

    static async SYFindBlockByAttr(box: string, name: string, value: string) {
        if (!name || !value || !box) {
            return ''
        }
        // https://www.yuque.com/siyuannote/docs/go7uom?utm_source=ld246.com#20897ec1
        const stmt = `SELECT * FROM attributes WHERE box='${box}' AND name='${name}' AND value='${value}'`
        const ret = await this.execSql(stmt)
        logger({ msg: "find blocks by attr condition", name, value, ret, })
        if (ret && ret.length > 0 && ret[0]) {
            return ret[0]['root_id'] || ''
        }
        return ''
    }

    static async execSql(stmt: string): Promise<any[]> {
        const url = '/api/query/sql'
        return this.callSiYuanAPI(url, { stmt })
    }
}

export { WuCaiApi }