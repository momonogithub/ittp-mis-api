import express from 'express'
import connection from '../database'
import moment from 'moment'
import { demographicGroup }  from './demographicGroup'
import { startDate, maxBucket } from '../setting'
import { appByDate, loanById, transactionByLoan } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { reConvertDecimal, fixedTwoDecimal } from './utilize'

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
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  const start = date.format("YYYY-MM-DD HH:mm:ss")
  const end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
  const applicationsAll = await appByDate(startDate, start)
  try {
    const applicationGroup = await demographicGroup(applicationsAll, date)
    for(let demo in applicationGroup) {
      for(let group  in applicationGroup[demo]) {
        applicationGroup[demo][group] = 
          await getDemographicByApp(applicationGroup[demo][group], start, end)
      }
    }
    res.status(200).send(applicationGroup)
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

const getDemographicByApp = async (applications, start, end) => {
  let loanSize = 0
  let int = 0
  let newAccount = 0
  let installLoan = 0
  let loanTerm = 0
  let osb = 0
  let delinquent = 0
  let npl = 0
  await Promise.all(
    applications.map(async app => {
      let [loan, trans] = await Promise.all(
        loanById(app.loan_id),
        transactionByLoan(app.loan_id)
      ) 
      loan = values(loan[0])
      loanSize += loan.credit_limit
      if(loan.installment_term !== 0) {
        loanTerm += loan.installment_term
        installLoan += 1
      }
      const time = moment(trans[0].trans_date)
      if(time.isBetween(start, end)) {
        newAccount += 1
      }
      const latestTran = trans[trans.length - 1]
      const duration = getNumberOfDays(latestTran.trans_date, end.toDate())
      const newInterest = loan.daily_int * duration
      osb += latestTran.cf_principal + latestTran.cf_interest + latestTran.cf_fee + newInterest
      if(latestTran[`b1`] !== 0 ) {
        delinquent += 1
      }
      if(latestTran[`b${maxBucket - 1}`] !== 0) {
        npl += 1
      }
      return app
    })
  )
  return {
    newAccount : newAccount,
    loanSize: reConvertDecimal(loanSize),
    averageInt: applications.length > 0 ? 
      fixedTwoDecimal(int / applications.length) : 'N/A',
    averageLoanTerm: installLoan > 0 ?
      fixedTwoDecimal(loanTerm / installLoan) : 'N/A',
    osb: reConvertDecimal(osb),
    delinquentRate: applications.length > 0 ? 
      fixedTwoDecimal(delinquent / applications.length) : 'N/A',
    nplRate: applications.length > 0 ? 
      fixedTwoDecimal(npl / applications.length) : 'N/A'
  }
}

export default router