import moment from 'moment'
import { uniqBy, groupBy, values } from 'lodash'
import { reConvertDecimal, commaNumber } from './utilize'
import { maxBucket, startDate, NPL } from '../setting'
import { latestTransByDate, loanByDate } from './query'

const getMultiLoans = async loans => {
  let count = 0
  const groupLoans = values(groupBy(loans, 'citizen_id'))
  groupLoans.map(item => {
    if(item.length > 1 ) count += 1
    return item
  })
  return count
}

export const portTotal = async (connection, date) => {
  const result = []
  let month = 0
  let count = 0
  let start = date.format("YYYY-MM-DD HH:mm:ss")
  let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
  let loans = await loanByDate(connection, startDate, start)
  let apps = 0
  let lastMonthAcc = 0
  let lastNPL = 0
  while(month < 14) {
    // query from database
    const queryLoans = await loanByDate(connection, start, end)
    const trans = uniqBy(await latestTransByDate(connection, start, end), 'loan_id')
    loans = loans.concat(queryLoans)
    // Loan prepare value
    const loanMonth = queryLoans.length
    const totalLoan = loans.length
    let totalSize = 0
    let interest = 0
    const multiLoan = await getMultiLoans(loans)
    loans.map(loan => {
      totalSize += loan.credit_limit
      interest += loan.int_rate
      return loan
    })
    // Transaction prepare value
    let closed = 0
    let nonStarter = 0
    let delinquentCount = 0
    let NPLCount = 0
    let bucketSize = new Array(maxBucket).fill(0)
    let bucketCount = new Array(maxBucket).fill(0)
    trans.map(tran => {
      if(tran.trc === 'PO') {
        closed += 1  
      }else if (tran.trc === 'LO' ) {
        nonStarter += 1
      }else {
        count = 1
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
          count1To3 += bucketCount[count - 1]
          size1To3 += bucketSize[count - 1]
        }
        count1To6 += bucketCount[count - 1]
        size1To6 += bucketSize[count - 1]
      }else {
        countNPL += bucketCount[count - 1]
        NPLSize += bucketSize[count - 1]
      }
      totalDelinquent += bucketSize[count - 1]
      countDelinquent += bucketCount[count - 1]
      count += 1
    }
    // rate variables
    let averageSize = 0
    let averageInterest = 0
    let growthRate = 0
    let delinquentRate = 0
    let delinquentRate1To3 = 0
    let delinquentRate1To6 = 0
    let NPLRate = 0
    let recovery = 0
    // Percentage calculate if not divide by 0
    if(loanMonth !== 0) {
      averageSize = reConvertDecimal(totalSize / loanMonth)
      averageInterest = Number(interest / loanMonth).toFixed(2)
    }
    if(lastMonthAcc !== 0) {
      growthRate = Math.ceil((loanMonth - lastMonthAcc) / lastMonthAcc * 100) 
    }
    if(totalSize !== 0) {
      delinquentRate = Math.ceil(totalDelinquent / totalSize * 100)
    }
    if(totalDelinquent !== 0) {
      delinquentRate1To3 = Math.ceil(size1To6 / totalDelinquent * 100)
      delinquentRate1To6 = Math.ceil(size1To3 / totalDelinquent * 100)
      NPLRate = Math.ceil(NPLSize / totalDelinquent * 100)
    }
    if(lastNPL !== 0) {
      recovery = Math.ceil((lastNPL - NPLSize) / lastNPL * 100)
    }
    if(month !== 0) { // not count first month
      result.push([
        commaNumber(totalLoan),
        commaNumber(apps),
        commaNumber(multiLoan),
        commaNumber(loanMonth),
        commaNumber(closed),
        commaNumber(countDelinquent),
        commaNumber(countNPL),
        commaNumber(nonStarter),
        commaNumber(reConvertDecimal(totalSize)),
        commaNumber(reConvertDecimal(size1To6)),
        commaNumber(totalPayment),
        commaNumber(reConvertDecimal(totalDelinquent)),
        commaNumber(averageSize),
        averageInterest,
        `${growthRate}%`,
        `${delinquentRate}%`,
        `${delinquentRate1To3}%`,
        `${delinquentRate1To6}%`,
        `${NPLRate}%`,
        `${recovery}%`,
      ])
    }
    lastMonthAcc = loanMonth
    lastNPL = NPLSize
    start = date.format("YYYY-MM-DD HH:mm:ss")
    end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    month += 1
  }
  return result
}