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
  let totalPayment = 0
  let count = 0
  let start = date.format("YYYY-MM-DD HH:mm:ss")
  let end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
  let loans = await loanByDate(connection, startDate, end)
  while(month < 13) {
    const queryLoans = await loanByDate(connection, start, end)
    const trans = uniqBy(await latestTransByDate(connection, start, end), 'loan_id')
    if(month > 0) {
      loans = loans.concat(queryLoans)
    }
    
    // Prepare value from Loan
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
    let closed = 0
    let nonStarter = 0
    let delinquentCount = 0
    let NPLCount = 0
    let bucketSize = new Array(maxBucket).fill(0)
    let bucketCount = new Array(maxBucket).fill(0)
    
    // Prepare value from Transacrion
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
    // size x To y is loan size in bucket x to y
    // count x To y is loan in bucket x to y
    let size1To6 = 0
    let size1To3 = 0
    let NPLSize = 0
    let count1To3 = 0
    let count1To6 = 0
    let countNPL = 0
    let totalDelinquent = 0
    let countDelinquent = 0
    count = 1
    while (count <= maxBucket) {
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
    const averageSize = Number(totalSize / loanMonth).toFixed(2)
    const averageInterest = Number(interest / loanMonth).toFixed(2)
    console.log(`
    Total as ${start}
    ---Accounts---
    total accounts = ${totalLoan}
    customer with 2 account = ${multiLoan}
    new accounts = ${loanMonth}
    MTD closed account = ${closed}
    Delinquent account = ${countDelinquent}
    NPL account = ${countNPL}
    non-starter accounts = ${nonStarter}
    ---Financial---
    Total loan size = ${reConvertDecimal(totalSize)}
    total loan size in B1-B6 = ${reConvertDecimal(size1To6)}
    Delinquent amount = ${reConvertDecimal(totalDelinquent)}
    ---Average---
    Loan size = ${averageSize}
    Interest rate = ${averageInterest}
    ---Ratio---
    (Delinquent + NPL amount)/total port ENR = ${Math.ceil(totalDelinquent / totalSize * 100)}%
    Delinquent rate (B1-B6) = ${Math.ceil(size1To6 / totalDelinquent * 100)}%
    Delinquent rate (B1-B3) = ${Math.ceil(size1To3 / totalDelinquent * 100)}%
    NPL Rate (B${NPL}++) = ${Math.ceil(NPLSize / totalDelinquent * 100)}%`)
    start = date.format("YYYY-MM-DD HH:mm:ss")
    end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    month += 1
  }
  return result
}