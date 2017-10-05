import { uniqBy, groupBy, values, keys } from 'lodash'
import { maxBucket, startDate, NPL } from '../setting'

export const reConvertDecimal = data => parseFloat(Number((Math.ceil(data / 100)) / 100).toFixed(2))

export const getMultiLoans = async loans => { // count customer with multiple loan
  let count = 0
  const groupLoans = values(groupBy(loans, 'citizen_id'))
  groupLoans.map(item => {
    if(item.length > 1 ) count += 1
    return item
  })
  return count
}

export const calculateLoans = async (loans) => {
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
  if(totalLoan !== 0) {
    averageSize = parseFloat(reConvertDecimal(totalSize / totalLoan))
    averageInterest = parseFloat((interest / totalLoan).toFixed(2))
  }
  // return value
  result.push( 
    totalLoan, parseFloat(reConvertDecimal(totalSize)), 
    averageSize, averageInterest
  )
  return result
}

export const calculateTrans = async trans => {
  const result = []
  let closed = 0
  let nonStarter = 0
  let active = 0
  let bucketSize = new Array(maxBucket).fill(0)
  let bucketCount = new Array(maxBucket).fill(0)
  let count
  trans.map(tran => {
    if(tran.trc === 'PO') {
      closed += 1  
    }else if (tran.trc === 'LO' ) {
      active += 1
      nonStarter += 1
    }else {
      count = 1
      active += 1
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

  let size1To6 = 0
  let size1To3 = 0
  let NPLSize = 0
  let count1To3 = 0
  let count1To6 = 0
  let countNPL = 0
  let totalDelinquent = 0
  let countDelinquent = 0
  count = 1
  while (count <= maxBucket) { // While loop summary bucket size and count
    if(count < NPL) {
      if(count < 4) {
        count1To3 += bucketSize[count - 1]
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

  let delinquentRate1To3 = 0
  let delinquentRate1To6 = 0
  let NPLRate = 0
  if(totalDelinquent !== 0) {
    delinquentRate1To3 = parseFloat((size1To3 / totalDelinquent * 100).toFixed(2))
    delinquentRate1To6 = parseFloat((size1To6 / totalDelinquent * 100).toFixed(2))
    NPLRate = parseFloat((NPLSize / totalDelinquent * 100).toFixed(2))
  } else {
    delinquentRate1To3 = null
    delinquentRate1To6 = null
    NPLRate = null
  }

  result.push(
    closed, nonStarter, bucketSize, bucketCount, active, count1To3, size1To3,
    count1To6, size1To6, countNPL, NPLSize, parseFloat(reConvertDecimal(totalDelinquent)),
    countDelinquent, delinquentRate1To3, delinquentRate1To6, NPLRate,
  )
  return result
}