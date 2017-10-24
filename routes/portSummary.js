import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate } from '../setting'
import { getTransactionByDate, loanByDate, appByDate } from './query'
import { queryProductName } from './product'
import { portTotalModel } from './model/portTotal'
import { 
  reConvertDecimal,
  getMultiLoans,
  calculateLoans,
  calculateTrans,
  fixedTwoDecimal,
  summaryPayment
} from './utilize'

const router = express.Router()

router.get("/getPortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(1, 'month')
  const result = await getPortSummary(date)
  res.send(result)
})

router.get("/updatePortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  const result = await updatePortSummary(date)
  res.send(result)
})

const getPortSummary = async date => {
  const result = await portSummaryByDate(date)
  return result
}

// const updatePortSummary = async date => {
//   const result = await portSummaryByDate(date)
//   return result
// }

const portSummaryByDate = async date => {
  const result = []
  let start = date.format("YYYY-MM-DD")
  let end = date.add(1, 'month').format("YYYY-MM-DD")
  let [loans, trans, products] = await Promise.all([
    loanByDate(startDate, start),
    getTransactionByDate(startDate, start),
    queryProductName()
  ])
  let lastNPL = new Array(products.length).fill(0)
  for(let i = 0 ; i < 2 ; i += 1 ) {
    // loop only 2 iterative
    let [monthlyLoans, monthlyTrans] = await Promise.all([
      loanByDate(start, end),
      getTransactionByDate(start, end)
    ])
    loans = loans.concat(monthlyLoans)
    trans = trans.concat(monthlyTrans)
    const loanGroup = [loans]
    const productGroup = ['total']
    const loansByProduct = values(groupBy(loans, 'product_id'))
    loansByProduct.map(group => {
      loanGroup.push(group)
      return group
    })
    products.map(product => {
      productGroup.push(product.id)
    })
    while(loanGroup.length < productGroup.length){
      loanGroup.push([])
    }
    monthlyTrans = uniqBy(monthlyTrans, 'loan_id')
    for(let count = 0; count < loanGroup.length ; count++) {
      let activeLoan = 0
      const loansMonth = loanGroup[count].filter(loan => {
        const time = moment(loan.open_date)
        if(time.isBetween(start, end)) {
          return true
        } else {
          return false
        }
      })
      const transGroup = []
      const allTranGroup = []
      loanGroup[count].map(loan => {
        const mapTran = monthlyTrans.filter(tran => tran.loan_id === loan.loan_id)
        const mapAllTran = trans.filter(tran => tran.loan_id === loan.loan_id)
        if(mapTran.length > 0) {
          transGroup.push(mapTran[0])
        }
        mapAllTran.map(tran => {
          allTranGroup.push(tran)
          return tran
        })
        return loan
      })
      const [calLoans, multiLoan, calLoansMonth, sumTrans, totalPayment] = await Promise.all([
        calculateLoans(loanGroup[count]),
        getMultiLoans(loanGroup[count]),
        calculateLoans(loansMonth),
        calculateTrans(transGroup),
        summaryPayment(allTranGroup)
      ])
      const summary = `${productGroup[count]}${date.format('YYYYMM')}`
      let mtdRate = null
      if (calLoans[0] > 0) {
        mtdRate = fixedTwoDecimal(sumTrans[0] / calLoans[0])
      }
      if(i === 1 ) {
        let recovery = null
        if( lastNPL[count] > 0) {
          recovery = fixedTwoDecimal((lastNPL[count] - sumTrans[10]) / lastNPL[count]  * 100)
        }
        result.push([
          calLoans[0], sumTrans[4], calLoans[2], calLoans[3],
          calLoans[1], multiLoan, totalPayment, calLoansMonth[0],
          calLoansMonth[1], calLoansMonth[2], calLoansMonth[3], sumTrans[0],
          mtdRate, sumTrans[7], sumTrans[9], sumTrans[13], 
          sumTrans[14], sumTrans[15], recovery, summary
        ])
      } else {
        lastNPL[count] = sumTrans[10]
      }
    }
    start = date.format("YYYY-MM-DD")
    end = date.add(1, 'month').format("YYYY-MM-DD")
  }
  return result
}

export default router