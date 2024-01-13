type DocumentId = string;
type BlockId = string;
type NotebookId = string;
type PreviousID = BlockId;
type ParentID = BlockId | DocumentId;
type Notebook = {
    id: NotebookId;
    name: string;
    icon: string;
    sort: number;
    closed: boolean;
}
type NotebookConf = {
    name: string;
    closed: boolean;
    refCreateSavePath: string;
    createDocNameTemplate: string;
    dailyNoteSavePath: string;
    dailyNoteTemplatePath: string;
}
type BlockType = "d" | "s" | "h" | "t" | "i" | "p" | "f" | "audio" | "video" | "other";
type BlockSubType = "d1" | "d2" | "s1" | "s2" | "s3" | "t1" | "t2" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "table" | "task" | "toggle" | "latex" | "quote" | "html" | "code" | "footnote" | "cite" | "collection" | "bookmark" | "attachment" | "comment" | "mindmap" | "spreadsheet" | "calendar" | "image" | "audio" | "video" | "other";
type Block = {
    id: BlockId;
    parent_id?: BlockId;
    root_id: DocumentId;
    hash: string;
    box: string;
    path: string;
    hpath: string;
    name: string;
    alias: string;
    memo: string;
    tag: string;
    content: string;
    fcontent?: string;
    markdown: string;
    length: number;
    type: BlockType;
    subtype: BlockSubType;
    ial?: string;
    sort: number;
    created: string;
    updated: string;
}
type doOperation = {
    action: string;
    data: string;
    id: BlockId;
    parentID: BlockId | DocumentId;
    previousID: BlockId;
    retData: null;
}
interface Window {
    siyuan: {
        notebooks: any;
        menus: any;
        dialogs: any;
        blockPanels: any;
        storage: any;
        user: any;
        ws: any;
        languages: any;
    };
}
type ReslsNotebooks = {
    notebooks: Notebook[];
}
type PandocArgs = string;
type ResBootProgress = {
    progress: number;
    details: string;
}
type ResGetBlockKramdown = {
    id: BlockId;
    kramdown: string;
}
type ChildBlock = {
    id: BlockId;
    type: BlockType;
    subtype?: BlockSubType;
}
type ResGetTemplates = {
    content: string;
    path: string;
}
type ResReadDir = {
    isDir: boolean;
    name: string;
}
type ResExportMdContent = {
    hPath: string;
    content: string;
}
type ResGetNotebookConf = {
    box: string;
    conf: NotebookConf;
    name: string;
}
type ResdoOperations = {
    doOperations: doOperation[];
    undoOperations: doOperation[] | null;
}
type DataType = "markdown" | "dom"
