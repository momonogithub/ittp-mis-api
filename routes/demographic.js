import express from 'express'
import { misConnection } from '../database'
import moment from 'moment'
import { demographicGroup }  from './demographicGroup'
import { startDate, maxBucket } from '../setting'
import { appById, appByDate, loanByDate, transactionByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { reConvertDecimal, fixedTwoDecimal, getNumberOfDays } from './utilize'
import { demographicModel } from './model/demographic'
import { demographic } from '../setting'

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

router.get("/:month/:year", async function(req, res){
  try {
    const { year, month} = req.params // input param
    res.status(200).send(await getDemographic(year, month))
  } catch (err) {
    res.status(500).send(err)
  }
})

router.patch("/", async function(req, res){
  if(req.body.year !== undefined || req.body.month !== undefined ) {
    try {
      const { year, month} = req.body // input param
      await updateDemographic(moment(`${year}${month}`, 'YYYYM'))
      res.status(200).send(await getDemographic(year, month))
    } catch(err) {
      res.status(500).send(err)
    }
  } else {
    res.status(400).send('bad request')
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

const getDemographic = async (year, month) => {
  const result = {}
  const demoMonth = {}
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  let ref
  for(let i = 0 ; i < 13 ; i += 1) {
    ref = date.format('YYYY/MM')
    let data = await getTotalDemographic(ref)
    data = checkData(data)
    demoMonth[ref] = data
    date.add(1, 'month')
  }
  result['Month'] = demoMonth
  const demo = await getDemographicByKey(ref)
  for(let i = 0 ; i < demo.length ; i += 1) {
    if(result[demo[i].demoGroup] === undefined) {
      result[demo[i].demoGroup] = {}
      result[demo[i].demoGroup][demo[i].demoName] = checkData([demo[i]])
    }else {
      result[demo[i].demoGroup][demo[i].demoName] = checkData([demo[i]])
    }
  }
  return result
}

export const updateDemographic = async date => {
  let datas = []
  let key = date.format('YYYY/MM')
  let end = date.clone().add(1, 'month')
  let loans = await loanByDate(startDate, end.format("YYYY-MM-DD HH:mm:ss"))
  let applications = await appByDate(startDate, end.format("YYYY-MM-DD HH:mm:ss"))
  let transactions = await transactionByDate(startDate, end.format("YYYY-MM-DD HH:mm:ss"))
  loans.filter(loan => loan.app_id !== 0).map(loan => {
    const tran = transactions.filter(tran => tran.loan_id === loan.loan_id)
    const app = applications.filter(app => app.id === loan.app_id)
    delete loan.created_date
    datas.push({
      ...app[0],
      ...loan,
      transaction : tran
    })
    return loan
  })
  let dataGroup = await demographicGroup(datas, date)
  dataGroup['Total'] = { Total : datas }
  for(let demo in dataGroup) {
    for(let item  in dataGroup[demo]) {
      dataGroup[demo][item] = await calDemographic(dataGroup[demo][item], date, end)
      const sqlRow = {}
      if(demo === 'Total') {
        sqlRow[`${[demographicModel[8]]}`] = 'Total'
        sqlRow[`${[demographicModel[9]]}`] = `Total`
        sqlRow[`${[demographicModel[10]]}`] = key
      } else {
        sqlRow[`${[demographicModel[8]]}`] = demo
        sqlRow[`${[demographicModel[9]]}`]  = item
        sqlRow[`${[demographicModel[10]]}`] = key
      }
      sqlRow[`${[demographicModel[0]]}`] = dataGroup[demo][item].totalLoan
      sqlRow[`${[demographicModel[1]]}`] = dataGroup[demo][item].newAccount
      sqlRow[`${[demographicModel[2]]}`] = dataGroup[demo][item].loanSize
      sqlRow[`${[demographicModel[3]]}`] = dataGroup[demo][item].averageInt
      sqlRow[`${[demographicModel[4]]}`] = dataGroup[demo][item].averageLoanTerm
      sqlRow[`${[demographicModel[5]]}`] = dataGroup[demo][item].osb
      sqlRow[`${[demographicModel[6]]}`] = dataGroup[demo][item].delinquentRate
      sqlRow[`${[demographicModel[7]]}`] = dataGroup[demo][item].nplRate
      await upsertDemographic(sqlRow)
    }
  }
}

const calDemographic = async (datas, start, end) => {
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
        const time = moment(data.open_date)
        if(time.isBetween(start.clone().subtract(1, 'seconds'), end)) {
          newAccount += 1
        }
        if(data['transaction'].length > 0) {
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
    totalLoan: datas.length,
    newAccount : newAccount,
    loanSize: reConvertDecimal(loanSize),
    averageInt: datas.length > 0 ? 
      fixedTwoDecimal(int / datas.length) : 0,
    averageLoanTerm: installLoan > 0 ?
      fixedTwoDecimal(loanTerm / installLoan) : 0,
    osb: reConvertDecimal(osb),
    delinquentRate: datas.length > 0 ? 
      fixedTwoDecimal(delinquent / datas.length) : null,
    nplRate: datas.length > 0 ? 
      fixedTwoDecimal(npl / datas.length) : null
  }
}

const checkData = data => {
  if(data.length > 0) {
    return {
      totalLoan: data[0].totalLoan,
      newAccount: data[0].newAccount,
      loanSize: data[0].loanSize,
      averageInt: data[0].averageIntRate,
      averageLoanTerm: data[0].averageLoanTerm,
      osb: data[0].osb,
      delinquentRate: data[0].delinquentRate,
      nplRate: data[0].nplRate
    }
  } else {
    return {
      totalLoan: 'No Data',
      newAccount : 'No Data',
      loanSize: 'No Data',
      averageInt: 'No Data',
      averageLoanTerm: 'No Data',
      osb: 'No Data',
      delinquentRate: 'No Data',
      nplRate: 'No Data'
    }
  }
}

const getTotalDemographic = async key => {
  return new Promise(function(resolve, reject) {
    misConnection.query(
      `SELECT * FROM ${demographic} WHERE demoGroup = 'Total' AND ref = ?`,
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

const getDemographicByKey = async key => {
  return new Promise(function(resolve, reject) {
    misConnection.query(
      `SELECT * FROM ${demographic} WHERE ref = ?`,
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

const upsertDemographic = async data => {
  let name = ''
  let value = ''
  let update = ''
  for(let item in data) {
    name = name.concat(`${item}, `)
    value = value.concat(`${misConnection.escape(data[item])}, `)
    update = update.concat(`${item}=${misConnection.escape(data[item])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  update = update.slice(0, update.length-2)
  misConnection.query(`INSERT INTO ${demographic} (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err) {
    if (err) throw err
  })
}

export default router