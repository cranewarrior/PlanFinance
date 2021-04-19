import { Currencies } from 'ts-money'


export function sleep (ms : number) : Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export type StringKeys<T> = Extract<keyof T, string>;


export const processBatch = async <T, U> (
  data : Array<T>, func : (elem : T) => U,
  statusFunc : (curIndex : number, len : number, result : U) => boolean | undefined | null,
  nbParallel = 8,
) : Promise<U[]> => {

  const results : Array<U> = []
  let index                = 0
  let iCompleted           = 0
  let abortAll             = false

  const runOne = async (curIndex : number) => {
    let result : U | null = null
    try {
      result = await func(data[curIndex])
    } catch (error) {
      console.error(error)
      result = error
    }
    const statusResult = statusFunc ? await statusFunc(curIndex, data.length, result) : true

    if (statusResult === false) {
      console.warn('Abort "signal" received')
      abortAll = true
    }

    results.push(result)

    ++iCompleted
  }

  const runLoop = async () : Promise<void> => {
    while (!abortAll
           && iCompleted < data.length
           && index < data.length) {

      const curIndex = index++

      await sleep(0)
      await runOne(curIndex)
    }
  }

  // start first iteration
  const threads : Promise<void>[] = []
  while (--nbParallel >= 0) {
    threads.push(runLoop())
  }

  await Promise.all(threads)

  return results
}


export class MathUtils {

  static between (i : number, min : number, max : number) : number {
    return Math.max(min, Math.min(i, max))
  }

}


export function hideZero (num : number) : string {
  return num === 0 ? '' : num.toString()
}

export function padDecimals (num : number, minDec = 0, maxDec = 4) :string {

  // decimal part, without trailing 00
  // 1.000 ->  ''
  // 1.12345000 ->  12345
  // 1.12000 -> 12
  const str = num.toFixed(maxDec).toString()

  const dec = str.includes('.') ? str.split('.')[1].replace(/0+$/, '') : ''

  const len = dec.length <= minDec ? minDec : maxDec

  return Number(num).toFixed(len)
}


interface CurrencyInfoInterface {
  decimal_digits : number
  symbol : string
}


export const getCurrencyInfo = (currency : string | null) : CurrencyInfoInterface => {

  const info = {
    decimal_digits : 2,
    symbol         : '$',
  }

  if (!currency) {
    return info
  }

  currency = currency.toUpperCase()

  if (!Currencies[currency as keyof typeof Currencies]) {
    throw `Currency not found ${currency}`
  }

  return Currencies[currency.toUpperCase() as keyof typeof Currencies]
}


export const formatCurrency = (value : /*Money |*/ number, currency : string, fixedDecimals = true) : string => {
  // return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: currency }).format(value)

  const currencyInfo = getCurrencyInfo(currency)

  if (value === null) {
    return ''
  }

  /* if (value instanceof Money) {
   value = value.toDecimal()
   } else */
  if (!isNaN(Number(value))) {
    value = Number(value)
  }


  /* cap max decimals to either currency, or 4 */
  const valueStr = padDecimals(
    value,
    currencyInfo.decimal_digits,
    fixedDecimals ? currencyInfo.decimal_digits : Math.max(currencyInfo.decimal_digits, 4),
  )

  if ([
    'EUR', 'GBP',
  ].includes(currency)) {
    return `${currencyInfo.symbol} ${valueStr}`
  }

  return `${valueStr} ${currencyInfo.symbol}`
}

type groupByFn<T> = (value : T, index : number) => string
type groupByResult<T> = { [key : string] : T[] }


export class ArrayUtils {

  public static groupBy<T> (array : T[], keyCb : groupByFn<T>) : groupByResult<T> {

    return array.reduce((result : groupByResult<T>, currentValue, index) => {

      const key : string = keyCb(currentValue as T, index)

      result[key] = result[key] || []

      result[key].push(
        currentValue,
      )
      return result
    }, {})
  }

  public static batches<T> (array : T[], perChunk : number) : T[][] {

    return Object.values(ArrayUtils.groupBy<T>(array, (value, index) => {

      return Math.floor(index / perChunk).toString()

    }))
  }


}


export class StringUtils {

  static toNumberOrNull (value : string) : number | null {
    const floatVal = parseFloat(value)

    if (isNaN(floatVal)) {
      return null
    }

    return floatVal
  }


}


