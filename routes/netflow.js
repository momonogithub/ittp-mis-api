import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, values } from 'lodash'
import { reConvertDecimal, fixedTwoDecimal, getNumberOfDays } from './utilize'
import { transactionByDate, loanByDate } from './query'
import { maxBucket, startDate } from '../setting'
import { netflowModel } from './model/netflow'
import { netflow } from '../setting'

const router = express.Router()

router.get("/:month/:year", async function(req, res){
  try {
    const { year, month} = req.params // input param
    const date = moment(`${year}${month}`, 'YYYYM') 
    res.status(200).send(await getNetflow(date))
  } catch(err) {
    res.status(500).send(err)
  }
})

router.patch("/",async function(req, res){
  if(req.body.year !== undefined || req.body.month !== undefined ) {
    try {
      const { year, month} = req.body // input param
      const date = moment(`${year}${month}`, 'YYYYM')
      await updateNetflow(date.clone())
      res.status(200).send(await getNetflow(date))
    } catch(err) {
      res.status(500).send(err)
    }
  } else {
    res.status(400).send('bad request')
  }
})

const getNetflow = async date => {
  const queryDate = date.subtract(13, 'month')
  const result = {}
  for(let count = 0; count < 13 ; count +=1) {
    queryDate.add(1, 'month')
    const key = queryDate.format('YYYYMM')
    let row = await getNetflowByKey(key)
    const month = {}
    // return row of display data
    if(row.length > 0) {
      row = values(row[0]) 
      row.splice(-1,1)
      month.osb = row[1]
      month.osbTotal = row[2]
      month.osbPercent = row[3]
      const bucket = []
      const percentBucket = []
      for(let item = 4 ; item < row.length ; item += 1) {
        if(item < maxBucket + 4) {
          bucket.push(row[item])
        } else {
          percentBucket.push(row[item])
        }
      }
      month.bucket = bucket
      month.percentBucket = percentBucket
    } else {
      month.osb = 'No Data'
      month.osbTotal = 'No Data'
      month.osbPercent = null
      month.bucket = new Array(maxBucket).fill('No Data')
      month.percentBucket = new Array(maxBucket).fill(null)
    }
    result[key] = month
  }
  return result
}

export const updateNetflow = async date => {
  const result = await netflowByDate(date)
  for(let ref in result) {
    await upsertNetflow(ref, result[ref])
  }
}

const netflowByDate = async date => {
  const result = {}
  const displayDate = []
  let lastTotal = 0
  date.subtract(1, 'month')
  // count variable
  for(let month = 0 ; month < 2 ; month += 1) {
    let osbTotal = 0
    let osb = 0
    let bucket = new Array(maxBucket).fill(0) // not count b0
    const key = date.format('YYYYMM')
    // build time gap
    let start = date.format("YYYY-MM-DD HH:mm:ss")
    let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    //query Transaction and make unique by loan_id
    let [trans, loans] = await Promise.all([
      transactionByDate(start, end),
      loanByDate(startDate, end)
    ]) 
    // summary data by one transaction
    trans =  uniqBy(trans, 'loan_id')
    await Promise.all(
      trans.map(async tran => {
        // osb calculate
        const loan = loans.filter(loan => loan.loan_id === tran.loan_id)
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
    osb = reConvertDecimal(osb)
    osbTotal = reConvertDecimal(osbTotal)
    const firstBucket = osb === 0 ? 
    null : fixedTwoDecimal(reConvertDecimal(bucket[0]) / osb * 100)
    const percentBucket = [firstBucket]
    for(let b = 1 ; b < maxBucket ; b+= 1 ) {
      if(b === 1) {
        bucket[b-1] = reConvertDecimal(bucket[b-1])
      }
      if(bucket[b] === 0) {
        percentBucket.push(null)
      }else {
        bucket[b] = reConvertDecimal(bucket[b])
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
      result[key].osbPercent = lastTotal === 0? 
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
      `SELECT * FROM ${netflow} WHERE ref = ?`,
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
  connection.query(`INSERT INTO ${netflow} (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err) {
    if (err) throw err
  })
}

export default router