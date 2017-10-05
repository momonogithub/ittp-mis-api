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

router.get("/getPortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  const result = await getPortSummary(connection, date)
  res.send(result)
})

router.get("/updatePortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  const result = await updatePortSummary(connection, date)
  res.send(result)
})

const getPortSummary = async (connection, date) => {
  const result = await portSummaryByDate(connection, date)
  return result
}

const updatePortSummary = async (connection, date) => {
  const result = await portSummaryByDate(connection, date)
  return result
}

const portSummaryByDate = async (connection, date) => {
  const result = []
  const start = date.format("YYYY-MM-DD HH:mm:ss")
  const end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
  const time = moment('2017-09-01T00:00:00.000Z')
  let [loans, trans] = await Promise.all([
    loanByDate(connection, startDate, end),
    latestTransByDate(connection, startDate, end)
  ])
  loans = groupBy(loans, 'product_id')
  trans = uniqBy(trans, 'loan_id')
  const loanKey = keys(loans)
  const loanValue = values(loans)
  for(let count = 0; count < loanKey.length ; count++) {
    let activeLoan = 0
    let totalPayment = 0
    const productId = loanKey[count]
    const loansMonth = loanValue[count].filter(loan => {
      const time = moment(loan.open_date)
      if(time.isBetween(start, end)) {
        return true
      } else {
        return false
      }
    })
    const transGroup = []
    loanValue[count].map(loan => {
      const mapTran = trans.filter(tran => tran.loan_id === loan.loan_id)
      transGroup.push(mapTran[0])
      return loan
    })
    const [calLoans, multiLoan, calLoansMonth, sumTrans] = await Promise.all([
      calculateLoans(loanValue[count]),
      getMultiLoans(loans),
      calculateLoans(loansMonth),
      calculateTrans(transGroup)
    ])
    let recovery = 0
    const summary = `${loanKey[count]}${date.format('YYYYMM')}`
    result.push([
      calLoans[0], sumTrans[4], calLoans[2], calLoans[3],
      calLoans[1], multiLoan, totalPayment, calLoansMonth[0],
      calLoansMonth[1], calLoansMonth[2], calLoansMonth[3], sumTrans[0],
      parseFloat((sumTrans[0] / calLoans[0]).toFixed(2)), sumTrans[7],
      sumTrans[9], sumTrans[13], sumTrans[14], sumTrans[15], recovery, summary
    ])
  }
  return result
}

module.exports = router