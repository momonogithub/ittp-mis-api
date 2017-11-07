import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, values } from 'lodash'
import { reConvertDecimal, fixedTwoDecimal, getNumberOfDays } from './utilize'
import { getTransactionByDate, loanById } from './query'
import { maxBucket, startDate, NPL } from '../setting'
import { netflowModel } from './model/netflow'

const router = express.Router()

router.get("/getNetflow/:month/:year", async function(req, res){
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  try {
    const result = await getNetflow(date)
    res.status(200).send(result)
  } catch(err) {
    res.status(500).send(err)
  }
})

router.get("/updateNetflow/:month/:year",async function(req, res){
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  try {
    const result = await updateNetflow(date)
    res.status(200).send(result)
  } catch(err) {
    res.status(500).send(err)
  }
})

const getNetflow = async date => {
  const result = {}
  for(let count = 0; count < 13 ; count +=1) {
    date.add(1, 'month')
    const key = date.format('YYYYMM')
    let row = await getNetflowByKey(key)
    const month = {}
    // return row of display data
    if(row.length > 0) {
      row = values(row[0]) 
      row.splice(-1,1)
      month.osb = row[1]
      month.osbTotal = row[2]
      month.osbPercent = row[3] === null? 'N/A' : `${row[3]}%`
      const bucket = []
      const percentBucket = []
      for(let item = 4 ; item < row.length ; item += 1) {
        if(item < maxBucket + 4) {
          bucket.push(row[item])
        } else {
          if (row[item] === null) {
            percentBucket.push('N/A')
          } else {
            percentBucket.push(`${row[item]}%`)
          }     
        }
      }
      month.bucket = bucket
      month.percentBucket = percentBucket
    } else {
      month.osb = 'No Data'
      month.osbTotal = 'No Data'
      month.osbPercent = 'N/A'
      month.bucket = new Array(maxBucket).fill('No Data')
      month.percentBucket = new Array(maxBucket).fill('N/A')
    }
    result[key] = month
  }
  return result
}

const updateNetflow = async date => {
  const result = await netflowByDate(date)
  for(let ref in result) {
    await upsertNetflow(ref, result[ref])
    result[ref].osbPercent = result[ref].osbPercent === null? 
    'N/A' : `${result[ref].osbPercent}%`
    result[ref].percentBucket = result[ref].percentBucket.map(b => {
      const display = b === null ? 'N/A' : `${b}%`
      return display
    })
  }
  return result
}

const netflowByDate = async date => {
  const result = {}
  const displayDate = []
  let lastTotal = 0
  // count variable
  for(let month = 0 ; month < 14 ; month += 1) {
    let osbTotal = 0
    let osb = 0
    let bucket = new Array(maxBucket).fill(0) // not count b0
    const key = date.format('YYYYMM')
    // build time gap
    let start = date.format("YYYY-MM-DD HH:mm:ss")
    let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    //query Transaction and make unique by loan_id
    const trans = uniqBy(await getTransactionByDate(start, end), 'loan_id')
    // summary data by one transaction
    await Promise.all(
      trans.map(async tran => {
        // osb calculate
        const loan = await loanById(tran.loan_id)
        const duration = getNumberOfDays(tran.trans_date, date.toDate())
        const newInterest = loan[0].daily_int * duration
        const temp = tran.cf_principal + tran.cf_interest + tran.cf_fee + newInterest
        // bucket calculate
        for(let b = 0 ; b < maxBucket ; b +=1) {
          bucket[b] += tran[`b${b + 1}`] // not include b0
          osbTotal += tran[`b${b + 1}`]
        }
        osb += temp
        osbTotal += temp
        return tran
      })
    )
    osb = fixedTwoDecimal(reConvertDecimal(osb))
    osbTotal = fixedTwoDecimal(reConvertDecimal(osbTotal))
    const firstBucket = osb === 0 ? 
    null : fixedTwoDecimal(reConvertDecimal(bucket[0]) / osb * 100)
    const percentBucket = [firstBucket]
    for(let b = 1 ; b < maxBucket ; b+= 1 ) {
      if(b === 1) {
        bucket[b-1] = fixedTwoDecimal(reConvertDecimal(bucket[b-1]))
      }
      if(bucket[b] === 0) {
        percentBucket.push(null)
      }else {
        bucket[b] = fixedTwoDecimal(reConvertDecimal(bucket[b]))
        percentBucket.push(
          fixedTwoDecimal(bucket[b] / bucket[b-1] * 100)
        )
      }
    }
    // push data to result
    if(month > 0) {
      result[key] = {}
      result[key].osb = osb
      result[key].osbTotal = osbTotal
      result[key].osbPercent = osb === 0? 
      null : fixedTwoDecimal(osb / lastTotal * 100)
      result[key].bucket = bucket
      result[key].percentBucket = percentBucket
    }
    lastTotal = osbTotal
  }
  return result
}

const getNetflowByKey = async key => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Netflow WHERE ref = ?`,
      [key],
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

const upsertNetflow = async (ref, data) => {
  let row = [data.osb, data.osbTotal, data.osbPercent]
  row = row.concat(data.bucket)
  row = row.concat(data.percentBucket)
  row.push(ref)
  let name = ''
  let value = ''
  let update = ''
  for(let count = 0 ; count < row.length ; count ++) {
    name = name.concat(`${netflowModel[count]}, `)
    value = value.concat(`${connection.escape(row[count])}, `)
    update = update.concat(`${netflowModel[count]}=${connection.escape(row[count])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  update = update.slice(0, update.length-2)
  connection.query(`INSERT INTO Netflow (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err, result) {
    if (err) throw err;
  })
}

export default router