import express from 'express'
import connection from '../database'
import moment from 'moment'
import { startDate } from '../setting'
import { appByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'

const router = express.Router()

router.get("/getDemographic/:month/:year", async function(req, res){
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM')
  try {
    const [month13] = await Promise.all([
      demographicMonth(date)
    ])
    const result = {
      month13 : month13,
      gender : 0,
      loanSize : 0,
      income : 0,
      age: 0,
      region: 0,
      marital: 0,
      channel: 0,
      education: 0,
      business: 0,
      job: 0,
      employment: 0
    }
    res.status(200).send(result)
  } catch(err) {
    res.status(500).send(err)
  }
})

const demographicMonth = async date => {
  const applications = 0
  return getDemographicByApp(applications)
}

const getDemographicByApp = async applications => {
  return {
    newAccount : 0,
    loanSize: 0,
    averageInt: 0,
    averageLoanTerm: 0,
    osb: 0,
    delinquentRate: 0,
    nplRate: 0
  }
}

export default router