/**
 * QR伝達データ デコード
 *
 * Usage: node index.js <sourceFile path> <card.json path> <public key path> <output csvFile path>
 *
 */
import { Response } from 'express'
import crypto from 'crypto'
import util from 'util'
import zlib from 'zlib'
import config from './config'
import moment from 'moment'
import dayjs from 'dayjs'

const UNDEF = '\u0000'
const PACKING = '_packing'
const PACKING_DEL = 'del'
const PACKING_NUMBER = 'number'
const LANG = 'ja'

/**
 * 電文をセッション鍵で復号化する
 * @param {*} encrypted 暗号化された電文
 * @param {*} skey セッション鍵の種
 * @param {*} salt セッション鍵のSALT
 * @param {*} iv 初期化ベクトル
 * @return 復号化済みデータ
 */
const decryptData = (
    encrypted: Buffer,
    skey: Buffer,
    salt: string,
    iv: Buffer
): Buffer => {
    // セッション鍵を作成する
    const key = crypto.scryptSync(skey, salt, 32)

    // 複合器を生成する
    const decipher = crypto.createDecipheriv(config.ALGORITHM, key, iv)

    // 暗号化済みデータを を複合
    let decryptedData = decipher.update(encrypted)
    decryptedData = Buffer.concat([decryptedData, decipher.final()])

    return decryptedData
}

/**
 * デコード処理を実行する
 * @param publicKeyFile 公開鍵ファイル名
 * @param srcFile エンコード済みデータファイル名
 * @return {any[]} 復号化済みデータ (PackされたArray)
 */
const decodeProcess = async (
    publicKey: string,
    srcFile: string
): Promise<any[] | null> => {
    try {
        // 暗号化済みデータを読み込む
        const srcData = JSON.parse(srcFile)
        const headerPart = srcData[0]
        const skeyPart = srcData[1]
        const dataPart = srcData[2]
        // セッション鍵を公開鍵で復号化する
        const skey = crypto.publicDecrypt(
            publicKey,
            Buffer.from(skeyPart, 'base64')
        )
        // console.log("skey = " + skey);
        // データ部から初期化ベクタを取り出す(HEXなので初期化ベクトルバイト数の2倍)
        const ivHex = dataPart.substring(0, config.IVLEN * 2)
        // console.log("ivHex = " + ivHex) ;
        const ivBuf = Buffer.from(ivHex, 'hex')

        // データ部から暗号化データを取り出す
        const encrypted = dataPart.substring(config.IVLEN * 2)
        const encryptedBuf = Buffer.from(encrypted, 'base64')

        // 暗号化データをセッション鍵で復号化する
        const gzipped = decryptData(encryptedBuf, skey, config.SALT, ivBuf)

        // 圧縮済みデータを展開する
        const gunzip = util.promisify(zlib.gunzip)
        const decrypted = await gunzip(gzipped)

        return JSON.parse(decrypted.toString())
    } catch (e) {
        console.log(e)
        return null
    }
}

/**
 * 文字列をCSVカラム用にクォート、エスケープ処理する。文字列以外の場合はそのまま返す
 * @param {string} value 対象文字列
 * @return {string} クォート、エスケープ処理された文字列または、文字列以外の値
 */
