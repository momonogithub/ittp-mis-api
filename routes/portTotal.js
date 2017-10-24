import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate, NPL } from '../setting'
import { portTotalModel } from './model/portTotal'
import { 
  getTransactionByDate,
  loanByDate,
  appByDate } from './query'
import { 
  reConvertDecimal,
  getMultiLoans,
  calculateLoans,
  calculateTrans,
  fixedTwoDecimal,
  summaryPayment } from './utilize'

const router = express.Router()

router.get("/getPortTotal/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  try {
    const result = await getPortTotal(date)
    res.status(200).send(result)
  } catch(err) {
    res.status(500).send(err)
  }

})

router.get("/updatePortTotal/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  const result = await updatePortTotal(date)
  result.map(prop => {
    for(let count = 0 ; count < prop.length ; count += 1) {
      if(count > 12 && prop[count] !== 'N/A') { // percent indexs are 12 or more
        prop[count] = `${prop[count]}%`
      }
    }
    return prop
  })
  res.send(result)
})

const upsertPortTotal = async row => {
  let name = `${portTotalModel[0]}`
  let value = `${row[0]}`
  let update = `${portTotalModel[0]}=${row[0]}`
  for(let count = 1 ; count < row.length ; count ++) {
    name = name.concat(`, ${portTotalModel[count]}`)
    value = value.concat(`, ${connection.escape(row[count])}`)
    update = update.concat(`, ${portTotalModel[count]}=${connection.escape(row[count])}`)
  }
  connection.query(`INSERT INTO PortTotal (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err, result) {
    if (err) throw err;
  })
}

const getPortTotalByKey = async key => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM PortTotal 
        WHERE date = ?`,
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

const updatePortTotal = async date => {
  const result = []
  const rows = await portTotalByDate(date)
  await Promise.all(
    rows.map(async row => {
      await upsertPortTotal(row)
      const arr = []
      row.splice(-1,1) // delete key
      for(let count = 0; count < row.length; count+=1) {
        if(row[count] === null) {
          arr.push('N/A')
        } else {
          arr.push(row[count])
        }
      }
      result.push(arr)
      return row
    })
  )
  return result
}

const getPortTotal = async date => {
  const result = []
  for(let count = 0; count < 13 ; count ++) {
    date.add(1, 'month')
    const key = date.format('YYYYMM')
    let row = await getPortTotalByKey(key)
    const arr = []
    
    // return row of display data
    if(row.length > 0) {
      row = values(row[0])
      for(let count = 1 ; count < row.length - 1 ; count += 1) { 
        // skip id at first index, key as last index
        if(row[count] === null) { // percent indexs are 12 or more
          arr.push('N/A')
        } else if (count > 13) {
          arr.push(`${row[count]}%`)
        } else {
          arr.push(row[count])
        }
      }
    } else {
      portTotalModel.filter(item => item !== 'date').map(item => {
        arr.push('No Data') 
        return item
      })
    }
    result.push(arr)
  }
  return result
}

const portTotalByDate = async date => {
  const result = []
  let month = 0
  let count = 0
  let lastMonthAcc = 0
  let lastNPL = 0
  let key = date.format('YYYYMM')
  let start = date.format("YYYY/MM/DD")
  let end = date.add(1, 'month').format("YYYY/MM/DD")
  // query loan, apps before selected date
  let [loans, apps, trans] = await Promise.all([
    loanByDate(startDate, start),
    appByDate(startDate, start),
    getTransactionByDate(startDate, start)
  ])
  while(month < 14) {
    // query loan, apps, trans on selected date
    let [queryLoans, queryApps, queryTrans] = await Promise.all([
      loanByDate(start, end),
      appByDate(start, end),
      getTransactionByDate(start, end)
    ])
    apps = apps.concat(queryApps)
    loans = loans.concat(queryLoans)
    trans = trans.concat(queryTrans)
    const monthlyTrans = uniqBy(queryTrans, 'loan_id')
    const totalApps = apps.length
    const loanMonth = queryLoans.length
    // Data preparetion
    const [multiLoan, calLoan, sumTrans, totalPayment] = await Promise.all([
      getMultiLoans(loans),
      calculateLoans(loans),
      calculateTrans(monthlyTrans),
      summaryPayment(trans)
    ])
    // Calculate value from transaction
    // rate variables
    let growthRate = null
    let debtRate = null
    let delinquentRate1To3 = null
    let delinquentRate1To6 = null
    let NPLRate = null
    let recovery = null
    // Percentage calculate if not divide by 0
    if(lastMonthAcc !== 0) {
      growthRate = fixedTwoDecimal((loanMonth - lastMonthAcc) / lastMonthAcc * 100)
    }
    if(calLoan[1] !== 0) {
      debtRate = fixedTwoDecimal(sumTrans[11] / calLoan[1] * 100)
    }
    if(sumTrans[11] !== 0) {
      delinquentRate1To3 = fixedTwoDecimal(sumTrans[6] / sumTrans[11] * 100)
      delinquentRate1To6 = fixedTwoDecimal(sumTrans[8] / sumTrans[11] * 100)
      NPLRate = fixedTwoDecimal(sumTrans[10] / sumTrans[11] * 100)
    }
    if(lastNPL !== 0) {
      recovery = fixedTwoDecimal((lastNPL - sumTrans[10]) / lastNPL * 100)
    }
    if(month !== 0) { // not count first month
      result.push([
        calLoan[0], totalApps, multiLoan, loanMonth, sumTrans[0],
        sumTrans[12], sumTrans[9], sumTrans[1], calLoan[1],
        reConvertDecimal(sumTrans[8]), totalPayment,
        sumTrans[11], calLoan[2],
        calLoan[3], growthRate, debtRate, sumTrans[13],
        sumTrans[14], sumTrans[15], recovery, key,
      ])
    }
    lastMonthAcc = loanMonth
    lastNPL = sumTrans[10]
    key = date.format('YYYYMM')
    start = date.format("YYYY/MM/DD")
    end = date.add(1, 'month').format("YYYY/MM/DD")
    month += 1
  }
  return result
}

export default router