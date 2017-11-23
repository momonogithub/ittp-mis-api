import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate } from '../setting'
import { transactionByDate, loanByDate, appByDate } from './query'
import { queryProductName } from './product'
import { portSummaryModel } from './model/portSummary'
import { 
  reConvertDecimal,
  getMultiLoans,
  calculateLoans,
  calculateTrans,
  fixedTwoDecimal,
  summaryPayment
} from './utilize'
import { portSummary } from '../setting'

const router = express.Router()

router.get("/getPortSummary/:month/:year", async function(req, res){
  try {
    const { year, month} = req.params // input param
    const date = moment(`${year}${month}`, 'YYYYM')
    res.status(200).send(await getPortSummary(date))
  } catch (err) {
    res.status(500).send(err)
  }

})

router.get("/updatePortSummary/:month/:year", async function(req, res){
  try {
    const { year, month} = req.params // input param
    const date = moment(`${year}${month}`, 'YYYYM')
    await updatePortSummary(date.clone())
    
    res.status(200).send(await getPortSummary(date))
  } catch (err) {
    res.status(500).send(err)
  }
})

const getPortSummary = async date => {
  const result = {}
  const key = [`total${date.format('YYYYMM')}`]
  const products = await queryProductName()
  for(let item in products) {
    key.push(`${item}${date.format('YYYYMM')}`)
  }
  for(let ref = 0 ; ref < key.length ; ref += 1) {
    const month = {}
    let row = await getPortSummaryByKey(key[ref])
    if(row.length > 0) {
      row = values(row[0])
      row.splice(-1,1)
      for(let count = 1 ; count < row.length ; count += 1) { 
        // skip id at first index, key as last index
        month[`${portSummaryModel[count - 1]}`] = row[count]
      }
    } else {
      portSummaryModel.filter(item => item !== 'ref').map(item => {
        month[`${item}`] = 'No Data' 
        return item
      })
    }
    result[ref] = month
  }
  return result
}

export const updatePortSummary = async date => {
  const datas = await portSummaryByDate(date)
  for(let item in datas) {
    await upsertPortSummary(datas[item])
  }
}

const portSummaryByDate = async date => {
  const result = {}
  date.subtract(1, 'month')
  let start = date.clone()
  let startSql = start.format("YYYY-MM-DD")
  let ref = start.format('YYYYMM')
  let end = date.clone().add(1, 'month')
  let endSql = end.format("YYYY-MM-DD")
  let [loans, trans, products] = await Promise.all([
    loanByDate(startDate, startSql),
    transactionByDate(startDate, startSql),
    queryProductName()
  ])
  
  let lastNPL = new Array(Object.keys(products).length).fill(0)
  for(let i = 0 ; i < 2 ; i += 1 ) {
    // loop only 2 iterative
    let [monthlyLoans, monthlyTrans] = await Promise.all([
      loanByDate(startSql, endSql),
      transactionByDate(startSql, endSql)
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
    for(let item in products) {
      productGroup.push(item)
    }
    while(loanGroup.length < productGroup.length){
      loanGroup.push([])
    }
    monthlyTrans = uniqBy(monthlyTrans, 'loan_id')
    for(let count = 0; count < loanGroup.length ; count++) {
      let activeLoan = 0
      const loansMonth = loanGroup[count].filter(loan => {
        const time = moment(loan.open_date)
        if(time.isBetween(start.clone().subtract(1, 'seconds'), end)) {
          return true
        } else {
          return false
        }
      })
      const transGroup = []
      const allTranGroup = []
      let loanOpen = 0
      loanGroup[count].map(loan => {
        const mapTran = monthlyTrans.filter(tran => {
          if(tran.loan_id === loan.loan_id) {
            const time = moment(tran.trans_date)
            if(tran.trc === 'PO' && time.isBetween(start.clone().subtract(1, 'seconds'), end)) {
              loanOpen += 1
            }
            return true
          } else {
            return false
          }
        })
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
      const summary = `${productGroup[count]}${ref}`
      let mtdRate = null
      if (calLoans.countLoans > 0) {
        mtdRate = fixedTwoDecimal(loanOpen / calLoans.countLoans)
      }
      if(i === 1 ) {
        const recovery = lastNPL[count] > 0 ? 
        fixedTwoDecimal((lastNPL[count] - sumTrans.NPLSize) / lastNPL[count]  * 100)  : null 
        const item = [
          calLoans.countLoans, sumTrans.active, calLoans.averageSize, calLoans.averageInterest,
          calLoans.totalSize, multiLoan, totalPayment, calLoansMonth.countLoans,
          calLoansMonth.totalSize, calLoansMonth.averageSize, calLoansMonth.averageInterest, loanOpen,
          mtdRate, sumTrans.count1To6, sumTrans.countNPL, sumTrans.delinquentRate1To3, 
          sumTrans.delinquentRate1To6, sumTrans.NPLRate, recovery, summary
        ]
        result[count] = {}
        for(let j = 0 ; j < portSummaryModel.length ; j += 1) {
          result[count][portSummaryModel[j]] = item[j]
        }
      } else {
        lastNPL[count] = sumTrans[9]
      }
    }
    start = end.clone()
    ref = start.format('YYYYMM')
    end = end.add(1, 'month')
    startSql = start.format("YYYY-MM-DD")
    endSql = end.format("YYYY-MM-DD")
  }
  return result
}

const getPortSummaryByKey = async key => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM ${portSummary} WHERE ref = ?`,
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

const upsertPortSummary = async data => {
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
  connection.query(`INSERT INTO ${portSummary} (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err, result) {
    if (err) throw err;
  })
}

export default router