const quoteString = (value: any): any => {
    if (typeof value === 'string') {
        // 改行コード、タブを \n \t に置き換える
        value = value.replace(/\r\n/g, '\n')
        value = value.replace(/\r/g, '\n')
        value = value.replace(/\n/g, '\\n')
        value = value.replace(/\t/g, '\\t')
        value = value.replace(/\"/g, '""') // 2つのダブルクォートでエスケープ
        return '"' + value + '"'
    } else {
        return value
    }
}

/**
 * 対象オブジェクトの_packing情報が削除済かを判定する
 * @param item attribute、choiseなどの_packing対象オブジェクト
 * @return 削除済みの場合はdel
 */
const isDeletedItem = (item: object | any): boolean => {
    return item[PACKING] && item[PACKING][PACKING_DEL]
}

/**
 * 対象オブジェクトの_packing情報が存在するかを判定する
 * @param item attribute、choiseなどの_packing対象オブジェクト
 * @return 存在しない場合はキーがない
 */
const isPackingItem = (item: object | any): boolean => {
    return item[PACKING]
}

/**
 * 属性のpack値を取り出す
 * @param attr 属性オブジェクト
 * @param packedData パックされた伝達データ
 * @return pack値。未設定の場合はundefined
 */
const getPackedValue = (attr: object | any, packedData: any[]): any => {
    let packNo = attr[PACKING] ? attr[PACKING][PACKING_NUMBER] : undefined
    if (packNo === undefined) {
        return undefined
    }
    let packedValue = packedData[packNo]
    if (packedValue === UNDEF) {
        return undefined
    } else {
        return packedValue
    }
}

/**
 * 対象オブジェクトのタイトル(CSVヘッダーに使用する)を取り出す
 * @param item attributeなどの_packing対象オブジェクト
 */
const getItemTitle = (item: object | any): string => {
    let title
    if (item['label'] && item['label'][LANG]) {
        title = item['label'][LANG]
    } else if (item['title'] && item['title'][LANG]) {
        title = item['title'][LANG]
    }
    return title || ''
}

/**
 * pack値からCSVに埋め込む選択値を取り出す
 * @param item attribute属性
 * @param packedValue pack値
 * @return 選択値
 */
const getSelectedValue = (item: object | any, packedValue: number): any => {
    let choices: object[] | any = item['choices']
    let choice = choices.find((c: any) => {
        return c[PACKING] && c[PACKING][PACKING_NUMBER] === packedValue
    })
    if (choice === undefined) {
        return undefined
    }
    let title = getItemTitle(choice)
    return title
}

/**
 * pack値から本来の選択値を取り出す
 * @param item attribute属性
 * @param packedValue pack値
 * @return 本来の選択値
 */
const getRawSelectedValue = (item: object | any, packedValue: number): any => {
    let choices: object[] | any = item['choices']
    let choice = choices.find((c: any) => {
        return c[PACKING] && c[PACKING][PACKING_NUMBER] === packedValue
    })
    if (choice === undefined) {
        return undefined
    }
    return choice['value']
}

/**
 * datetime型の値をCSV出力時の書式に変換する
 * @param dt YYYY年MM月DD日 hh:mm
 * @return YYYY-MM-DD hh:mm
 */
const formatDateTime = (dt: string): string => {
    const r = /(\d+)年(\d+)月(\d+)日\s+(\d+):(\d+)/
    let m = dt.match(r)
    if (m) {
        let d = `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`
        return d
    } else {
        // 形式がマッチしない場合は、そのまま
        return dt
    }
}

/**
 * CSVに出力する要素の値を取り出す
 * @param item attribute属性
 * @param packedValue pack値
 * @return 要素の値。値が設定されていない場合はundefined
 */
const getItemValue = (item: object | any, packedValue: any): any => {
    if (packedValue === undefined || packedValue === UNDEF) {
        return undefined
    }

    let attrValue = undefined
    let typ = item['type']
    if (typ === undefined) {
        return undefined
    }
    switch (typ) {
        case 'string':
        case 'date':
        case 'time':
        case 'text':
        case 'check':
        case 'number':
        case 'age':
            // 保存値が値
            attrValue = packedValue
            break
        case 'datetime':
            attrValue = formatDateTime(packedValue)
            break
        case 'single':
        case 'dropdown':
            // pack値に対応する値を取り出す
            attrValue = getSelectedValue(item, packedValue)
            break
        case 'multi':
            // packは選択値の配列であるため、その値を全て取り出す
            if (Array.isArray(packedValue)) {
                let vs = packedValue.map((pv, idx, arr) => {
                    return getSelectedValue(item, pv)
                })
                attrValue = vs.join(',')
            }
            break
        default:
            throw new Error(`Unknown type: ${typ}`)
            break
    }
    return attrValue
}

/**
 * 本来の要素値を取り出す（データベースに記録されたもの）
 * @param item attribute属性
 * @param packedValue pack値
 * @return 本来の要素値。値が設定されていない場合はundefined
 */
const getRawItemValue = (item: object | any, packedValue: any): any => {
    if (packedValue === undefined || packedValue === UNDEF) {
        return undefined
    }

    let attrValue = undefined
    let typ = item['type']
    if (typ === undefined) {
        return undefined
    }
    switch (typ) {
        case 'string':
        case 'date':
        case 'time':
        case 'text':
        case 'check':
        case 'number':
            // 保存値が値
            attrValue = packedValue
            break
        case 'datetime':
            attrValue = formatDateTime(packedValue)
            break
        case 'single':
        case 'dropdown':
            // pack値に対応する値を取り出す
            attrValue = getRawSelectedValue(item, packedValue)
            break
        case 'multi':
            // packは選択値の配列であるため、その値を全て取り出す
            if (Array.isArray(packedValue)) {
                let vs = packedValue.map((pv, idx, arr) => {
                    return getRawSelectedValue(item, pv)
                })
                attrValue = vs
            }
            break
        default:
            throw new Error(`Unknown type: ${typ}`)
            break
    }
    return attrValue
}

/**
 * 列タイトルをオプションに従ってフォーマットする
 * @param title タイトル文字列
 * @param options 属性値生成のオプション ({prefix: 列名のprefix, suffix: 列名のsuffix})
 */
const formatTitle = (
    title: string,
    options?: { [key: string]: any }
): string => {
    if (options) {
        if (options['prefix']) {
            title = options['prefix'] + title
        }
        if (options['suffix']) {
            title = title + options['suffix']
        }
    }
    return title
}

/**
 * attributeオブジェクトのヘッダーと値を作成する
 * @param packedData パックされた伝達データ
 * @param attr attribute オブジェクト
 * @param headers CSVヘッダーの格納先
 * @param columns CSVデータの格納先
 * @param options 属性値生成のオプション ({prefix: 列名のprefix, suffix: 列名のsuffix})
 */
const generateCSV_attribute = (
    packedData: any[],
    attr: object | any,
    headers: string[],
    columns: string[],
    options?: { [key: string]: any }
): void => {
    if (!attr[PACKING]) {
        return
    }

    // attributeは一つの列を生成する
    // 列名を取り出す
    let title = formatTitle(getItemTitle(attr), options)

    // 列値を取り出す
    let packedValue = getPackedValue(attr, packedData)
    let value = getItemValue(attr, packedValue)
    headers.push(title)
    columns.push(value || '')
}

/**
 * groupオブジェクトのヘッダーと値を生成する
 * @param packedData パックされた伝達データ
 * @param group group オブジェクト
 * @param headers CSVヘッダーの格納先
 * @param columns CSVデータの格納先
 * @param options 属性値生成のオプション  ({prefix: 列名のprefix, suffix: 列名のsuffix})
 */
const generateCSV_group = (
    packedData: any[],
    group: object | any,
    headers: string[],
    columns: string[],
    options?: { [key: string]: any }
): void => {
    // groupはトップレベル質問の列と、アクティベートされたサブ質問の列を生成する
    if (!group[PACKING]) {
        return
    }
    let title = formatTitle(getItemTitle(group), options)
    headers.push(title)

    let packedValue = getPackedValue(group, packedData)
    if (!Array.isArray(packedValue)) {
        columns.push('')
        return
    }

    // トップレベル質問を展開
    // packedValue は [toplevel, {activated Hash}]
    let topEmValue = packedValue[0]
    let topValue = getItemValue(group, topEmValue)
    let rawTopValue = getRawItemValue(group, topEmValue)
    if (topValue === undefined || rawTopValue === undefined) {
        columns.push('')
        return
    }
    columns.push(topValue)

    // この時点で
    // topEmValue は トップレベル質問で選択された選択肢の_packing.numberまたはその配列
    // rawTopValue は トップレベル質問で選択された選択肢のvalueまたはその配列

    // サブ質問を全ての選択肢について展開するために
    // 単一選択と複数選択を統一して扱えるようにする
    if (!Array.isArray(topEmValue)) {
        topEmValue = [topEmValue]
        rawTopValue = [rawTopValue]
    }

    // 全ての選択肢に対してactivateされた質問群を展開する
    let activatedHash = packedValue[1]
    topEmValue.forEach((tev: any, idx: any) => {
        // activate項目タイトルのprefixを設定する
        let subopt = options ? Object.assign({}, options) : {}
        if (!subopt['prefix']) {
            subopt['prefix'] = ''
        }
        subopt['prefix'] = subopt['prefix'] + getItemTitle(group) + '_'

        let tv = rawTopValue[idx]
        let subPackedData = activatedHash[tev]
        let actKey = String(tv)
        let activation = group['activation']
        if (activation) {
            let activated: object[] | any = activation[actKey]
            if (activated) {
                activated.forEach((a: any) => {
                    switch (a['@class']) {
                        case 'attribute':
                            if (!isDeletedItem(a) && isPackingItem(a)) {
                                generateCSV_attribute(
                                    subPackedData,
                                    a,
                                    headers,
                                    columns,
                                    subopt
                                )
                            }
                            break
                        case 'combo':
                            if (!isDeletedItem(a)) {
                                generateCSV_combo(
                                    subPackedData,
                                    a,
                                    headers,
                                    columns,
                                    subopt
                                )
                            }
                            break
                        case 'group':
                            if (!isDeletedItem(a) && isPackingItem(a)) {
                                generateCSV_group(
                                    subPackedData,
                                    a,
                                    headers,
                                    columns,
                                    subopt
                                )
                            }
                            break
                        default:
                            break
                    }
                })
            }
        }
    })
}

/**
 * comboオブジェクトのヘッダーと値を生成する
 * @param packedData パックされた伝達データ
 * @param combo combo オブジェクト
 * @param headers CSVヘッダーの格納先
 * @param columns CSVデータの格納先
 * @param options 属性値生成のオプション  ({prefix: 列名のprefix, suffix: 列名のsuffix})
 */
const generateCSV_combo = (
    packedData: any[],
    combo: object | any,
    headers: string[],
    columns: string[],
    options?: { [key: string]: any }
): void => {
    // comboはattributesがフラットに展開されている
    // 列名にはcomboのタイトルをプレフィクスにつける
    let prefix = ''
    let cmtitle = formatTitle(getItemTitle(combo), options)
    if (cmtitle) {
        prefix = cmtitle + '_'
    }
    let attributes = combo['attributes']
    attributes.forEach((attr: any) => {
        if (!isDeletedItem(attr) && isPackingItem(attr)) {
            generateCSV_attribute(packedData, attr, headers, columns, {
                prefix: prefix,
            })
        }
    })
}

/**
 * repeatオブジェクトのヘッダーと値を生成する
 * @param packedData パックされた伝達データ
 * @param repeat repeat オブジェクト
 * @param headers CSVヘッダーの格納先
 * @param columns CSVデータの格納先
 */
const generateCSV_repeat = (
    packedData: any[],
    repeat: object | any,
    headers: string[],
    columns: string[]
): void => {
    // repeatはitemsの値が配列としてエンコーディングされている
    let repPackedArray = getPackedValue(repeat, packedData)
    if (!Array.isArray(repPackedArray)) {
        // 値が設定されていない
        return
    }

    let prefix = ''
    let repTitle = getItemTitle(repeat)
    if (repTitle) {
        prefix = repTitle + '_'
    }

    // 繰り返しを展開する
    let items = repeat['items']
    repPackedArray.forEach((repPackedData, idx, arr) => {
        // repPackedが繰り返し１回分のオブジェクトをエンコードした配列
        let options = { prefix: prefix + String(idx + 1) + '_' }
        items.forEach((item: any) => {
            switch (item['@class']) {
                case 'attribute':
                    if (!isDeletedItem(item) && isPackingItem(item)) {
                        generateCSV_attribute(
                            repPackedData,
                            item,
                            headers,
                            columns,
                            options
                        )
                    }
                    break
                case 'combo':
                    if (!isDeletedItem(item)) {
                        generateCSV_combo(
                            repPackedData,
                            item,
                            headers,
                            columns,
                            options
                        )
                    }
                    break
                case 'group':
                    if (!isDeletedItem(item) && isPackingItem(item)) {
                        generateCSV_group(
                            repPackedData,
                            item,
                            headers,
                            columns,
                            options
                        )
                    }
                    break
                default:
                    break
            }
        })
    })
}

/**
 * メタデータのヘッダーと値を生成する
 * @param packedData パックされた伝達データ
 * @param headers CSVヘッダーの格納先
 * @param columns CSVデータの格納先
 */
const generateCSV_meta = (
    packedData: any[],
    headers: string[],
    columns: string[]
): void => {
    // packedDataの先頭要素がメタデータ
    let meta: any[] = packedData[0]

    const CREATED_DATE_COL = 0
    const UPDATED_DATE_COL = 1
    headers.push('データ作成日時')
    headers.push('データ更新日時')
    columns.push(
        moment(meta[CREATED_DATE_COL])
            .utcOffset('+09:00')
            .format('YYYY-MM-DD HH:mm:ss')
    )
    columns.push(
        moment(meta[UPDATED_DATE_COL])
            .utcOffset('+09:00')
            .format('YYYY-MM-DD HH:mm:ss')
    )
}

/**
 * CSVファイルデータを生成する
 * @param packedData パックされた伝達データ
 * @param cardFile card.jsonのパス
 * @param csv 列値配列の配列。一列目がヘッダー
 */
const generateCSV = async (
    packedData: any[],
    design: any,
    csv: string[][]
): Promise<boolean> => {
    try {
        // card定義を辿りながらCSVデータを作成する
        let headers: string[] = []
        let columns: string[] = []
        // メタデータのCSV列を作成する
        // メタデータは伝達データフォーマットに含まれていないので伝達データから取り除く
        generateCSV_meta(packedData, headers, columns)
        packedData.splice(0, 1)
        // カードデザインを辿りながらCSV列を生成する
        let pages = design['pages']
        pages.forEach((page: any) => {
            let items = page['items']
            items.forEach((item: any) => {
                switch (item['@class']) {
                    case 'attribute':
                        if (!isDeletedItem(item) && isPackingItem(item)) {
                            generateCSV_attribute(
                                packedData,
                                item,
                                headers,
                                columns
                            )
                        }
                        break
                    case 'combo':
                        if (!isDeletedItem(item)) {
                            generateCSV_combo(
                                packedData,
                                item,
                                headers,
                                columns
                            )
                        }
                        break
                    case 'group':
                        if (!isDeletedItem(item) && isPackingItem(item)) {
                            generateCSV_group(
                                packedData,
                                item,
                                headers,
                                columns
                            )
                        }
                        break
                    case 'repeat':
                        if (!isDeletedItem(item) && isPackingItem(item)) {
                            generateCSV_repeat(
                                packedData,
                                item,
                                headers,
                                columns
                            )
                        }
                        break
                    default:
                        throw new Error(`Unknown class: item["@class"]`)
                }
            })
        })
        // console.log("headers:", headers) ;
        // console.log("columns:", columns) ;
        csv.push(headers)
        csv.push(columns)

        return true
    } catch (e) {
        console.error(e)
        throw e
    }
}

/**
 * cp932に変換できない文字のマッピング
 */
const cp932Mapping: any = {
    '≥': '≧',
    '−': 'ー',
    '〜': '～',
}

/**
 * CP932への変換が行えない文字列を代替文字に置き換える
 * @param src ソース文字列
 * @returns 正規化された文字列
 */
const regCP932 = (src: string): string => {
    if (src === null || src === undefined || src === '') {
        return src
    }
    try {
        let result = src
            .split('')
            .map((c) => {
                let repl = cp932Mapping[c]
                return repl === undefined ? c : repl
            })
            .join('')
        return result
    } catch (e) {
        console.error(e)
        return src
    }
}

export const makeCsvFile = async (
    res: Response,
    srcFile: string,
    cardFile: any,
    pubKey: string
) => {
    try {
        const FILENAME = 'DHC_DATA'
        const today = dayjs().format('YYYYMMDD') // 現在の日付情報を取得
        const currenTime = dayjs().format('HHmmss') // 現在の日付情報を取得

        // 伝達データをでコードする
        const decoded = await decodeProcess(pubKey, srcFile)
        if (decoded === null) {
            throw new Error("error");
        }
        // CSVデータを作成する
        let lines: string[][] = []
        const success = await generateCSV(decoded, cardFile, lines)
        if (success) {
            // CSVファイルを出力する
            let outData = lines
                .map((line, idx, arr) => {
                    return line
                        .map((col, idx, arr) => {
                            return quoteString(col)
                        })
                        .join(',')
                })
                .join('\r\n')
            res.setHeader('Content-Type', 'text/csv; charset=UTF-8')
            res.attachment(`${FILENAME}_${today}_${currenTime}.csv`)
            res.status(200).send(
                String.fromCharCode(0xfeff) + regCP932(outData)
            )
        } else {
            console.log('cscファイルが作成できませんでした')
            res.status(500).send()
        }
    } catch (err) {
        res.status(500).send()
    }
}
