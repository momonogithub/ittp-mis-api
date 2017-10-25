import express from 'express'
import connection from '../database'
import moment from 'moment'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { startDate } from '../setting'
import { getTransactionByDate, loanByDate, appByDate } from './query'
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

const router = express.Router()

router.get("/getPortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  const result = await getPortSummary(date)
  res.send(result)
})

router.get("/updatePortSummary/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(1, 'month')
  const result = await updatePortSummary(date)
  res.send(result)
})

const getPortSummary = async date => {
  const result = []
  const key = [`total${date.format('YYYYMM')}`]
  const products = await queryProductName()
  products.map(product => {
    key.push(`${product.id}${date.format('YYYYMM')}`)
    return product
  })
  for(let ref = 0 ; ref < key.length ; ref += 1) {
    const arr = []
    let row = await getPortSummaryByKey(key[ref])
    if(row.length > 0) {
      row = values(row[0])
      for(let count = 1 ; count < row.length - 1 ; count += 1) { 
        // skip id at first index, key as last index
        if(row[count] === null) { // percent indexs are 16 or more
          arr.push('N/A')
        } else if (count > 15) {
          arr.push(`${row[count]}%`)
        }
        else {
          arr.push(row[count])
        }
      }
    } else {
      portSummaryModel.filter(item => item !== 'ref').map(item => {
        arr.push('No Data') 
        return item
      })
    }
    result.push(arr)
  }
  return result
}

const updatePortSummary = async date => {
  const result = []
  const portSummary = await portSummaryByDate(date)
  await Promise.all(
    portSummary.map(async row => {
      await upsertPortSummary(row)
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

const portSummaryByDate = async date => {
  const result = []
  let start = date.format("YYYY-MM-DD")
  let ref = date.format('YYYYMM')
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
      const summary = `${productGroup[count]}${ref}`
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
    ref = date.format('YYYYMM')
    end = date.add(1, 'month').format("YYYY-MM-DD")
  }
  console.log('finish')
  return result
}

const getPortSummaryByKey = async key => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM PortSummary WHERE ref = ?`,
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

const upsertPortSummary = async row => {
  let name = ''
  let value = ''
  let update = ''
  for(let count = 0 ; count < row.length ; count ++) {
    name = name.concat(`${portSummaryModel[count]}, `)
    value = value.concat(`${connection.escape(row[count])}, `)
    update = update.concat(`${portSummaryModel[count]}=${connection.escape(row[count])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  update = update.slice(0, update.length-2)
  connection.query(`INSERT INTO PortSummary (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err, result) {
    if (err) throw err;
  })
}

export default router