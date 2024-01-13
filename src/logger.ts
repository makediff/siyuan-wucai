import { BGCONSTS } from "./bgconsts";

function logger(msg: any) {
    BGCONSTS.IS_DEBUG && console.log(msg)
}
export { logger }