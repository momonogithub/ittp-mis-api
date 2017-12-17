import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate } from '../setting'
import { portTotalModel } from './model/portTotal'
import { 
  transactionByDate,
  loanByDate,
  appByDate,
  countLoanCloseByDate } from './query'
import { 
  reConvertDecimal,
  getMultiLoans,
  calculateLoans,
  calculateTrans,
  fixedTwoDecimal,
  summaryPayment } from './utilize'
import { portTotal } from '../setting'

const router = express.Router()

router.get("/:month/:year", async function(req, res){
  try {
    const { year, month} = req.params // input param
    const date = moment(`${year}${month}`, 'YYYYM')
    res.status(200).send(await getPortTotal(date))
  } catch(err) {
    res.status(500).send(err)
  }
})

router.patch("/", async function(req, res){
  if(req.body.year !== undefined || req.body.month !== undefined ) {
    try {
      const { year, month} = req.body // input param
      const date = moment(`${year}${month}`, 'YYYYM')
      await updatePortTotal(date.clone())
      res.status(200).send(await getPortTotal(date))
    } catch (err) {
      res.status(500).send(err)
    }
  } else {
    res.status(400).send('bad request')
  }
})

export const updatePortTotal = async date => {
  await upsertPortTotal(await portTotalByDate(date))
}

const getPortTotal = async date => {
  const queryDate = date.subtract(13, 'month')
  const result = {}
  for(let count = 0; count < 13 ; count ++) {
    queryDate.add(1, 'month')
    const key = queryDate.format('YYYYMM')
    let row = await getPortTotalByKey(key)
    const month = {}
    // return row of display data
    if(row.length > 0) {
      row = values(row[0])
      row.splice(-1,1)
      for(let count = 1 ; count < row.length ; count += 1) { 
        // skip id at first index, key as last index
        month[`${portTotalModel[count - 1]}`] = row[count]
      }
    } else {
      portTotalModel.filter(item => item !== 'ref').map(item => {
        month[`${item}`] = 'No Data' 
        return item
      })
    }
    result[key] = month
  }
  return result
}

const portTotalByDate = async date => {
  let result = {}
  date.subtract(1, 'month')
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
    transactionByDate(startDate, start),
  ])
  while(month < 2) {
    // query loan, apps, trans on selected date
    let [queryLoans, queryApps, queryTrans, loanClose] = await Promise.all([
      loanByDate(start, end),
      appByDate(start, end),
      transactionByDate(start, end),
      countLoanCloseByDate(start, end)
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
    if(calLoan.totalSize !== 0) {
      debtRate = fixedTwoDecimal(sumTrans.totalDelinquent / calLoan.totalSize * 100)
    }
    if(sumTrans.totalDelinquent !== 0) {
      delinquentRate1To3 = fixedTwoDecimal(sumTrans.size1To3 / sumTrans.totalDelinquent * 100)
      delinquentRate1To6 = fixedTwoDecimal(sumTrans.size1To6 / sumTrans.totalDelinquent * 100)
      NPLRate = fixedTwoDecimal(sumTrans.NPLSize / sumTrans.totalDelinquent * 100)
    }
    if(lastNPL !== 0) {
      recovery = fixedTwoDecimal((lastNPL - sumTrans.NPLSize) / lastNPL * 100)
    }
    if(month !== 0) { // not count first month
      const item = [
        calLoan.countLoans, totalApps, multiLoan, loanMonth, loanClose,
        sumTrans.countDelinquent, sumTrans.countNPL, sumTrans.nonStarter,
        calLoan.totalSize, reConvertDecimal(sumTrans.size1To6), totalPayment,
        sumTrans.totalDelinquent, calLoan.averageSize, calLoan.averageInterest,
        growthRate, debtRate, sumTrans.delinquentRate1To3, 
        sumTrans.delinquentRate1To6, sumTrans.NPLRate, recovery, key
      ]
      for(let i = 0 ; i < portTotalModel.length ; i+= 1) {
        result[portTotalModel[i]] = item[i]
      }
    }
    lastMonthAcc = loanMonth
    lastNPL = sumTrans.NPLSize
    key = date.format('YYYYMM')
    start = date.format("YYYY/MM/DD")
    end = date.add(1, 'month').format("YYYY/MM/DD")
    month += 1
  }
  return result
}

const getPortTotalByKey = async key => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM ${portTotal} WHERE ref = ?`,
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

const upsertPortTotal = async data => {
  let name = ''
  let value = ''
  let update = ''
  for(let item in data) {
    name = name.concat(`${item}, `)
    value = value.concat(`${connection.escape(data[item])}, `)
    update = update.concat(`${item}=${connection.escape(data[item])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  update = update.slice(0, update.length-2)
  connection.query(`INSERT INTO ${portTotal} (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err) {
    if (err) throw err
  })
}

export default router