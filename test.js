function isWhiteSpaceForTagParser(c) {
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

function convertHashTagToBackLink(cnt) {
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
        const isWhiteS = isWhiteSpaceForTagParser(cCode)
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
        ret.push('#' + cnt.substring(s + 1, e))
        offsetStart = e
    }
    if (offsetStart > 0 && offsetStart < cnt.length) {
        ret.push(cnt.substring(offsetStart, cnt.length))
    }
    return ret.join('')
}

let s = '这个苹果好吃 #是的 #哈哈 你说呢？'
let s2 = convertHashTagToBackLink(s)
console.log({ s, s2 })