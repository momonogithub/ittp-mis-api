import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate, NPL } from '../setting'
import { latestTransByDate, loanByDate, appByDate } from './query'
import { portTotalModel } from './model'
import { 
  reConvertDecimal,
  getMultiLoans,
  calculateLoans,
  calculateTrans 
} from './utilize'

const router = express.Router()

router.get("/getPortTotal/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  const result = await getPortTotal(connection, date)
  res.send(result)
})

router.get("/updatePortTotal/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(13, 'month')
  const result = await updatePortTotal(connection, date)
  res.send(result)
})

const upsertPortTotal = async (connection, row) => {
  let name = `${portTotalModel[0]}`
  let value = `${row[0]}`
  let update = `${portTotalModel[0]}=${row[0]}`
  for(let count = 1 ; count < row.length ; count ++) {
    name = name.concat(`, ${portTotalModel[count]}`)
    value = value.concat(`, ${row[count]}`)
    update = update.concat(`, ${portTotalModel[count]}=${row[count]}`)
  }
  connection.query(`INSERT INTO PortTotal (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err, result) {
    if (err) throw err;
  })
}

const getPortTotalByKey = async (connection, key) => {
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

const updatePortTotal = async (connection, date) => {
  const result = []
  const rows = await portTotalByDate(connection, date)
  await Promise.all(
    rows.map(async row => {
      await upsertPortTotal(connection, row)
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

const getPortTotal = async (connection, date) => {
  const result = []
  for(let count = 0; count < 13 ; count ++) {
    date.add(1, 'month')
    const key = date.format('YYYYMM')
    const row = await getPortTotalByKey(connection, key)
    const arr = []
    // return row of display data
    if(row.length > 0) {
      portTotalModel.filter(item => item !== 'date').map(item => {
        if(row[0][`${item}`] !== null) {
          arr.push(row[0][`${item}`]) // display data map by portTotal Model
        }else {
          arr.push('N/A') // no data display N/A
        }
        return item
      })
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

const portTotalByDate = async (connection, date) => {
  const result = []
  let month = 0
  let count = 0
  let lastMonthAcc = 0
  let lastNPL = 0
  let key = date.format('YYYYMM')
  let start = date.format("YYYY-MM-DD HH:mm:ss")
  let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
  // query loan, apps before selected date
  let [loans, apps] = await Promise.all([
    loanByDate(connection, startDate, start),
    appByDate(connection, startDate, start)
  ]) 
  while(month < 14) {
    // query loan, apps, trans on selected date
    let [queryLoans, queryApps, trans] = await Promise.all([
      loanByDate(connection, start, end),
      appByDate(connection, start, end),
      latestTransByDate(connection, start, end)
    ])
    apps = apps.concat(queryApps)
    loans = loans.concat(queryLoans)
    trans = uniqBy(trans, 'loan_id')
    const totalApps = apps.length
    const loanMonth = queryLoans.length
    // Data preparetion
    const [multiLoan, calLoan, sumTrans] = await Promise.all([
      getMultiLoans(loans),
      calculateLoans(loans),
      calculateTrans(trans)
    ]) 
    // Calculate value from transaction
    let totalPayment = 0
    // rate variables
    let growthRate = 0
    let debtRate = 0
    let delinquentRate1To3 = 0
    let delinquentRate1To6 = 0
    let NPLRate = 0
    let recovery = 0
    // Percentage calculate if not divide by 0
    if(lastMonthAcc !== 0) {
      growthRate = parseFloat(((loanMonth - lastMonthAcc) / lastMonthAcc * 100).toFixed(2))
    } else {
      growthRate = null
    } 
    if(calLoan[1] !== 0) {
      debtRate = parseFloat((sumTrans[11] / calLoan[1] * 100).toFixed(2))
    } else {
      debtRate = null
    }
    if(sumTrans[11] !== 0) {
      delinquentRate1To3 = parseFloat((sumTrans[6] / sumTrans[11] * 100).toFixed(2))
      delinquentRate1To6 = parseFloat((sumTrans[8] / sumTrans[11] * 100).toFixed(2))
      NPLRate = parseFloat((sumTrans[10] / sumTrans[11] * 100).toFixed(2))
    } else {
      delinquentRate1To3 = null
      delinquentRate1To6 = null
      NPLRate = null
    }
    if(lastNPL !== 0) {
      recovery = parseFloat(((lastNPL - sumTrans[10]) / lastNPL * 100).toFixed(2))
    } else {
      recovery = null
    }
    if(month !== 0) { // not count first month
      result.push([
        calLoan[0], totalApps, multiLoan, loanMonth, sumTrans[0],
        sumTrans[12], sumTrans[9], sumTrans[1], calLoan[1],
        reConvertDecimal(sumTrans[8]), totalPayment,
        reConvertDecimal(sumTrans[11]), calLoan[2],
        calLoan[3], growthRate, debtRate, sumTrans[13],
        sumTrans[14], sumTrans[15], recovery, key,
      ])
    }
    lastMonthAcc = loanMonth
    lastNPL = sumTrans[10]
    key = date.format('YYYYMM')
    start = date.format("YYYY-MM-DD HH:mm:ss")
    end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    month += 1
  }
  return result
}

module.exports = router