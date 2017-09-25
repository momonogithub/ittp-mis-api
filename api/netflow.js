import moment from 'moment'
import { uniqBy } from 'lodash'
import { reConvertDecimal, commaNumber } from './utilize'
import { latestTransByDate } from './query'

const propsNumber = [
  'cf_principal', 'cf_interest', 'cf_fee',
]

const calculatePercent = async data => {
  const result = []
  let i = 0
  while(i < data.length) {
    const row = []
    let percent = [0,0,0,0,0,0,0,0,0,0,0,0,0]
    let j = 0
    while(j < data[i].length) {
      if(j < 2) {
        row.push(commaNumber(data[i][j]))
        if( j === 1) { // if finished insert TotalOSB and OSB
          if (i > 0 && data[i-1][j-1] > 0) percent[0] = Math.ceil(data[i][j] / data[i-1][j-1] * 100)
          row.push(`${percent[0]}%`)
        }
      } else {
        row.push(commaNumber(data[i][j]))
        if( i > 0 && data[i-1][j-1] > 0) percent[j-1] = Math.ceil(data[i][j] / data[i-1][j-1] * 100)
        row.push(`${percent[j-1]}%`)
      }
      j += 1
    }
    result.push(row)
    i += 1
  }
  return result
}

export const riskNetflow = async (connection, date) => {
  const result = []
  const rawData = []
  // count variable
  let countMonth = 0
  let maxLength = 0
  let count = 0
  while(countMonth < 13) { // while loop until 13 month
    let totalOSB = 0
    let OSB = 0
    let bucket = [0,0,0,0,0,0,0,0,0,0,0,0]
    // build time gap
    let start = date.format("YYYY-MM-DD HH:mm:ss")
    let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    //query Transaction and make unique by loan_id
    const trans = uniqBy(await latestTransByDate(connection, start, end), 'loan_id')
    maxLength = trans.length
    let countTran = 0
    // summary data by one transaction
    while(countTran < maxLength) {
      let temp = 0
      // OSB calculate
      propsNumber.map(prop => {
        temp += trans[countTran][`${prop}`]
        return prop
      })
      // bucket calculate
      while(count < bucket.length) {
        bucket[count] += trans[countTran][`b${count + 1}`] // not include b0
        totalOSB += trans[countTran][`b${count + 1}`]
        count += 1
      }
      count = 0
      OSB += temp
      totalOSB += temp
      countTran +=1
    }
    // push data to result
    const arr = [reConvertDecimal(totalOSB),reConvertDecimal(OSB)]
    maxLength = bucket.length
    count = 0
    while(count < maxLength)
    {
      arr.push(reConvertDecimal(bucket[count]))
      count+=1
    }
    count = 0
    rawData.push(arr)
    countMonth+=1
  }
  return await calculatePercent(rawData)
}