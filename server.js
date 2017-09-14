import { riskNetflow, propsOSB, propsNumber, propsBucket } from './netflow'
import { reConvertDecimal } from './utilize'
import moment from 'moment'
import express from 'express'
import mysql from 'mysql'
import { uniqBy } from 'lodash'

const app = express()

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  database : 'ittpdev'
})

connection.connect(function(err){
  if(!err) {
      console.log("Connection successful")
  } else {
      console.log("Error connecting database")
  }
})

const queryTransByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT ${propsOSB} from Transaction 
        WHERE (trans_date BETWEEN '${start}' AND '${end}') AND trc != 'LO' ORDER BY trans_date DESC`,
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

app.get("/netflow/:month/:year",async function(req, res){
  const result = [] // export result
  let { year, month} = req.params // input param
  // count variable
  let countMonth = 0
  let maxLength = 0
  let count = 0
  // make date backward 12 month
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  while(countMonth < 4) { // while loop until 13 month
    let totalOSB = 0
    let OSB = 0
    let bucket = [0,0,0,0,0,0,0,0,0,0,0,0]
    // build time gap
    let start = date.format("YYYY-MM-DD HH:mm:ss")
    let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    //query Transaction and make unique by loan_id
    const trans = uniqBy(await queryTransByDate(start, end), 'loan_id')
    maxLength = trans.length
    let countTran = 0
    // summary data by one transaction
    while(countTran < maxLength) {
      let temp = 0
      // OSB calculate
      propsNumber.map(prop => {
        trans[countTran][`${prop}`] = reConvertDecimal(trans[countTran][`${prop}`])
        temp += trans[countTran][`${prop}`]
        return prop
      })
      // bucket calculate
      propsBucket.map(prop => {
        trans[countTran][`${prop}`] = reConvertDecimal(trans[countTran][`${prop}`])
        return prop
      })
      while(count < bucket.length) {
        bucket[count] = trans[countTran][`${propsBucket[count + 1]}`] // not include b0
        totalOSB += bucket[count]
        count += 1
      }
      count = 0
      OSB += temp
      totalOSB += temp
      countTran +=1
    }
    console.log(`TotalOSB = ${totalOSB}, OSB = ${OSB}, ${bucket}`)
    // percent calculate
    let percent = [0,0,0,0,0,0,0,0,0,0,0,0,0]
    // push data to result
    const arr = [totalOSB,OSB]
    maxLength = bucket.length
    count = 0
    while(count < maxLength)
    {
      arr.push(percent[count])
      arr.push(bucket[count])
      count+=1
    }
    arr.push(percent[count])
    count = 0
    result.push(arr)
    countMonth+=1
  }
  res.send(result)
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})