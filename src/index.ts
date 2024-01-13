import { Plugin, showMessage, Dialog, Menu, openTab, Setting } from "siyuan"
import { logger } from "./logger"
import { BGCONSTS } from "./bgconsts"
import { WuCaiSync } from "./sync"
import { WuCaiUtils } from "./utils"

export default class WuCaiPlugin extends Plugin {
    wcSyncer: WuCaiSync
    constructor(options: any) {
        super(options)
        this.wcSyncer = new WuCaiSync(this)
    }

    async onload() {
        const thiz = this
        this.addTopBar({
            icon: 'iconFace',
            title: 'Start WuCai sync',
            position: "left",
            callback: async () => {
                this.startSync()
            }
        })

        this.setting = new Setting({
            confirmCallback: () => {
                const data = {
                    "token": (tokenTextarea.value || '').trim(),
                    "notename": (notebookTextarea.value || '').trim(),
                }
                thiz.wcSyncer.saveSettings(data)
                showMessage('Save success')
            },
        })
        await this.wcSyncer.loadSettings()

        const notebookTextarea = document.createElement("textarea");
        this.setting.addItem({
            title: "Notebook Name",
            createActionElement: () => {
                notebookTextarea.className = "b3-text-field fn__block";
                notebookTextarea.placeholder = "Your notebook name";
                notebookTextarea.value = thiz.wcSyncer.settings.notename
                return notebookTextarea
            },
        })
        const tokenTextarea = document.createElement("textarea");
        const uuid = WuCaiUtils.getWuCaiClientID()
        const tokenLink = `${BGCONSTS.BASE_URL}/page/gentoken/${BGCONSTS.SERVICE_ID}/${uuid}`
        this.setting.addItem({
            title: "WuCai Sync Token",
            description: `<a href='${tokenLink}'>Click here</a>, get your WuCai token`,
            createActionElement: () => {
                tokenTextarea.rows = 4
                tokenTextarea.className = "b3-text-field fn__block"
                tokenTextarea.placeholder = "Your WuCai Token"
                tokenTextarea.value = thiz.wcSyncer.settings.token || ''
                return tokenTextarea;
            },
        })

        this.addCommand({
            langKey: "wucaisync",
            langText: 'Start WuCai sync',
            hotkey: "",
            customHotkey: "",
            callback: () => {
                this.startSync()
            },
        })
    }

    onunload() {
        logger(this.i18n.byePlugin)
        if (this.wcSyncer) {
            this.wcSyncer.exitSync()
        }
        showMessage("Unload WuCai plugin done")
    }

    async openSetting() {
        this.setting.open(`WuCai Settings (${BGCONSTS.VERSION})`)
    }

    async startSync() {
        if (!this.wcSyncer) {
            showMessage("Start WuCai Sync failed")
            return
        }
        await this.wcSyncer.startSync()
    }
}