import express from 'express'
import connection from '../database'
import moment from 'moment'
import { demographicGroup }  from './demographicGroup'
import { startDate, maxBucket } from '../setting'
import { appById, appByDate, loanByDate, transactionByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { reConvertDecimal, fixedTwoDecimal, getNumberOfDays } from './utilize'

const router = express.Router()

const demoList = [
  'Total',
  'Month',
  'Gender',
  'LoanSize',
  'Income',
  'Age',
  'Region',
  'Marital',
  'Channel',
  'Education',
  'Business',
  'Job',
  'Employment',
]

router.get("/getDemographic/:month/:year", async function(req, res){
  try {
    console.time('demographic')
    let datas = []
    const { year, month} = req.params // input param
    const demoMonth = {}
    const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
    let start = date.format("YYYY-MM-DD HH:mm:ss")
    let key = date.format('YYYY/MM')
    let end = date.add(1, 'month')
    console.time('combine data')
    for(let i = 0 ; i < 13 ; i += 1) {
      const monthlyDatas = []
      const endSql = end.format("YYYY-MM-DD HH:mm:ss")
      let loans, applications, transactions
      if(i === 0) {
        loans = await loanByDate(startDate, endSql)
        applications = await appByDate(startDate, endSql)
        transactions = await transactionByDate(startDate, endSql)
      } else {
        loans = await loanByDate(start, endSql)
        applications = await appByDate(start, endSql)
        transactions = await transactionByDate(start, endSql)
      }
      loans.filter(loan => loan.app_id !== 0).map(loan => {
        const tran = transactions.filter(tran => tran.loan_id === loan.loan_id)
        const app = applications.filter(app => app.id === loan.app_id)
        delete loan.created_date
        monthlyDatas.push({
          ...app[0],
          ...loan,
          transaction : tran
        })
        return loan
      })
      datas = datas.concat(monthlyDatas)
      demoMonth[key] = datas
      start = date.format("YYYY-MM-DD HH:mm:ss")
      key = date.format('YYYY/MM')
      end = date.add(1, 'month')
    }
    
    console.timeEnd('combine data')
    console.time('demo')
    let dataGroup = await demographicGroup(datas, date)
    dataGroup.Total = { Total : datas }
    dataGroup.Month = demoMonth
    for(let demo in dataGroup) {
      for(let group  in dataGroup[demo]) {
        dataGroup[demo][group] = 
          await getDemographic(dataGroup[demo][group], start, end)
      }
    }
    console.timeEnd('demo')
    console.timeEnd('demographic')
    res.status(200).send(dataGroup)
  } catch(err) {
    console.log(err)
    res.status(500).send(err)
  }
})

router.get("/getDemoList", async function(req, res){
  try{
    const nameList = {}
    demoList.map(demo => {
      nameList[`${demo}`] = {
        status: false
      }
      return demo
    })
    res.status(200).send(nameList)
  } catch(err) {
    res.status(500).send(err)
  }
})

const getDemographic = async (datas, start, end) => {
  let loanSize = 0
  let int = 0
  let newAccount = 0
  let installLoan = 0
  let loanTerm = 0
  let osb = 0
  let delinquent = 0
  let npl = 0
  if(datas.length > 0) {
    await Promise.all(
      datas.map(async data => {
        loanSize += data.credit_limit
        int += data.int_rate
        if(data.installment_term !== 0) {
          loanTerm += data.installment_term
          installLoan += 1
        }
        if(data['transaction'].length > 0) {
          const time = moment(data['transaction'][data['transaction'].length - 1].trans_date)
          if(time.isBetween(start, end)) {
            newAccount += 1
          }
          const latestTran = data['transaction'][0]
          const duration = getNumberOfDays(latestTran.trans_date, end.toDate())
          const newInterest = data.daily_int * duration
          osb += latestTran.cf_principal 
              + latestTran.cf_interest 
              + latestTran.cf_fee 
              + newInterest
          if(latestTran[`b1`] !== 0 ) {
            delinquent += 1
          }
          if(latestTran[`b${maxBucket - 1}`] !== 0) {
            npl += 1
          }
        }
        return data
      })
    ) 
  }
  return {
    newAccount : newAccount,
    loanSize: reConvertDecimal(loanSize),
    averageInt: datas.length > 0 ? 
      fixedTwoDecimal(int / datas.length) : 'N/A',
    averageLoanTerm: installLoan > 0 ?
      fixedTwoDecimal(loanTerm / installLoan) : 'N/A',
    osb: reConvertDecimal(osb),
    delinquentRate: datas.length > 0 ? 
      `${fixedTwoDecimal(delinquent / datas.length)}%` : 'N/A',
    nplRate: datas.length > 0 ? 
      `${fixedTwoDecimal(npl / datas.length)}%` : 'N/A'
  }
}

export default router