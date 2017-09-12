import moment from 'moment'
import { reConvertDecimal } from './utilize'

export const propsNumber = [
  'cf_principal', 'cf_interest', 'cf_fee',
  
]

export const propsBucket = [
  'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'
]

export const propsOSB = [
  ...propsNumber,
  ...propsBucket,
  'trans_date'
]

export const fillNetflow = (arr) => {
  const temp = []
  const templength = propsNumber.length + propsBucket.length - 2
  let count = 0
  while(arr.length < 13) {
    count = 0
    while(count < templength) {
      temp.push(0)
      count += 1
    } 
    arr.push(temp)
  }
  return arr
}

export const riskNetflow = (trans, date) => {
  const result = []
  const limit = trans.length - 1
  let i = 0
  let month = 0
  let OSB = 0
  let count = 0
  let totalOSB = 0
  let calOSB = 0
  let bucket = [0,0,0,0,0,0,0,0,0,0,0,0]
  let flag = date
  while(month < 13) { // run every transaction until complete 13 month
    // check flag of month
    if(count > limit) break
    const check = moment(trans[count].trans_date)
    while(!check.isBefore(flag) || count === limit) {
      month += 1
      const arr = [totalOSB,OSB]
      bucket.map(props => arr.push(props))
      result.push(arr)
      flag.add(1, 'month')
      if(count === limit) break
    }
    // summary data
    propsNumber.map(prop => trans[count][prop] = reConvertDecimal(trans[count][prop]))
    propsBucket.map(prop => trans[count][prop] = reConvertDecimal(trans[count][prop]))
    calOSB = trans[count].cf_principal + trans[count].cf_interest + trans[count].cf_fee + trans[count].b0
    OSB += calOSB
    totalOSB += calOSB
    i=0
    while(i< 12) {
      bucket[i] += trans[count][propsBucket[i+1]]
      totalOSB += bucket[i]
      i+=1
    }
    count += 1
  }
  fillNetflow(result)
  return result
}