import express from 'express'
import connection from '../database'
import moment from 'moment'
import { startDate } from '../setting'
import { appByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'

const router = express.Router()

router.get("/:month/:year", async function(req, res){
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  const result = await getChennel(date)
  res.send(result)
})

const getChennel = async date => {
  const result = {}
  for(let month = 0 ; month < 13 ; month += 1) {
    let key = date.format("YYYYMM")
    const start = date.format("YYYY-MM-DD HH:mm:ss")
    const end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    const applications = await appByDate(start, end)
    let appGroup = 0 , approvedGroup = 0 , percentGroup = 0
    const applicationsGroup = groupBy(applications, 'wayCode')
    result[key] = {}
    for(let item in applicationsGroup){
      let appChannel = applicationsGroup[item].length
      let approvedChannel = 0 , percentChannel = 0
      applicationsGroup[item].map(app => {
        if(app.waitConfirmTimestamp !== null) {
          approvedChannel += 1
          approvedGroup += 1
        }
        return app
      })
      let branchValue = {
        Application: appChannel,
        Approved: approvedChannel,
        Percent: `${Math.ceil(approvedChannel/appChannel * 10000)/100}%`,
      }
      result[key] = Object.assign(result[key], { [item]: branchValue })
    }
  }
  return result
}

export default router