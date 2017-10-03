import moment from 'moment'
import { uniqBy, groupBy, values } from 'lodash'
import { reConvertDecimal, commaNumber } from './utilize'
import { maxBucket, startDate, NPL } from '../setting'
import { latestTransByDate, loanByDate, appByDate } from './query'
import { portTotalModel } from './model'

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

const getMultiLoans = async loans => { // count customer with multiple loan
  let count = 0
  const groupLoans = values(groupBy(loans, 'citizen_id'))
  groupLoans.map(item => {
    if(item.length > 1 ) count += 1
    return item
  })
  return count
}

const calculateLoans = async (loans, loanMonth = 0) => {
  // variable
  const result = []
  const totalLoan = loans.length
  let totalSize = 0
  let interest = 0
  let averageSize = 0
  let averageInterest = 0
  // loop
  loans.map(loan => {
    totalSize += loan.credit_limit
    interest += loan.int_rate
    return loan
  })
  // percentage check not 0
  if(loanMonth !== 0) {
    averageSize = parseFloat(reConvertDecimal(totalSize / totalLoan))
    averageInterest = parseFloat((interest / totalLoan).toFixed(2))
  }
  // return value
  result.push( 
    totalLoan, // count Loan
    totalSize, // summary Loan's credit limit
    averageSize,  // average loan size on 1 month
    averageInterest // average interest rate on 1 month
  )
  return result
}

const summaryTrans = async trans => {
  const result = []
  let closed = 0
  let nonStarter = 0
  let bucketSize = new Array(maxBucket).fill(0)
  let bucketCount = new Array(maxBucket).fill(0)
  trans.map(tran => {
    if(tran.trc === 'PO') {
      closed += 1  
    }else if (tran.trc === 'LO' ) {
      nonStarter += 1
    }else {
      let count = 1
      while(count <= maxBucket) {
        if(tran[`b${count}`] !== 0) {
          bucketSize[count-1] += tran[`b${count}`]
        } else if (tran[`b${count}`] === 0 && count > 1) {
          bucketCount[count-2] += 1
          break
        }
        count += 1
      }
    }
  })
  result.push(
    closed,
    nonStarter,
    bucketSize,
    bucketCount,
  )
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
    const [multiLoan, calLoan, sumTran] = await Promise.all([
      getMultiLoans(loans),
      calculateLoans(loans, loanMonth),
      summaryTrans(trans)
    ]) 
    // Calculate value from transaction
    let size1To6 = 0
    let size1To3 = 0
    let NPLSize = 0
    let count1To3 = 0
    let count1To6 = 0
    let countNPL = 0
    let totalDelinquent = 0
    let countDelinquent = 0
    let totalPayment = 0
    count = 1
    while (count <= maxBucket) { // While loop summary bucket size and count
      if(count < NPL) {
        if(count < 4) {
          count1To3 += sumTran[2][count - 1]
          size1To3 += sumTran[2][count - 1]
        }
        count1To6 += sumTran[3][count - 1]
        size1To6 += sumTran[2][count - 1]
      }else {
        countNPL += sumTran[3][count - 1]
        NPLSize += sumTran[2][count - 1]
      }
      totalDelinquent += sumTran[2][count - 1]
      countDelinquent += sumTran[3][count - 1]
      count += 1
    }
    // rate variables
    let growthRate = 0
    let delinquentRate = 0
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
      delinquentRate = parseFloat((totalDelinquent / calLoan[1] * 100).toFixed(2))
    } else {
      delinquentRate = null
    }
    if(totalDelinquent !== 0) {
      delinquentRate1To3 = parseFloat((size1To6 / totalDelinquent * 100).toFixed(2))
      delinquentRate1To6 = parseFloat((size1To3 / totalDelinquent * 100).toFixed(2))
      NPLRate = parseFloat((NPLSize / totalDelinquent * 100).toFixed(2))
    } else {
      delinquentRate1To3 = null
      delinquentRate1To6 = null
      NPLRate = null
    }
    if(lastNPL !== 0) {
      recovery = parseFloat(((lastNPL - NPLSize) / lastNPL * 100).toFixed(2))
    } else {
      recovery = null
    }
    if(month !== 0) { // not count first month
      result.push([
        calLoan[0],
        totalApps,
        multiLoan,
        loanMonth,
        sumTran[0],
        countDelinquent,
        countNPL,
        sumTran[1],
        parseFloat(reConvertDecimal(calLoan[1])),
        parseFloat(reConvertDecimal(size1To6)),
        totalPayment,
        parseFloat(reConvertDecimal(totalDelinquent)),
        calLoan[2],
        calLoan[3],
        growthRate,
        delinquentRate,
        delinquentRate1To3,
        delinquentRate1To6,
        NPLRate,
        recovery,
        key,
      ])
    }
    lastMonthAcc = loanMonth
    lastNPL = NPLSize
    key = date.format('YYYYMM')
    start = date.format("YYYY-MM-DD HH:mm:ss")
    end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    month += 1
  }
  return result
}

export const updatePortTotal = async (connection, date) => {
  const result = []
  const rows = await portTotalByDate(connection, date)
  await Promise.all(
    rows.map(async row => {
      await upsertPortTotal(connection, row)
      const arr = []
      row.splice(-1,1) // delete key
      row.map(item => {
        if(item === null) {
          item = 'N/A'
        }
        arr.push(item)
        return item
      })
      result.push(arr)
      return row
    })
  )
  return result
}

export const getPortTotal = async (connection, date) => {
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

export const updatePortSummary = async (connection, date) => {
  console.log(date)
}