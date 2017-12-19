import express from 'express'
import { misConnection } from '../database'
import moment from 'moment'
import { startDate } from '../setting'
import { appByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'
import { channel } from '../setting'

const router = express.Router()

router.get("/:month/:year", async function(req, res) {
  try {
    const { year, month} = req.params // input param
    const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
    res.status(200).send(await getChannel(date))
  } catch(err) {
    res.status(500).send(await getChannel(date))
  }
})

router.patch("/", async function(req, res){
  if(req.body.year !== undefined || req.body.month !== undefined ) {
    try {
      const { year, month} = req.body // input param
      const date = moment(`${year}${month}`, 'YYYYM')
      await updateChannel(date.clone())
      res.status(200).send(await getChannel(date.clone().subtract(12, 'month')))
    } catch(err) {
      res.status(500).send(err)
    }
  } else {
    res.status(400).send('bad request')
  }
})

const getChannel = async date => {
  const result = {}
  for(let month = 0 ; month < 13 ; month += 1) {
    const key = date.format("YYYYMM")
    result[key] = {}
    const datas = await getChannelByKey(key)
    datas.map(data => {
      result[key][data.wayCode] = {
        Application : data.application,
        Approved : data.approved,
        Percent : data.percent,
      }
      return data
    })
    date.add(1, 'month')
  }
  return result
}

export const updateChannel = async date => {
  const result = await channelByDate(date)
  for(let ref in result) {
    for(let wayCode in result[ref]) {
      await upsertChannel(ref, wayCode, result[ref][wayCode])
    }
  }
}

const channelByDate = async date => {
  const result = {}
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
      Percent: Math.ceil(approvedChannel/appChannel * 10000)/100,
    }
    result[key] = Object.assign(result[key], { [item]: branchValue })
  }
  return result
}

const getChannelByKey = async key => {
  return new Promise(function(resolve, reject) {
    misConnection.query(
      `SELECT * FROM ${channel} WHERE ref = ?`,
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

const upsertChannel = async (ref, wayCode, data) => {
  const insertSet = {
    application : data.Application,
    approved : data.Approved,
    percent : data.Percent,
    wayCode : `${wayCode}`,
    ref : `${ref}`,
  }
  let name = ''
  let value = ''
  let update = ''
  for(let item in insertSet) {
    name = name.concat(`${item}, `)
    value = value.concat(`${misConnection.escape(insertSet[item])}, `)
    update = update.concat(`${item}=${misConnection.escape(insertSet[item])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  update = update.slice(0, update.length-2)
  misConnection.query(`INSERT INTO ${channel} (${name}) VALUES (${value}) ON DUPLICATE KEY UPDATE ${update}`,
  function (err) {
    if (err) throw err
  })
}

export default router