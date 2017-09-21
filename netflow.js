import moment from 'moment'
import { reConvertDecimal, commaNumber } from './utilize'
import { uniqBy } from 'lodash'

const propsNumber = [
  'cf_principal', 'cf_interest', 'cf_fee',
]

const propsBucket = [
  'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'
]

const propsOSB = [
  'loan_id',
  'trans_date',
  'trc',
  ...propsNumber,
  ...propsBucket,
]

const propsTRC = [
  'LO',
  'PO',
]

const queryTransByDate = async (connection, start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT ${propsOSB} from Transaction 
        WHERE (trans_date BETWEEN ? AND ?) AND trc != 'LO' AND trc != 'PO' 
        ORDER BY trans_date DESC`,
      [start, end],
      function(err, rows, fields) {
        if(!err){
          resolve(rows)
        } else {
          reject(err)
        }
      }
    )
  })
}

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
    const trans = uniqBy(await queryTransByDate(connection, start, end), 'loan_id')
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
        bucket[count] += trans[countTran][`${propsBucket[count + 1]}`] // not include b0
        totalOSB += trans[countTran][`${propsBucket[count + 1]}`]
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