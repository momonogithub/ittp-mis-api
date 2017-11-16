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
    const date = moment(`${year}${month}`, 'YYYYM').subtract(1, 'month')
    await updatePortSummary(date)
    console.log('update complete')
    res.status(200).send(await getPortSummary(date.subtract(2, 'month')))
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
        if(row[count] === null) { // percent indexs are 12 or more
          month[`${portSummaryModel[count - 1]}`] ='N/A'
        } else if (count > 15) {
          month[`${portSummaryModel[count - 1]}`] = `${row[count]}%`
        } else {
          month[`${portSummaryModel[count - 1]}`] = row[count]
        }
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

const updatePortSummary = async date => {
  const portSummary = await portSummaryByDate(date)
  await Promise.all(
    portSummary.map(async row => {
      await upsertPortSummary(row)
      return row
    })
  )
}

const portSummaryByDate = async date => {
  const result = []
  let start = date.format("YYYY-MM-DD")
  let ref = date.format('YYYYMM')
  let end = date.add(1, 'month').format("YYYY-MM-DD")
  let [loans, trans, products] = await Promise.all([
    loanByDate(startDate, start),
    transactionByDate(startDate, start),
    queryProductName()
  ])
  let lastNPL = new Array(Object.keys(products).length).fill(0)
  for(let i = 0 ; i < 2 ; i += 1 ) {
    // loop only 2 iterative
    let [monthlyLoans, monthlyTrans] = await Promise.all([
      loanByDate(start, end),
      transactionByDate(start, end)
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
        if(time.isBetween(start, end)) {
          return true
        } else {
          return false
        }
      })
      const transGroup = []
      const allTranGroup = []
      let loanOpen = 0
      loanGroup[count].map(loan => {
        const mapTran = monthlyTrans.filter(tran => tran.loan_id === loan.loan_id)
        const mapAllTran = trans.filter(tran => {
          if(tran.loan_id === loan.loan_id) {
            const time = moment(tran.trans_date)
            if(tran.trc === 'LO' && time.isBetween(start, end)) {
              loanOpen += 1
            }
            return true
          } else {
            return false
          }
        })
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
        mtdRate = fixedTwoDecimal(loanOpen / calLoans[0])
      }
      if(i === 1 ) {
        let recovery = null
        if( lastNPL[count] > 0) {
          recovery = fixedTwoDecimal((lastNPL[count] - sumTrans[9]) / lastNPL[count]  * 100)
        }
        result.push([
          calLoans[0], sumTrans[3], calLoans[2], calLoans[3],
          calLoans[1], multiLoan, totalPayment, calLoansMonth[0],
          calLoansMonth[1], calLoansMonth[2], calLoansMonth[3], loanOpen,
          mtdRate, sumTrans[6], sumTrans[8], sumTrans[12], 
          sumTrans[13], sumTrans[14], recovery, summary
        ])
      } else {
        lastNPL[count] = sumTrans[9]
      }
    }
    start = date.format("YYYY-MM-DD")
    ref = date.format('YYYYMM')
    end = date.add(1, 'month').format("YYYY-MM-DD")
  }
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